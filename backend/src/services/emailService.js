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
 * The transport is created once and reused, so a burst of status changes does
 * not open a new SMTP connection each time. It is created lazily: a store with
 * notifications switched off never builds one at all.
 */
let transport = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      ...GMAIL_SMTP,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transport;
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
  await getTransport().sendMail({ from: config.email.user, ...message });
  return { sent: true, error: null };
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
