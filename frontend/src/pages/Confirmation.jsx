import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { formatPrice } from '../utils/format';
import styles from './Confirmation.module.css';

/**
 * Read the order backing this confirmation. Router state is preferred (set by
 * the checkout navigation); sessionStorage "last_order" is the fallback so the
 * page survives a reload. The stored order is only used when its reference
 * matches the one in the URL, so an old order never shows under a new reference.
 */
function readOrder(reference, stateOrder) {
  if (stateOrder) return stateOrder;

  try {
    const raw = sessionStorage.getItem('last_order');
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (!reference || stored?.reference === reference) return stored;
  } catch {
    // Ignore missing/corrupt storage — fall through to the not-found state.
  }
  return null;
}

/**
 * Order confirmation page shown after a successful checkout at
 * /confirmation/:reference.
 */
function Confirmation() {
  const { reference } = useParams();
  const location = useLocation();
  const order = useMemo(
    () => readOrder(reference, location.state?.order),
    [reference, location.state],
  );

  // No order to show (e.g. a direct visit without a placed order).
  if (!order) {
    return (
      <section className={styles.empty}>
        <h1>Order confirmation</h1>
        <p>
          We couldn&apos;t find the details for
          {reference ? ` order ${reference}` : ' this order'}. It may have
          already been completed.
        </p>
        <Button as={Link} to="/">
          Continue shopping
        </Button>
      </section>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Order confirmed</h1>
        <p className={styles.lead}>
          Thank you{order.customerName ? `, ${order.customerName}` : ''}! Your
          order has been placed.
        </p>
        <p className={styles.reference}>
          Reference: <strong>{order.reference}</strong>
        </p>
      </header>

      <Card>
        <h2 className={styles.sectionTitle}>Order details</h2>
        <ul className={styles.lines}>
          {items.map((item, index) => (
            <li key={`${item.variantLabel}:${index}`} className={styles.line}>
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

      <Button variant="secondary" as={Link} to="/">
        Continue shopping
      </Button>
    </section>
  );
}

export default Confirmation;
