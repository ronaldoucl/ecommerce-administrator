import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { orderService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { ORDER_STATUSES, statusLabel } from '../../constants/orderStatus';
import { formatPrice, formatDate } from '../../utils/format';
import styles from './Orders.module.css';

const PAGE_SIZE = 10;

/**
 * Admin orders list. Loads real orders from the API with a status filter and
 * pagination wired to the backend query params. Each row opens the detail view.
 */
function Orders() {
  const navigate = useNavigate();
  const { currency } = useSettings();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(''); // '' = All

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await orderService.listOrders({
        status: statusFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(result.data);
      setTotal(result.total);
    } catch (err) {
      setLoadError(err.message || 'Unable to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1); // a new filter starts from the first page
  };

  const openOrder = (id) => navigate(`/admin/orders/${id}`);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <header className={styles.header}>
        <h1>Orders</h1>

        <label className={styles.filter}>
          <span>Status</span>
          <select value={statusFilter} onChange={handleFilterChange} className={styles.select}>
            <option value="">All</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <Card>
        {isLoading ? (
          <div className={styles.center} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <p>Loading orders…</p>
          </div>
        ) : loadError ? (
          <div role="alert">
            <p className={styles.error}>{loadError}</p>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <p className={styles.empty}>
            {statusFilter
              ? `No ${statusLabel(statusFilter).toLowerCase()} orders.`
              : 'No orders yet.'}
          </p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={styles.row}
                      onClick={() => openOrder(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openOrder(order.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open order ${order.reference}`}
                    >
                      <td className={styles.reference}>{order.reference}</td>
                      <td>{order.customerName}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>{order.itemCount}</td>
                      <td>{formatPrice(order.totalAmount, currency)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages} · {total} {total === 1 ? 'order' : 'orders'}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

export default Orders;
