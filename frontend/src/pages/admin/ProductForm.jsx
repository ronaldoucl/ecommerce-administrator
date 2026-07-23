import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { productService } from '../../services';
import VariantManager from './VariantManager';
import styles from './ProductForm.module.css';

// Monetary strings the API accepts for Decimal fields: "49" or "49.90".
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

const EMPTY_FORM = {
  name: '',
  description: '',
  benefits: '',
  basePrice: '',
  isActive: true,
  isFeatured: false,
};

/**
 * Create / edit a product. The same component serves both `/admin/products/new`
 * and `/admin/products/:id/edit`; the presence of a route `id` decides the mode.
 *
 * In edit mode the current product is loaded to prefill the form and its
 * variants are managed inline through <VariantManager>. Fields are validated on
 * the client before submitting, and server `{ message }` errors are surfaced.
 */
function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [initialVariants, setInitialVariants] = useState([]);

  // Initial product load (edit mode only).
  const [isLoading, setIsLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  // Submit lifecycle.
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const loadProduct = useCallback(async () => {
    if (!isEdit) return;

    setIsLoading(true);
    setLoadError('');

    try {
      const product = await productService.getById(id);
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        benefits: product.benefits ?? '',
        basePrice: product.basePrice ?? '',
        isActive: Boolean(product.isActive),
        isFeatured: Boolean(product.isFeatured),
      });
      setInitialVariants(product.variants ?? []);
    } catch (err) {
      setLoadError(err.message || 'Unable to load the product.');
    } finally {
      setIsLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSavedMessage('');
  };

  // Client-side validation mirroring the server rules for the required fields.
  const validate = () => {
    const errors = {};

    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.description.trim()) errors.description = 'Description is required.';

    const price = form.basePrice.trim();
    if (!price) {
      errors.basePrice = 'Base price is required.';
    } else if (!DECIMAL_PATTERN.test(price) || Number(price) <= 0) {
      errors.basePrice = 'Base price must be a positive number (e.g. 49.90).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSavedMessage('');

    if (!validate()) return;

    // benefits is optional: send null to clear it rather than an empty string.
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      benefits: form.benefits.trim() === '' ? null : form.benefits.trim(),
      basePrice: form.basePrice.trim(),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    };

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await productService.update(id, payload);
        setSavedMessage('Product saved.');
      } else {
        const created = await productService.create(payload);
        // Jump into edit mode so variants can be added to the new product.
        navigate(`/admin/products/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      setSubmitError(err.message || 'The product could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <p role="status">Loading product…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        <p className={styles.error} role="alert">
          {loadError}
        </p>
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={loadProduct}>
            Retry
          </Button>
          <Button variant="ghost" as={Link} to="/admin/products">
            Back to products
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>{isEdit ? 'Edit product' : 'New product'}</h1>
        <Link to="/admin/products">&larr; Back to products</Link>
      </header>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.field} htmlFor="name">
            Name
            <input
              id="name"
              className={styles.input}
              type="text"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
          </label>

          <label className={styles.field} htmlFor="description">
            Description
            <textarea
              id="description"
              className={styles.textarea}
              rows={3}
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.description && (
              <span className={styles.fieldError}>{fieldErrors.description}</span>
            )}
          </label>

          <label className={styles.field} htmlFor="benefits">
            Benefits <span className={styles.optional}>(optional)</span>
            <textarea
              id="benefits"
              className={styles.textarea}
              rows={2}
              value={form.benefits}
              onChange={(event) => setField('benefits', event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className={styles.field} htmlFor="basePrice">
            Base price
            <input
              id="basePrice"
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="49.90"
              value={form.basePrice}
              onChange={(event) => setField('basePrice', event.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.basePrice && (
              <span className={styles.fieldError}>{fieldErrors.basePrice}</span>
            )}
          </label>

          <div className={styles.checkboxes}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField('isActive', event.target.checked)}
                disabled={isSubmitting}
              />
              Active
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setField('isFeatured', event.target.checked)}
                disabled={isSubmitting}
              />
              Featured
            </label>
          </div>

          {submitError && (
            <p className={styles.error} role="alert">
              {submitError}
            </p>
          )}
          {savedMessage && (
            <p className={styles.success} role="status">
              {savedMessage}
            </p>
          )}

          <div className={styles.formActions}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </Button>
            <Button variant="ghost" as={Link} to="/admin/products">
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {isEdit && (
        <VariantManager productId={id} initialVariants={initialVariants} />
      )}
    </section>
  );
}

export default ProductForm;
