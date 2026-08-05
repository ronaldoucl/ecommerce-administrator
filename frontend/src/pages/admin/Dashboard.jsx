import { useCallback, useEffect, useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { analyticsService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatPrice } from '../../utils/format';
import styles from './Dashboard.module.css';

// Skeleton tiles shown while the first load happens.
const TILE_COUNT = 5;

// The dashboard: five numbers from GET /api/analytics/summary, shown as plain
// tiles. No charts on purpose — no chart library to pull in and nothing extra
// that can break while presenting.
//
// Revenue arrives as a string ("1499.88") so the cents stay exact, and goes
// through formatPrice with the store's currency instead of a hardcoded "$".
function Dashboard() {
  const { currency } = useSettings();

  const [summary, setSummary] = useState(null);
  // Two flags: isLoading is the first load and shows the skeleton, isRefreshing
  // is a manual refresh and keeps the current numbers on screen so the page does
  // not flash back to placeholders.
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // showSkeleton: true on the first load and after an error, false for a manual
  // refresh where we want to keep showing the old numbers.
  const load = useCallback(async ({ showSkeleton = false } = {}) => {
    if (showSkeleton) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError('');

    try {
      const data = await analyticsService.getSummary();
      setSummary(data);
    } catch (err) {
      // status === null means the request never got there at all (server down).
      // Axios only says "Network Error", which helps nobody.
      setError(
        err.status
          ? err.message || 'Unable to load the dashboard metrics.'
          : 'Could not reach the server. Check that the backend is running and try again.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load({ showSkeleton: true });
  }, [load]);

  return (
    <section>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1>Dashboard</h1>
          <p className={styles.subtitle}>Welcome back. Here is an overview of your store.</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => load()}
          disabled={isLoading || isRefreshing}
          className={styles.refreshButton}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      {/* Announce refreshes without stealing focus. */}
      <p className={styles.srOnly} role="status">
        {isRefreshing ? 'Refreshing metrics…' : ''}
      </p>

      {isLoading ? (
        <TileSkeleton />
      ) : error ? (
        <Card className={styles.errorCard}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <Button variant="secondary" onClick={() => load({ showSkeleton: true })}>
            Retry
          </Button>
        </Card>
      ) : (
        <MetricTiles summary={summary} currency={currency} isStale={isRefreshing} />
      )}
    </section>
  );
}

// The five tiles, once we have the data.
function MetricTiles({ summary, currency, isStale }) {
  const bestSeller = summary.bestSellingProduct;
  const lowStock = summary.lowStock ?? { threshold: null, count: 0, items: [] };
  const lowStockItems = lowStock.items ?? [];

  return (
    <div className={`${styles.tiles} ${isStale ? styles.tilesStale : ''}`}>
      {/* ── Total orders ───────────────────────────────────────────────── */}
      <Card className={styles.tile}>
        <p className={styles.tileLabel}>Total orders</p>
        <p className={styles.tileValue}>{summary.totalOrders ?? 0}</p>
        <p className={styles.tileHint}>Every order placed, any status.</p>
      </Card>

      {/* ── Simulated revenue ──────────────────────────────────────────── */}
      <Card className={`${styles.tile} ${styles.tileAccent}`}>
        <p className={styles.tileLabel}>Simulated revenue</p>
        <p className={styles.tileValue}>{formatPrice(summary.simulatedRevenue, currency)}</p>
        <p className={styles.tileHint}>Cancelled orders excluded.</p>
      </Card>

      {/* ── Pending orders ─────────────────────────────────────────────── */}
      <Card className={styles.tile}>
        <p className={styles.tileLabel}>Pending orders</p>
        <p className={styles.tileValue}>{summary.pendingOrders ?? 0}</p>
        <p className={styles.tileHint}>Waiting to be processed.</p>
      </Card>

      {/* ── Best-selling product ───────────────────────────────────────── */}
      <Card className={styles.tile}>
        <p className={styles.tileLabel}>Best-selling product</p>
        {bestSeller ? (
          <>
            <p className={styles.tileValue}>{bestSeller.unitsSold ?? 0}</p>
            <p className={styles.tileHint}>
              units sold —{' '}
              <span className={styles.tileStrong}>
                {bestSeller.productName || 'Unnamed product'}
              </span>
            </p>
          </>
        ) : (
          <>
            <p className={styles.tileEmptyValue}>No sales yet</p>
            <p className={styles.tileHint}>A best seller appears after the first order.</p>
          </>
        )}
      </Card>

      {/* ── Low-stock products ─────────────────────────────────────────── */}
      <Card className={styles.tile}>
        <p className={styles.tileLabel}>Low-stock products</p>
        <p className={styles.tileValue}>{lowStock.count ?? 0}</p>

        {lowStockItems.length > 0 ? (
          <details className={styles.lowStockDetails}>
            <summary className={styles.lowStockSummary}>
              {lowStockItems.length === 1 ? 'View the item' : 'View the items'}
            </summary>
            <ul className={styles.lowStockList}>
              {lowStockItems.map((item) => (
                <li key={item.variantId} className={styles.lowStockItem}>
                  <span className={styles.lowStockLabel}>
                    {item.productName} — {item.variantLabel}
                  </span>
                  <span
                    className={item.isOutOfStock ? styles.lowStockOut : styles.lowStockCount}
                  >
                    {item.isOutOfStock ? 'Out of stock' : `${item.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className={styles.tileHint}>All variants above threshold.</p>
        )}

        {lowStock.threshold !== null && lowStock.threshold !== undefined && (
          <p className={styles.tileHint}>Threshold: {lowStock.threshold} units or fewer.</p>
        )}
      </Card>
    </div>
  );
}

// Grey placeholder tiles for the first load.
function TileSkeleton() {
  return (
    <div className={styles.tiles} role="status" aria-label="Loading dashboard metrics">
      {Array.from({ length: TILE_COUNT }, (_, index) => (
        <Card key={index} className={styles.tile} aria-hidden="true">
          <span className={`${styles.skeleton} ${styles.skeletonLabel}`} />
          <span className={`${styles.skeleton} ${styles.skeletonValue}`} />
          <span className={`${styles.skeleton} ${styles.skeletonHint}`} />
        </Card>
      ))}
    </div>
  );
}

export default Dashboard;
// Named export too, so the tiles can be rendered on their own with fake data,
// without needing the backend running.
export { MetricTiles, TileSkeleton };
