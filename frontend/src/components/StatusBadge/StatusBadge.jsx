import styles from './StatusBadge.module.css';
import { statusLabel } from '../../constants/orderStatus';

const CLASS_BY_STATUS = {
  pending: styles.pending,
  confirmed: styles.confirmed,
  preparing: styles.preparing,
  delivered: styles.delivered,
  cancelled: styles.cancelled,
};

// Coloured badge for an order status. The text is always there too — colour on
// its own would leave colour-blind users guessing.
function StatusBadge({ status }) {
  const variant = CLASS_BY_STATUS[status] ?? styles.unknown;
  return <span className={`${styles.badge} ${variant}`}>{statusLabel(status)}</span>;
}

export default StatusBadge;
