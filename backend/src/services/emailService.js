import { config } from '../config/env.js';
import { getSettings } from './settings.service.js';

// Sends the customer an email when their order changes status.
//
// Two things to know before touching this file:
//   1. Nothing here ever throws. The status change is already saved by the time
//      we get called, so a failed email must never break it — we return
//      { sent, error } instead.
//   2. We use Brevo's HTTP API with fetch (no npm package). SMTP would be nicer
//      but Render's free plan blocks the SMTP ports, so HTTPS it is.

const STATUS_COPY = {
  pending: 'We have received your order',
  confirmed: 'Your order has been confirmed',
  preparing: 'Your order is being prepared',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
};

// Writes the email text. Separate from the sending so we can build a message
// without calling Brevo.
function buildOrderStatusMessage(order, newStatus) {
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

// Max time for the whole attempt, retry included, so the dashboard never hangs.
const SEND_DEADLINE_MS = 12000;
const SENDER_CHECK_TIMEOUT_MS = 5000;

// Remembers the address we already checked, so we only ask Brevo once. We store
// the address (not true/false) so changing MAIL_FROM_EMAIL re-runs the check.
// Failures are not cached: verify the sender in Brevo and the next send works.
let verifiedSender = null;

function brevoHeaders() {
  return { 'api-key': config.email.apiKey, accept: 'application/json' };
}

// Checks MAIL_FROM_EMAIL is a verified sender in Brevo.
//
// This exists because of a nasty trap: Brevo answers 201 Created and THEN throws
// the message away if the sender is not verified. Without this we would tell the
// admin "email sent" about an email nobody receives.
//
// If the check itself fails we let the send go ahead — it is a warning, not a gate.
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

// Posts one message to Brevo. Throws on failure; the caller decides what to do.
async function postMessage(message, timeoutMs) {
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

  // Brevo sends errors as { code, message }; fall back to the status text.
  const detail = await res
    .json()
    .then((body) => body?.message || JSON.stringify(body))
    .catch(() => res.statusText);

  const error = new Error(`Brevo rejected the message (${res.status}): ${detail}`);
  if (res.status === 401 || res.status === 403) {
    error.code = 'EAUTH'; // bad API key — retrying will not help
  } else if (res.status >= 500) {
    error.code = 'EPROVIDER_DOWN'; // their side — worth one retry
  } else {
    error.code = 'EPROVIDER'; // our payload is wrong (sender, quota, address)
  }
  throw error;
}

// Is it worth trying again right now?
function isTransient(err) {
  if (err?.code === 'EPROVIDER_DOWN') return true;
  // fetch reports every network error as "TypeError: fetch failed" and hides the
  // real reason in `cause`.
  return err?.name === 'TypeError' && Boolean(err?.cause);
}

// Turns the error into something the admin can actually act on.
function describeSendFailure(err) {
  if (err?.code === 'EAUTH') {
    return 'the email provider rejected the API key — check BREVO_API_KEY.';
  }
  if (err?.code === 'EPROVIDER' || err?.code === 'EPROVIDER_DOWN') {
    // Brevo's own message is specific enough (unverified sender, quota, bad
    // address), so we pass it through.
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

// Sends the message, retrying once if the failure looks temporary.
async function sendViaProvider(message) {
  if (!config.email.configured) {
    return {
      sent: false,
      error:
        'Email notifications are on, but no sender is configured: set BREVO_API_KEY and MAIL_FROM_EMAIL. See .env.example.',
    };
  }

  const startedAt = Date.now();
  const remaining = () => SEND_DEADLINE_MS - (Date.now() - startedAt);

  try {
    await postMessage(message, remaining());
    return { sent: true, error: null };
  } catch (err) {
    // Log the real error for us; the admin only sees the cleaned-up version.
    // Never log the customer's address.
    console.error(
      `[email] send failed after ${Date.now() - startedAt}ms (${err?.code || err?.name || 'no code'}): ${err?.message}`,
    );

    // Only retry if it failed fast. A slow timeout means Brevo is unreachable,
    // so retrying just makes the admin wait twice for the same answer.
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

// Reads the on/off switch from the store settings. If we cannot read them
// (unseeded store, DB down) we treat it as off instead of blowing up.
async function notificationsEnabled() {
  try {
    const settings = await getSettings();
    return Boolean(settings?.emailEnabled);
  } catch {
    return false;
  }
}

// Entry point. Always resolves, never throws — see the note at the top.
export async function sendOrderStatusEmail({ order, newStatus }) {
  if (!(await notificationsEnabled())) {
    return { sent: false, error: null, reason: 'email disabled' };
  }

  try {
    const message = buildOrderStatusMessage(order, newStatus);
    const result = await sendViaProvider(message);
    return { sent: Boolean(result?.sent), error: result?.error ?? null };
  } catch (err) {
    return { sent: false, error: err?.message || 'The notification email could not be sent.' };
  }
}
