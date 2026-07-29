import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { formatPrice } from '../utils/format';
import styles from './Confirmation.module.css';

/**
 * Resolve the order backing this confirmation, in priority order:
 *   1. The order passed through router state by the checkout page.
 *   2. sessionStorage "last_order", but ONLY when its reference matches the
 *      :reference in the URL — so an old order never renders under a new one.
 *
 * Returns null when neither source is available (direct link, refresh in a new
 * tab, cleared storage); the page then shows a graceful reference-only view.
 *
 * GET /api/orders/:id is admin-only, so there is deliberately no re-fetch here:
 * the public confirmation renders strictly from data checkout already returned.
 */
function readOrder(reference, stateOrder) {
  if (stateOrder) return stateOrder;

  try {
    const raw = sessionStorage.getItem('last_order');
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (stored?.reference && stored.reference === reference) return stored;
  } catch {
    // Ignore missing/corrupt storage — fall through to the reference-only view.
  }
  return null;
}

const SIMULATED_NOTE =
  'This is a simulated order for an academic project — no real payment was ' +
  'taken and no goods will be shipped.';

/**
 * Public order confirmation shown after a successful checkout at
 * /confirmation/:reference. Read-only: it never touches the cart or the network.
 */
function Confirmation() {
  const { reference } = useParams();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const order = useMemo(
    () => readOrder(reference, location.state?.order),
    [reference, location.state],
  );

  const displayReference = order?.reference ?? reference ?? '';

  const handleCopy = async () => {
    if (!displayReference) return;
    try {
      await navigator.clipboard.writeText(displayReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context / denied permission);
      // the reference is shown in full for manual selection, so fail silently.
    }
  };

  const referenceBlock = displayReference && (
    <Card className={styles.referenceCard}>
      <p className={styles.referenceLabel}>Order reference</p>
      <div className={styles.referenceRow}>
        <code className={styles.referenceValue}>{displayReference}</code>
        <Button
          variant="secondary"
          className={styles.copyButton}
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className={styles.referenceHint} aria-live="polite">
        {copied
          ? 'Reference copied to clipboard.'
          : 'Keep this reference as proof of your order.'}
      </p>
    </Card>
  );

  // Reference-only view: the order exists, this browser just lacks the details.
  // This is NOT an error state.
  if (!order) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <p className={styles.badge}>Order confirmed</p>
          <h1>Your order has been placed</h1>
        </header>

        {referenceBlock}

        <p className={styles.lead}>
          We don&apos;t have the full order details in this browser — you may
          have opened this link directly or refreshed in a new tab — but your
          order went through. The reference above is your proof, and the store
          can look it up.
        </p>

        <p className={styles.simulatedNote} role="note">
          {SIMULATED_NOTE}
        </p>

        <Button variant="secondary" as={Link} to="/">
          Continue shopping
        </Button>
      </section>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const status = order.status || 'pending';

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p className={styles.badge}>Order confirmed</p>
        <h1>Thank you{order.customerName ? `, ${order.customerName}` : ''}!</h1>
        <p className={styles.lead}>Your order has been placed successfully.</p>
      </header>

      {referenceBlock}

      <p className={styles.simulatedNote} role="note">
        {SIMULATED_NOTE}
      </p>

      <Card>
        <h2 className={styles.sectionTitle}>Order details</h2>

        <dl className={styles.customer}>
          <div className={styles.customerRow}>
            <dt>Name</dt>
            <dd>{order.customerName || '—'}</dd>
          </div>
          <div className={styles.customerRow}>
            <dt>Email</dt>
            <dd>{order.customerEmail || '—'}</dd>
          </div>
        </dl>

        <ul className={styles.lines}>
          {items.map((item, index) => (
            <li key={`${item.variantLabel ?? item.productName}:${index}`} className={styles.line}>
              <div className={styles.lineInfo}>
                <p className={styles.lineName}>{item.productName}</p>
                {item.variantLabel && (
                  <p className={styles.lineVariant}>{item.variantLabel}</p>
                )}
                <p className={styles.lineMeta}>
                  {formatPrice(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className={styles.lineTotal}>{formatPrice(item.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <div className={styles.totalRow}>
          <span>Total</span>
          <strong className={styles.total}>{formatPrice(order.totalAmount)}</strong>
        </div>
      </Card>

      <Card className={styles.statusCard}>
        <div className={styles.statusRow}>
          <span className={styles.sectionTitle}>Status</span>
          <span className={styles.statusBadge}>{status}</span>
        </div>
        <p className={styles.statusHelp}>
          Your order is <strong>{status}</strong>. The store will contact you
          {order.customerEmail ? ` at ${order.customerEmail}` : ''} to confirm
          the details and arrange delivery.
        </p>
      </Card>

      <Button variant="secondary" as={Link} to="/">
        Continue shopping
      </Button>
    </section>
  );
}

export default Confirmation;
