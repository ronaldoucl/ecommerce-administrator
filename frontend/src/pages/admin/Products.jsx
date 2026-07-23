import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { productService } from '../../services';
import { formatPrice } from '../../utils/format';
import styles from './Products.module.css';

/**
 * Admin products listing. Shows every product (active and inactive) in a table
 * with row actions: edit, activate/deactivate, feature/unfeature and delete.
 * Every mutation goes through the product service and the list is refreshed
 * afterwards so the table always reflects the real API state.
 */
function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Id of the product whose row action is in flight (disables that row), plus
  // a shared banner for any action that fails.
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await productService.list();
      setProducts(data);
    } catch (err) {
      setLoadError(err.message || 'Unable to load products.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Run a mutation for a single row, then refresh the list. Keeps the row
  // disabled and surfaces the normalized { message } on failure.
  const runRowAction = async (id, action) => {
    setBusyId(id);
    setActionError('');

    try {
      await action();
      await load();
    } catch (err) {
      setActionError(err.message || 'The action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = (product) =>
    runRowAction(product.id, () =>
      productService.update(product.id, { isActive: !product.isActive }),
    );

  const handleToggleFeatured = (product) =>
    runRowAction(product.id, () =>
      productService.update(product.id, { isFeatured: !product.isFeatured }),
    );

  const handleDelete = (product) => {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) return undefined;

    return runRowAction(product.id, () => productService.remove(product.id));
  };

  return (
    <section>
      <header className={styles.header}>
        <h1>Products</h1>
        <Button onClick={() => navigate('/admin/products/new')}>Add product</Button>
      </header>

      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}

      <Card>
        {isLoading ? (
          <p role="status">Loading products…</p>
        ) : loadError ? (
          <div role="alert">
            <p className={styles.error}>{loadError}</p>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : products.length === 0 ? (
          <p>No products yet. Create your first one.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Base price</th>
                  <th>Active</th>
                  <th>Featured</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isBusy = busyId === product.id;

                  return (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{formatPrice(product.basePrice)}</td>
                      <td>
                        <span
                          className={product.isActive ? styles.badgeOn : styles.badgeOff}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={product.isFeatured ? styles.badgeOn : styles.badgeOff}
                        >
                          {product.isFeatured ? 'Featured' : 'No'}
                        </span>
                      </td>
                      <td className={styles.actions}>
                        <Button
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(product)}
                        >
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => handleToggleFeatured(product)}
                        >
                          {product.isFeatured ? 'Unfeature' : 'Feature'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => handleDelete(product)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default Products;
