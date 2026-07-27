import Card from '../../components/Card/Card';
import styles from './Dashboard.module.css';

/**
 * Admin dashboard overview.
 *
 * Placeholder tiles for this sprint. The summary metrics stay empty on purpose:
 * GET /api/analytics/summary lands in Sprint 4. Each tile is already shaped
 * around a value, so Sprint 4 only needs to fetch the summary and drop the
 * numbers in — no layout changes required.
 */
const METRIC_TILES = [
  { key: 'totalSales', label: 'Total sales', hint: 'Revenue across all paid orders.' },
  { key: 'orders', label: 'Orders', hint: 'Orders placed in the selected period.' },
  { key: 'lowStock', label: 'Low stock', hint: 'Products below their stock threshold.' },
  { key: 'products', label: 'Active products', hint: 'Products currently published.' },
];

function Dashboard() {
  return (
    <section>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back. Here is an overview of your store.</p>
      </header>

      <div className={styles.tiles}>
        {METRIC_TILES.map(({ key, label, hint }) => (
          <Card key={key} className={styles.tile}>
            <p className={styles.tileLabel}>{label}</p>
            {/* Empty state: Sprint 4 replaces the placeholder with the fetched value. */}
            <p className={styles.tileValue} aria-hidden="true">
              —
            </p>
            <p className={styles.tileHint}>Available in Sprint 4</p>
            <p className={styles.srOnly}>{hint}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
