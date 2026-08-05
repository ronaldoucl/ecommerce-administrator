import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { useConfirm } from '../../components/ConfirmModal/ConfirmProvider';
import { useToast } from '../../components/Toast/ToastProvider';
import { orderService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { allowedTransitions, isTerminalStatus, statusLabel } from '../../constants/orderStatus';
import { formatPrice, formatDate } from '../../utils/format';
import styles from './OrderDetail.module.css';

// Order detail page. Shows the whole order and offers only the status changes
// the backend actually allows from where it is now.
//
// We never guess the new status optimistically — we show whatever the response
// says. That way a rejected change (409) cannot leave a status on screen that
// is not real.
function OrderDetail() {
  const { id } = useParams();
  const confirm = useConfirm();
  const toast = useToast();
  const { currency } = useSettings();

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

  // Ask, apply, report. Cancelling is the only change that puts stock back, so
  // it is the only one that warns about it and the only one in the danger tone.
  const changeStatus = (target) => {
    const isCancel = target === 'cancelled';

    return confirm({
      title: isCancel ? 'Cancel this order?' : `Mark as ${statusLabel(target).toLowerCase()}?`,
      message: isCancel
        ? `Order ${order.reference} will be cancelled. Cancelling is final — a cancelled order cannot change status again.`
        : `Order ${order.reference} will move to "${statusLabel(target)}".`,
      warning: isCancel
        ? 'The stock of every item in this order will be restored to its variant.'
        : undefined,
      confirmLabel: isCancel ? 'Cancel order' : `Mark as ${statusLabel(target).toLowerCase()}`,
      cancelLabel: isCancel ? 'Keep order' : 'Cancel',
      tone: isCancel ? 'danger' : 'default',
      onConfirm: async () => {
        setIsUpdating(true);
        setUpdateError('');
        setSuccessMessage('');

        try {
          const updated = await orderService.updateOrderStatus(id, target);

          // Take the new state from the response, not from what we asked for.
          setOrder(updated);

          const message = isCancel
            ? `Order ${updated.reference} cancelled; stock restored.`
            : `Order ${updated.reference} marked as ${statusLabel(updated.status).toLowerCase()}.`;

          setSuccessMessage(message);
          notifyStatusChange(message, updated);
        } catch (err) {
          // On failure leave the status alone and show what the backend said.
          // The dialog stays open so you can retry or back out.
          const message = err?.message || 'The status could not be updated.';
          setUpdateError(message);
          toast.error(message);
          throw err;
        } finally {
          setIsUpdating(false);
        }
      },
    });
  };

  // Two separate toasts on purpose. The status change always sticks; the email
  // is attempted afterwards and can fail on its own. Mixing them into one
  // message would make a failed email look like a failed status change.
  const notifyStatusChange = (message, updated) => {
    if (updated.emailSent) {
      toast.success(`${message} Customer notified by email.`);
      return;
    }

    toast.success(message);

    if (updated.emailError) {
      toast.error(
        `The status was updated, but the confirmation email could not be sent: ${updated.emailError}`,
      );
    } else {
      // Notifications are just switched off in Settings. Not a failure, so this
      // is only an FYI.
      toast.info(
        'Email notifications are disabled — the customer was not notified. You can turn them on in Settings.',
      );
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
                  <td className={styles.numeric}>{formatPrice(item.unitPrice, currency)}</td>
                  <td className={styles.numeric}>{formatPrice(item.lineTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className={styles.totalLabel}>
                  Total
                </td>
                <td className={`${styles.numeric} ${styles.totalValue}`}>
                  {formatPrice(order.totalAmount, currency)}
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
                variant={target === 'cancelled' ? 'danger' : 'primary'}
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
