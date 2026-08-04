import { useCallback, useEffect, useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { analyticsService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatPrice } from '../../utils/format';
import styles from './Dashboard.module.css';

/** How many skeleton tiles to show while the first summary loads. */
const TILE_COUNT = 5;

/**
 * Admin dashboard overview.
 *
 * Renders the five MVP metrics from GET /api/analytics/summary as plain number
 * tiles — deliberately no charts, so there is no charting dependency and
 * nothing to break during a demo.
 *
 * Revenue arrives as a Decimal-safe STRING ("1499.88") and is rendered through
 * the shared price helper with the store currency from the settings, so it can
 * never surface as NaN and never hardcodes a currency symbol.
 */
function Dashboard() {
  const { currency } = useSettings();

  const [summary, setSummary] = useState(null);
  // `isLoading` covers the very first fetch (skeleton); `isRefreshing` covers a
  // manual re-pull, which keeps the current numbers on screen instead of
  // flashing the skeleton again.
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  /**
   * Fetch the summary.
   *
   * @param {{ showSkeleton?: boolean }} [options] - `showSkeleton` swaps the
   *   tiles for the loading placeholder (initial load and retry-after-error);
   *   otherwise the current numbers stay on screen while they are re-pulled.
   */
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
      // `status === null` means the request never reached the backend (server
      // down, connection lost); axios only offers a bare "Network Error" there.
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

/** The five metric tiles, rendered from a loaded summary. */
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

/** Placeholder tiles shown while the first summary is in flight. */
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
// Also exported by name so the presentational tiles can be rendered in
// isolation (e.g. against a captured API payload) without a running backend.
export { MetricTiles, TileSkeleton };
