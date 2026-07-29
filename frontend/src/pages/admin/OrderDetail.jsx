import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { orderService } from '../../services';
import { allowedTransitions, isTerminalStatus, statusLabel } from '../../constants/orderStatus';
import { formatPrice, formatDate } from '../../utils/format';
import styles from './OrderDetail.module.css';

/**
 * Admin order detail. Shows the full order (customer, items, total, status) and
 * offers ONLY the status transitions the backend allows from the current status.
 * The displayed status is refreshed strictly from the update response, so a
 * rejected transition (409) never leaves an optimistic value that lies.
 */
function OrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await orderService.getOrder(id);
      setOrder(data);
    } catch (err) {
      setLoadError(err.message || 'Unable to load the order.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (target) => {
    // Cancelling is destructive and restores stock: confirm and warn explicitly.
    if (target === 'cancelled') {
      const confirmed = window.confirm(
        'Cancel this order? This will restore the stock of every item in the order. This action cannot be undone.',
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);
    setUpdateError('');
    setSuccessMessage('');

    try {
      const updated = await orderService.updateOrderStatus(id, target);
      // Refresh the displayed order strictly from the response.
      setOrder(updated);
      setSuccessMessage(`Status updated to ${statusLabel(updated.status)}.`);
    } catch (err) {
      // On 409 (or any failure) keep the previously displayed status untouched
      // and surface the backend message.
      setUpdateError(err.message || 'The status could not be updated.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <div className={styles.center} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Loading order…</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        <p className={styles.error} role="alert">
          {loadError}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={load}>
            Retry
          </Button>
          <Button variant="ghost" as={Link} to="/admin/orders">
            Back to orders
          </Button>
        </div>
      </section>
    );
  }

  if (!order) return null;

  const transitions = allowedTransitions(order.status);
  const terminal = isTerminalStatus(order.status);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to="/admin/orders" className={styles.back}>
            &larr; Back to orders
          </Link>
          <h1 className={styles.reference}>{order.reference}</h1>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <Card>
        <h2 className={styles.sectionTitle}>Customer</h2>
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>Name</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Email</dt>
            <dd>{order.customerEmail}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Shipping</dt>
            <dd className={styles.shipping}>{order.shippingInfo}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Created</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Items</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th className={styles.numeric}>Qty</th>
                <th className={styles.numeric}>Unit price</th>
                <th className={styles.numeric}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.variantId ?? item.productId}:${index}`}>
                  <td>{item.productName}</td>
                  <td>{item.variantLabel || '—'}</td>
                  <td className={styles.numeric}>{item.quantity}</td>
                  <td className={styles.numeric}>{formatPrice(item.unitPrice)}</td>
                  <td className={styles.numeric}>{formatPrice(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className={styles.totalLabel}>
                  Total
                </td>
                <td className={`${styles.numeric} ${styles.totalValue}`}>
                  {formatPrice(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Status</h2>
        <p className={styles.currentStatus}>
          Current status: <StatusBadge status={order.status} />
        </p>

        {updateError && (
          <p className={styles.error} role="alert">
            {updateError}
          </p>
        )}
        {successMessage && (
          <p className={styles.success} role="status">
            {successMessage}
          </p>
        )}

        {terminal ? (
          <p className={styles.terminal}>
            This order is {statusLabel(order.status).toLowerCase()} — a final state with no
            further status changes.
          </p>
        ) : (
          <div className={styles.transitions}>
            {transitions.map((target) => (
              <Button
                key={target}
                variant={target === 'cancelled' ? 'ghost' : 'primary'}
                disabled={isUpdating}
                onClick={() => changeStatus(target)}
              >
                {target === 'cancelled' ? 'Cancel order' : `Mark as ${statusLabel(target).toLowerCase()}`}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

export default OrderDetail;
