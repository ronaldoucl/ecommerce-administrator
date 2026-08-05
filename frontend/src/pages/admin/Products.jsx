import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { useConfirm } from '../../components/ConfirmModal/ConfirmProvider';
import { useToast } from '../../components/Toast/ToastProvider';
import { productService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatPrice } from '../../utils/format';
import styles from './Products.module.css';

// Products table with the row actions: edit, activate/deactivate, feature and
// delete. After every change we reload the list, so the table always shows what
// the API really has rather than what we hoped happened.
//
// Every action goes through the confirm dialog and reports back with a toast.
// No window.confirm anywhere.
function Products() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { currency } = useSettings();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Which row is busy (so we can disable just that one), plus a banner for
  // whatever failed.
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

  // Ask first, then do it. The dialog handles its own loading state and stays
  // open with the error if it fails; we handle marking the row busy, reloading
  // the list and the success toast.
  const confirmRowAction = (product, { successMessage, run, ...dialog }) =>
    confirm({
      ...dialog,
      onConfirm: async () => {
        setBusyId(product.id);
        setActionError('');

        try {
          await run();
        } catch (err) {
          // Toast the error AND re-throw it, so the dialog stays open with the
          // same message and you can just try again.
          setBusyId(null);
          toast.error(err?.message || 'The action could not be completed.');
          throw err;
        }

        try {
          await load();
        } catch (err) {
          // The change worked, it was only the reload that failed.
          setActionError(err.message || 'The list could not be refreshed.');
        } finally {
          setBusyId(null);
        }

        toast.success(successMessage);
      },
    });

  const handleToggleActive = (product) =>
    confirmRowAction(product, {
      title: product.isActive ? 'Deactivate this product?' : 'Activate this product?',
      message: product.isActive
        ? `"${product.name}" will be hidden from the storefront. Existing orders are not affected.`
        : `"${product.name}" will be visible on the storefront again.`,
      confirmLabel: product.isActive ? 'Mark as inactive' : 'Mark as active',
      run: () => productService.update(product.id, { isActive: !product.isActive }),
      successMessage: product.isActive
        ? `"${product.name}" marked as inactive.`
        : `"${product.name}" marked as active.`,
    });

  const handleToggleFeatured = (product) =>
    confirmRowAction(product, {
      title: product.isFeatured ? 'Remove from featured?' : 'Feature this product?',
      message: product.isFeatured
        ? `"${product.name}" will no longer headline the storefront.`
        : `"${product.name}" will headline the storefront.`,
      // Only one product can be featured at a time (enforced by the backend).
      warning: product.isFeatured
        ? undefined
        : 'Only one product can be featured at a time, so the product currently featured will be unfeatured.',
      confirmLabel: product.isFeatured ? 'Unfeature' : 'Mark as featured',
      run: () => productService.update(product.id, { isFeatured: !product.isFeatured }),
      successMessage: product.isFeatured
        ? `"${product.name}" is no longer featured.`
        : `"${product.name}" marked as featured.`,
    });

  const handleDelete = (product) =>
    confirmRowAction(product, {
      title: 'Delete this product?',
      message: `"${product.name}" will be removed from the storefront.`,
      // It is a soft delete — the product is deactivated, not removed, so old
      // orders still point at something. Worth saying so we do not scare anyone.
      warning:
        'This is a soft delete: the product is deactivated and unfeatured, never erased, so past orders keep their history. You can reactivate it later.',
      confirmLabel: 'Delete product',
      tone: 'danger',
      run: () => productService.remove(product.id),
      successMessage: `"${product.name}" deleted (deactivated).`,
    });

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
                      <td>{formatPrice(product.basePrice, currency)}</td>
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
                      {/*
                        One action group per row: same size, same spacing, all
                        on one line. Delete carries the danger tone so it reads
                        as distinct without shouting, and the whole group is
                        disabled while that row's action is in flight.
                      */}
                      <td className={styles.actionsCell}>
                        <div
                          className={styles.actions}
                          role="group"
                          aria-label={`Actions for ${product.name}`}
                          aria-busy={isBusy}
                        >
                          <Button
                            variant="secondary"
                            className={styles.actionButton}
                            disabled={isBusy}
                            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          >
                            <span aria-hidden="true">✎</span>
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="secondary"
                            className={styles.actionButton}
                            disabled={isBusy}
                            onClick={() => handleToggleFeatured(product)}
                          >
                            <span aria-hidden="true">★</span>
                            <span>{product.isFeatured ? 'Unfeature' : 'Feature'}</span>
                          </Button>
                          <Button
                            variant="secondary"
                            className={styles.actionButton}
                            disabled={isBusy}
                            onClick={() => handleToggleActive(product)}
                          >
                            <span aria-hidden="true">{product.isActive ? '⏻' : '✓'}</span>
                            <span>{product.isActive ? 'Deactivate' : 'Activate'}</span>
                          </Button>
                          <Button
                            variant="danger"
                            className={styles.actionButton}
                            disabled={isBusy}
                            onClick={() => handleDelete(product)}
                          >
                            <span aria-hidden="true">🗑</span>
                            <span>Delete</span>
                          </Button>
                        </div>
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
