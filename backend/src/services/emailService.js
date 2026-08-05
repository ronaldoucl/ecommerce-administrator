import nodemailer from 'nodemailer';

import { config } from '../config/env.js';
import { getSettings } from './settings.service.js';

/**
 * Email service — notifies a customer when their order changes status.
 *
 * Sending is gated by the `StoreSettings.emailEnabled` switch, which the admin
 * toggles from the dashboard (Settings). With it off nothing is sent, nothing
 * sensitive is logged, and the caller is told the email was skipped.
 *
 * The split is deliberate: the switch is store configuration an admin changes at
 * will, while the provider credentials are secrets and stay in the environment.
 *
 * TWO TRANSPORTS, chosen by what the environment provides:
 *
 *   1. Brevo HTTP API (preferred) — plain HTTPS, so it works on hosts that block
 *      outbound SMTP. Render's free plan blocks ports 25/465/587, which makes
 *      SMTP unusable there; HTTPS is unaffected. Needs BREVO_API_KEY and a
 *      verified MAIL_FROM_EMAIL. Uses `fetch`, so it adds no dependency.
 *   2. SMTP via nodemailer (fallback) — used when no API key is configured.
 *      Convenient for local development, where the ports are open.
 *
 * CONTRACT FOR CALLERS: this module NEVER throws. Sending an email must never
 * be able to roll back or fail an order status change, so every failure is
 * returned as `{ sent: false, error }` instead.
 */

/** Subject/body copy per status, kept in one place. */
const STATUS_COPY = {
  pending: 'We have received your order',
  confirmed: 'Your order has been confirmed',
  preparing: 'Your order is being prepared',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
};

/**
 * Build the message for an order status change. Exported so the real sender and
 * any future preview/testing tooling share exactly the same copy.
 *
 * @param {{ reference: string, customerName: string, customerEmail: string }} order
 * @param {string} newStatus - the status the order has just moved to
 * @returns {{ to: string, subject: string, text: string }}
 */
export function buildOrderStatusMessage(order, newStatus) {
  const headline = STATUS_COPY[newStatus] ?? `Your order status is now ${newStatus}`;

  const lines = [
    `Hi ${order.customerName},`,
    '',
    `${headline}.`,
    `Order reference: ${order.reference}`,
  ];

  if (newStatus === 'cancelled') {
    lines.push('', 'The items in this order have been returned to our stock.');
  }

  lines.push('', 'Thank you for shopping with us.');

  return {
    to: order.customerEmail,
    subject: `${headline} — ${order.reference}`,
    text: lines.join('\n'),
  };
}

/**
 * The store always sends through Gmail, so the transport endpoint is a constant
 * rather than configuration. Port 465 is implicit TLS, hence `secure: true`.
 */
const GMAIL_SMTP = { host: 'smtp.gmail.com', port: 465, secure: true };

/**
 * How long each stage of the SMTP conversation may take.
 *
 * These MATTER: the admin's status-change request waits for the send, so
 * nodemailer's defaults (minutes) would leave the dashboard stuck on "Working…"
 * while a flaky connection hangs. Ten seconds is generous for a healthy Gmail
 * connection (a real one completes in well under a second) and fails fast
 * otherwise.
 */
const SMTP_TIMEOUTS = {
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
};

/**
 * Absolute ceiling for one notification attempt, covering everything the
 * transport might do (DNS, TLS, auth, send). It is the last line of defence for
 * the API's response time: whatever happens to the mail server, the status
 * change is already committed and the client hears back promptly.
 */
const SEND_DEADLINE_MS = 12000;

/**
 * The transport is created once and reused, so a burst of status changes does
 * not rebuild it each time. It is created lazily: a store with notifications
 * switched off never builds one at all. The transport is not pooled, so every
 * send opens its own connection and a previous failure cannot poison the next.
 */
let transport = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      ...GMAIL_SMTP,
      ...SMTP_TIMEOUTS,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transport;
}

/** Transport failures worth a second attempt: transient network conditions. */
const TRANSIENT_CODES = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS', 'ECONNRESET'];

/** Reject if `promise` has not settled within `ms`. */
function withDeadline(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('the email provider did not respond in time');
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Turn a transport failure into something an admin can act on. Nodemailer's own
 * wording ("Connection timeout") says nothing about what to do next.
 */
function describeSendFailure(err) {
  const code = err?.code;

  if (code === 'EAUTH') {
    return config.email.httpConfigured
      ? 'the email provider rejected the API key — check BREVO_API_KEY.'
      : 'the mailbox rejected the credentials — check SMTP_USER and that SMTP_PASS is a current Google app password.';
  }
  if (code === 'EPROVIDER') {
    // Brevo's own wording is specific and actionable (unverified sender, quota,
    // malformed recipient), so it is passed through rather than flattened.
    return err.message;
  }
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return 'the email provider did not respond in time. The order status was still updated — you can retry the notification by changing the status again.';
  }
  // fetch reports every network-level failure as `TypeError: fetch failed`, with
  // the real reason buried in `cause`. That is useless to an admin on its own.
  if (err?.name === 'TypeError' && err?.cause) {
    return 'the email provider could not be reached (network or DNS). The order status was still updated — you can retry the notification by changing the status again.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS') {
    return 'the mail server could not be reached (network or firewall). The order status was still updated — you can retry the notification by changing the status again.';
  }
  if (code === 'EENVELOPE') {
    return 'the customer address was rejected by the mail server.';
  }
  return err?.message || 'the notification email could not be sent.';
}

/** Brevo's transactional endpoint. Plain HTTPS — no SMTP port involved. */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Delivery over the Brevo HTTP API.
 *
 * Throws on failure (the caller maps it), with the provider's own explanation
 * attached when it sent one, because Brevo's messages are specific and useful
 * ("sender not verified", "IP not allowed", …).
 *
 * @param {{ to: string, subject: string, text: string }} message
 */
async function sendViaHttp(message) {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': config.email.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: config.email.fromEmail, name: config.email.fromName },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    }),
    // The transport-level ceiling; sendViaProvider still bounds the whole call.
    signal: AbortSignal.timeout(SEND_DEADLINE_MS),
  });

  if (res.ok) return;

  // Brevo answers errors as { code, message }; fall back to the status text.
  const detail = await res
    .json()
    .then((body) => body?.message || JSON.stringify(body))
    .catch(() => res.statusText);

  const error = new Error(`Brevo rejected the message (${res.status}): ${detail}`);
  // Reuse the SMTP vocabulary so describeSendFailure treats both alike.
  error.code = res.status === 401 || res.status === 403 ? 'EAUTH' : 'EPROVIDER';
  throw error;
}

/**
 * Real delivery, over whichever transport the environment supports.
 *
 * Returns `{ sent, error }` rather than throwing, so the caller can report the
 * outcome without ever putting the committed status change at risk.
 *
 * @param {{ to: string, subject: string, text: string }} message
 */
async function sendViaProvider(message) {
  if (!config.email.configured) {
    return {
      sent: false,
      error:
        'Email notifications are on, but no sender is configured: set BREVO_API_KEY and MAIL_FROM_EMAIL (or SMTP_USER and SMTP_PASS for local SMTP). See .env.example.',
    };
  }

  // Prefer the HTTP API: it is the only route that works on a host with the SMTP
  // ports blocked. SMTP is used only when no API key is configured.
  const useHttp = config.email.httpConfigured;

  // Over SMTP, Gmail rewrites the sender to the authenticated account anyway, so
  // the credentials are the single source of truth for the From address.
  const envelope = { from: config.email.user, ...message };

  // SEND_DEADLINE_MS is the budget for the WHOLE operation, retry included, so
  // the admin's status-change response can never be held open longer than that
  // (the status change itself is already stored either way).
  const startedAt = Date.now();
  const remaining = () => SEND_DEADLINE_MS - (Date.now() - startedAt);
  const attempt = () =>
    useHttp
      ? withDeadline(sendViaHttp(message), remaining())
      : withDeadline(getTransport().sendMail(envelope), remaining());

  try {
    await attempt();
    return { sent: true, error: null };
  } catch (err) {
    // The raw cause is logged for the operator — the client only ever sees the
    // sanitized description, and the recipient address is never logged.
    console.error(`[email] send failed after ${Date.now() - startedAt}ms (${err?.code || 'no code'}): ${err?.message}`);

    // Retry only a transient failure that failed FAST. A slow timeout means the
    // route is blocked or the server is unreachable: retrying would just double
    // the admin's wait for the same answer.
    const worthRetrying = TRANSIENT_CODES.includes(err?.code) && remaining() > 3000;
    if (!worthRetrying) {
      return { sent: false, error: describeSendFailure(err) };
    }

    // A transient failure can leave the cached transport holding a dead socket,
    // so it is dropped and rebuilt for the single retry.
    transport = null;

    try {
      await attempt();
      console.error('[email] retry succeeded');
      return { sent: true, error: null };
    } catch (retryErr) {
      console.error(`[email] retry failed (${retryErr?.code || 'no code'}): ${retryErr?.message}`);
      return { sent: false, error: describeSendFailure(retryErr) };
    }
  }
}

/**
 * Read the notification switch from the store configuration.
 *
 * Never throws: an unseeded store (getSettings throws 404) or an unreachable
 * database is treated as "notifications off", which keeps this module's contract
 * intact for a status change that has already been committed.
 *
 * @returns {Promise<boolean>}
 */
async function notificationsEnabled() {
  try {
    const settings = await getSettings();
    return Boolean(settings?.emailEnabled);
  } catch {
    return false;
  }
}

/**
 * Notify the customer that their order moved to a new status.
 *
 * Always resolves — never throws — so the caller can attempt it after the status
 * change has already been committed without risking that change.
 *
 * @param {{ order: { reference: string, customerName: string, customerEmail: string },
 *   newStatus: string }} params
 * @returns {Promise<{ sent: boolean, error: string|null }>}
 */
export async function sendOrderStatusEmail({ order, newStatus }) {
  if (!(await notificationsEnabled())) {
    // Disabled implementation: nothing is sent and nothing sensitive is logged.
    return { sent: false, error: null, reason: 'email disabled' };
  }

  try {
    const message = buildOrderStatusMessage(order, newStatus);
    const result = await sendViaProvider(message);
    return { sent: Boolean(result?.sent), error: result?.error ?? null };
  } catch (err) {
    // Never leak the customer address or provider credentials into the message.
    return { sent: false, error: err?.message || 'The notification email could not be sent.' };
  }
}
