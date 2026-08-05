import { useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { useConfirm } from '../../components/ConfirmModal/ConfirmProvider';
import { useToast } from '../../components/Toast/ToastProvider';
import { productService, variantService } from '../../services';
import styles from './VariantManager.module.css';

// Same Decimal rule the API applies to an optional variant price override.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

const EMPTY_VARIANT = { label: '', price: '', stock: '0' };

/**
 * Validate the shared variant fields. `label` is required; `price` is an
 * optional positive-decimal override; `stock` must be a non-negative integer.
 * Returns a map of field -> message (empty when valid).
 */
function validateVariant({ label, price, stock }) {
  const errors = {};

  if (!label.trim()) errors.label = 'Label is required.';

  const priceValue = price.trim();
  if (priceValue !== '' && (!DECIMAL_PATTERN.test(priceValue) || Number(priceValue) <= 0)) {
    errors.price = 'Price must be a positive number, or left empty.';
  }

  const stockValue = stock.trim();
  if (stockValue === '' || !/^\d+$/.test(stockValue)) {
    errors.stock = 'Stock must be a non-negative integer.';
  }

  return errors;
}

// Build the request payload from the form fields: empty price clears the
// override (null); stock is sent as a real number as the API requires.
function toPayload({ label, price, stock }) {
  return {
    label: label.trim(),
    price: price.trim() === '' ? null : price.trim(),
    stock: Number(stock),
  };
}

/**
 * Manage a product's variants inline within the edit view: list them and
 * add / edit / delete, each persisting through the variant service. After any
 * mutation the variants are re-fetched from the product so the panel mirrors
 * the real API state. Every call has its own loading and error handling.
 */
function VariantManager({ productId, initialVariants }) {
  const confirm = useConfirm();
  const toast = useToast();

  const [variants, setVariants] = useState(initialVariants);
  const [reloadError, setReloadError] = useState('');

  // Add form.
  const [addForm, setAddForm] = useState(EMPTY_VARIANT);
  const [addErrors, setAddErrors] = useState({});
  const [addServerError, setAddServerError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Inline edit (one row at a time).
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_VARIANT);
  const [editErrors, setEditErrors] = useState({});
  const [editServerError, setEditServerError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete.
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState('');

  // Re-fetch the parent product and take its fresh variant list.
  const reloadVariants = async () => {
    setReloadError('');
    try {
      const product = await productService.getById(productId);
      setVariants(product.variants ?? []);
    } catch (err) {
      setReloadError(err.message || 'Unable to refresh variants.');
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setAddServerError('');

    const errors = validateVariant(addForm);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsAdding(true);
    try {
      await variantService.add(productId, toPayload(addForm));
      setAddForm(EMPTY_VARIANT);
      setAddErrors({});
      await reloadVariants();
    } catch (err) {
      setAddServerError(err.message || 'The variant could not be added.');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (variant) => {
    setEditingId(variant.id);
    setEditForm({
      label: variant.label ?? '',
      price: variant.price ?? '',
      stock: String(variant.stock ?? 0),
    });
    setEditErrors({});
    setEditServerError('');
    setRowError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditErrors({});
    setEditServerError('');
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setEditServerError('');

    const errors = validateVariant(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingEdit(true);
    try {
      await variantService.update(editingId, toPayload(editForm));
      // Refresh first, then leave edit mode, so the row swaps straight to the
      // saved values instead of briefly flashing the previous ones.
      await reloadVariants();
      setEditingId(null);
    } catch (err) {
      setEditServerError(err.message || 'The variant could not be saved.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = (variant) =>
    confirm({
      title: 'Delete this variant?',
      message: `"${variant.label}" will be removed from this product.`,
      warning: 'Its remaining stock is removed with it. Past orders keep their own snapshot.',
      confirmLabel: 'Delete variant',
      tone: 'danger',
      onConfirm: async () => {
        setBusyId(variant.id);
        setRowError('');

        try {
          await variantService.remove(variant.id);
        } catch (err) {
          setBusyId(null);
          toast.error(err?.message || 'The variant could not be deleted.');
          throw err; // keeps the dialog open with the backend message too
        }

        try {
          await reloadVariants();
        } finally {
          setBusyId(null);
        }

        toast.success(`Variant "${variant.label}" deleted.`);
      },
    });

  return (
    <Card title="Variants" className={styles.card}>
      {reloadError && (
        <p className={styles.error} role="alert">
          {reloadError}
        </p>
      )}
      {rowError && (
        <p className={styles.error} role="alert">
          {rowError}
        </p>
      )}

      {variants.length === 0 ? (
        <p>No variants yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Price</th>
                <th>Stock</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) =>
                editingId === variant.id ? (
                  <tr key={variant.id}>
                    <td>
                      <input
                        className={styles.input}
                        type="text"
                        aria-label="Variant label"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        disabled={isSavingEdit}
                      />
                      {editErrors.label && (
                        <span className={styles.fieldError}>{editErrors.label}</span>
                      )}
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="decimal"
                        placeholder="(base)"
                        aria-label="Variant price"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        disabled={isSavingEdit}
                      />
                      {editErrors.price && (
                        <span className={styles.fieldError}>{editErrors.price}</span>
                      )}
                    </td>
                    <td>
                      <input
                        className={styles.inputNarrow}
                        type="text"
                        inputMode="numeric"
                        aria-label="Variant stock"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        disabled={isSavingEdit}
                      />
                      {editErrors.stock && (
                        <span className={styles.fieldError}>{editErrors.stock}</span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                        {isSavingEdit ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="ghost" onClick={cancelEdit} disabled={isSavingEdit}>
                        Cancel
                      </Button>
                      {editServerError && (
                        <span className={styles.fieldError}>{editServerError}</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr key={variant.id}>
                    <td>{variant.label}</td>
                    <td>{variant.price ?? <span className={styles.muted}>base</span>}</td>
                    <td>{variant.stock}</td>
                    <td className={styles.actions}>
                      <Button
                        variant="secondary"
                        onClick={() => startEdit(variant)}
                        disabled={busyId === variant.id || editingId !== null}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(variant)}
                        disabled={busyId === variant.id || editingId !== null}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <form className={styles.addForm} onSubmit={handleAdd}>
        <h4 className={styles.addTitle}>Add variant</h4>
        <div className={styles.addRow}>
          <label className={styles.addField}>
            Label
            <input
              className={styles.input}
              type="text"
              value={addForm.label}
              onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
              disabled={isAdding}
            />
            {addErrors.label && <span className={styles.fieldError}>{addErrors.label}</span>}
          </label>
          <label className={styles.addField}>
            Price <span className={styles.muted}>(optional)</span>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="(base)"
              value={addForm.price}
              onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
              disabled={isAdding}
            />
            {addErrors.price && <span className={styles.fieldError}>{addErrors.price}</span>}
          </label>
          <label className={styles.addField}>
            Stock
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={addForm.stock}
              onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
              disabled={isAdding}
            />
            {addErrors.stock && <span className={styles.fieldError}>{addErrors.stock}</span>}
          </label>
        </div>
        {addServerError && (
          <p className={styles.error} role="alert">
            {addServerError}
          </p>
        )}
        <Button type="submit" disabled={isAdding}>
          {isAdding ? 'Adding…' : 'Add variant'}
        </Button>
      </form>
    </Card>
  );
}

export default VariantManager;
