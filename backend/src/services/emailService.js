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
 * TRANSPORT: Brevo's HTTP API, called with `fetch` — so this feature adds no npm
 * dependency at all. HTTP rather than SMTP on purpose: Render's free plan blocks
 * outbound traffic to the SMTP ports (25/465/587), which makes direct SMTP
 * unusable in production, while plain HTTPS is unaffected.
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
 * Build the message for an order status change. Exported so the sender and any
 * future preview/testing tooling share exactly the same copy.
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

const BREVO_SEND_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDERS_ENDPOINT = 'https://api.brevo.com/v3/senders';

/**
 * Ceiling for one whole notification attempt, retry included.
 *
 * This is the API's response-time guarantee: the admin's status change is
 * already committed, so whatever the provider does, the dashboard hears back
 * promptly instead of sitting on a spinner.
 */
const SEND_DEADLINE_MS = 12000;

/** Shorter budget for the sender lookup — it is a pre-flight, not the payload. */
const SENDER_CHECK_TIMEOUT_MS = 5000;

/**
 * The sender address already confirmed as verified, so the extra lookup happens
 * at most once per process. Keyed by the ADDRESS rather than a flag, so changing
 * MAIL_FROM_EMAIL re-runs the check instead of riding on the previous answer.
 * A NEGATIVE result is deliberately not cached: once the admin verifies the
 * address in Brevo, the next send works without restarting the server.
 */
let verifiedSender = null;

/** Common headers for every Brevo call. */
function brevoHeaders() {
  return { 'api-key': config.email.apiKey, accept: 'application/json' };
}

/**
 * Fail fast when MAIL_FROM_EMAIL is not a verified Brevo sender.
 *
 * This check exists because of a trap: Brevo ACCEPTS the send request with
 * `201 Created` and only rejects it asynchronously, so without this the API
 * would report `emailSent: true` for a message that is silently discarded.
 * Better to refuse up front with an explanation.
 *
 * Fails OPEN: if the lookup itself cannot run (network, rate limit), the send is
 * still attempted — this is a safety net, not a gate.
 */
async function assertSenderVerified() {
  const from = config.email.fromEmail.toLowerCase();
  if (verifiedSender === from) return;

  let senders;
  try {
    const res = await fetch(BREVO_SENDERS_ENDPOINT, {
      headers: brevoHeaders(),
      signal: AbortSignal.timeout(SENDER_CHECK_TIMEOUT_MS),
    });
    if (!res.ok) return; // cannot tell — let the send proceed
    senders = (await res.json())?.senders ?? [];
  } catch {
    return; // cannot tell — let the send proceed
  }

  const match = senders.find((s) => s.email?.toLowerCase() === from);

  if (match?.active) {
    verifiedSender = from;
    return;
  }

  const known = senders.map((s) => s.email).join(', ') || 'none';
  const error = new Error(
    match
      ? `the sender ${config.email.fromEmail} exists in Brevo but is not verified yet — open the confirmation email Brevo sent to it.`
      : `MAIL_FROM_EMAIL (${config.email.fromEmail}) is not a verified Brevo sender. Verified senders on this account: ${known}.`,
  );
  error.code = 'EPROVIDER';
  throw error;
}

/**
 * Post one message to Brevo. Throws on failure; the caller maps it.
 *
 * @param {{ to: string, subject: string, text: string }} message
 * @param {number} timeoutMs - budget left for this attempt
 */
async function postMessage(message, timeoutMs) {
  // Brevo returns 201 even for a message it will later discard, so the sender is
  // validated first — otherwise the failure would be invisible to the admin.
  await assertSenderVerified();

  const res = await fetch(BREVO_SEND_ENDPOINT, {
    method: 'POST',
    headers: { ...brevoHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: config.email.fromEmail, name: config.email.fromName },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    }),
    signal: AbortSignal.timeout(Math.max(1000, timeoutMs)),
  });

  if (res.ok) return;

  // Brevo answers errors as { code, message }; fall back to the status text.
  const detail = await res
    .json()
    .then((body) => body?.message || JSON.stringify(body))
    .catch(() => res.statusText);

  const error = new Error(`Brevo rejected the message (${res.status}): ${detail}`);
  if (res.status === 401 || res.status === 403) {
    error.code = 'EAUTH'; // bad API key — never worth retrying
  } else if (res.status >= 500) {
    error.code = 'EPROVIDER_DOWN'; // provider-side blip — worth one retry
  } else {
    error.code = 'EPROVIDER'; // our payload is wrong (sender, quota, address)
  }
  throw error;
}

/** True for failures that a second, immediate attempt might get past. */
function isTransient(err) {
  if (err?.code === 'EPROVIDER_DOWN') return true;
  // fetch reports every network-level failure as `TypeError: fetch failed`,
  // with the real reason in `cause`.
  return err?.name === 'TypeError' && Boolean(err?.cause);
}

/**
 * Turn a failure into something an admin can act on. Raw provider wording
 * ("fetch failed") says nothing about what to do next.
 */
function describeSendFailure(err) {
  if (err?.code === 'EAUTH') {
    return 'the email provider rejected the API key — check BREVO_API_KEY.';
  }
  if (err?.code === 'EPROVIDER' || err?.code === 'EPROVIDER_DOWN') {
    // Brevo's own wording is specific and actionable (unverified sender, quota,
    // malformed recipient), so it is passed through rather than flattened.
    return err.message;
  }
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return 'the email provider did not respond in time. The order status was still updated — you can retry the notification by changing the status again.';
  }
  if (err?.name === 'TypeError' && err?.cause) {
    return 'the email provider could not be reached (network or DNS). The order status was still updated — you can retry the notification by changing the status again.';
  }
  return err?.message || 'the notification email could not be sent.';
}

/**
 * Deliver the message, with a single retry for a transient failure.
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
        'Email notifications are on, but no sender is configured: set BREVO_API_KEY and MAIL_FROM_EMAIL. See .env.example.',
    };
  }

  // SEND_DEADLINE_MS is the budget for the WHOLE operation, retry included.
  const startedAt = Date.now();
  const remaining = () => SEND_DEADLINE_MS - (Date.now() - startedAt);

  try {
    await postMessage(message, remaining());
    return { sent: true, error: null };
  } catch (err) {
    // The raw cause is logged for the operator — the client only ever sees the
    // sanitized description, and the recipient address is never logged.
    console.error(
      `[email] send failed after ${Date.now() - startedAt}ms (${err?.code || err?.name || 'no code'}): ${err?.message}`,
    );

    // Retry only a transient failure that failed FAST. A slow timeout means the
    // provider is unreachable: retrying would just double the admin's wait for
    // the same answer.
    if (!isTransient(err) || remaining() < 3000) {
      return { sent: false, error: describeSendFailure(err) };
    }

    try {
      await postMessage(message, remaining());
      console.error('[email] retry succeeded');
      return { sent: true, error: null };
    } catch (retryErr) {
      console.error(`[email] retry failed (${retryErr?.code || retryErr?.name}): ${retryErr?.message}`);
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
    // Disabled: nothing is sent and nothing sensitive is logged.
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
