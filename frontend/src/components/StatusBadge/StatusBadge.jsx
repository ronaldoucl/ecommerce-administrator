import styles from './StatusBadge.module.css';
import { statusLabel } from '../../constants/orderStatus';

const CLASS_BY_STATUS = {
  pending: styles.pending,
  confirmed: styles.confirmed,
  preparing: styles.preparing,
  delivered: styles.delivered,
  cancelled: styles.cancelled,
};

/**
 * Color-coded order status badge. The status text label is always rendered, so
 * the meaning never relies on color alone (accessibility).
 *
 * @param {object} props
 * @param {string} props.status - one of the order statuses
 */
function StatusBadge({ status }) {
  const variant = CLASS_BY_STATUS[status] ?? styles.unknown;
  return <span className={`${styles.badge} ${variant}`}>{statusLabel(status)}</span>;
}

export default StatusBadge;
