import nodemailer from 'nodemailer';

import { config } from '../config/env.js';
import { getSettings } from './settings.service.js';

/**
 * Email service — notifies a customer when their order changes status.
 *
 * The store can run with or without notifications, so there are TWO
 * implementations behind the `StoreSettings.emailEnabled` switch, which the
 * admin toggles from the dashboard (Settings):
 *
 *   - emailEnabled = false (default): a no-op stub. Nothing is sent, no customer
 *     data is logged, and the caller is told the email was skipped.
 *   - emailEnabled = true: the real sender, over Gmail SMTP via nodemailer. It
 *     needs SMTP_USER / SMTP_PASS in the environment; missing credentials are
 *     reported as a plain error instead of throwing.
 *
 * The split is deliberate: the switch is store configuration an admin changes at
 * will, while the mailbox credentials are secrets and stay in the environment.
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

/** Reject if `promise` has not settled within `ms`. */
function withDeadline(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('the mail server did not respond in time')),
      ms,
    );
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
    return 'the mailbox rejected the credentials — check SMTP_USER and that SMTP_PASS is a current Google app password.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS') {
    return 'the mail server could not be reached (network or firewall). The order status was still updated — you can retry the notification by changing the status again.';
  }
  if (code === 'EENVELOPE') {
    return 'the customer address was rejected by the mail server.';
  }
  return err?.message || 'the notification email could not be sent.';
}

/**
 * Real delivery over SMTP.
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
        'Email notifications are on, but the mailbox is not configured: missing SMTP_USER, SMTP_PASS. See .env.example.',
    };
  }

  // Gmail rewrites the sender to the authenticated account anyway, so the
  // credentials are the single source of truth for the From address.
  //
  // Bounded by SEND_DEADLINE_MS so a hanging mail server can never hold the
  // admin's status-change response open (the change itself is already stored).
  try {
    await withDeadline(
      getTransport().sendMail({ from: config.email.user, ...message }),
      SEND_DEADLINE_MS,
    );
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: describeSendFailure(err) };
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
