import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import ImageManager, {
  imageUrlError,
  toImagePayload,
} from '../../components/ImageManager/ImageManager';
import { useToast } from '../../components/Toast/ToastProvider';
import { productService } from '../../services';
import VariantManager from './VariantManager';
import styles from './ProductForm.module.css';

// What the API accepts as a price: "49" or "49.90".
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

const EMPTY_FORM = {
  name: '',
  description: '',
  benefits: '',
  basePrice: '',
  isActive: true,
  isFeatured: false,
  // Create mode only: the first variant. Stock lives on variants, so a product
  // is not sellable until it has one with stock. Leaving the label empty means
  // "sold without options" and the backend labels it for us.
  initialStock: '',
  initialVariantLabel: '',
};

const INTEGER_PATTERN = /^\d+$/;

// Handles both /admin/products/new and /admin/products/:id/edit — if there is an
// id in the URL we are editing, otherwise we are creating.
//
// Editing also shows <VariantManager> inline. The gallery goes through
// <ImageManager> and is sent as an ordered array where the first image is the
// main one.
function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  // The gallery rows live apart from the normal fields: [{ url, alt }, ...].
  const [images, setImages] = useState([]);
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
        ...EMPTY_FORM,
        name: product.name ?? '',
        description: product.description ?? '',
        benefits: product.benefits ?? '',
        basePrice: product.basePrice ?? '',
        isActive: Boolean(product.isActive),
        isFeatured: Boolean(product.isFeatured),
      });
      setImages(
        (product.images ?? []).map((image) => ({ url: image.url ?? '', alt: image.alt ?? '' })),
      );
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

  // Same checks the server does, just sooner.
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

    // Blank rows just get dropped; anything typed has to be a real URL.
    if (images.some((image) => imageUrlError(image.url))) {
      errors.images = 'Every image row must hold a full http(s) URL, or be removed.';
    }

    // Only on create: the product needs its first variant to be sellable.
    if (!isEdit) {
      const stock = form.initialStock.trim();
      if (!stock) {
        errors.initialStock = 'Stock is required.';
      } else if (!INTEGER_PATTERN.test(stock)) {
        errors.initialStock = 'Stock must be a whole number, 0 or more.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSavedMessage('');

    if (!validate()) return;

    // null clears the column; "" would just store an empty string.
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      benefits: form.benefits.trim() === '' ? null : form.benefits.trim(),
      basePrice: form.basePrice.trim(),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      // Order matters: the backend rebuilds the gallery to match this list and
      // the first one becomes the main image.
      images: toImagePayload(images),
    };

    if (!isEdit) {
      const label = form.initialVariantLabel.trim();
      payload.initialVariant = {
        stock: Number(form.initialStock.trim()),
        // No label: the backend uses its default one and the storefront shows no
        // option picker.
        ...(label === '' ? {} : { label }),
      };
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        const updated = await productService.update(id, payload);
        // Pull the saved ids and order back into the editor.
        setImages(
          (updated.images ?? []).map((image) => ({ url: image.url ?? '', alt: image.alt ?? '' })),
        );
        setSavedMessage('Product saved.');
        toast.success('Product saved.');
      } else {
        const created = await productService.create(payload);
        toast.success(`"${created.name}" created.`);
        // Switch to edit mode so you can add variants right away.
        navigate(`/admin/products/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      const message = err.message || 'The product could not be saved.';
      setSubmitError(message);
      toast.error(message);
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

          {/*
            Create mode only. Stock is kept on variants, so a new product needs
            one straight away — otherwise it goes live out of stock. In edit mode
            <VariantManager> below takes over.
          */}
          {!isEdit && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Inventory</span>
              <p className={styles.hint}>
                Stock is tracked per variant. Leave the option name empty if this product is
                sold without options — you can add sizes or colours after creating it.
              </p>

              <label className={styles.field} htmlFor="initialStock">
                Stock
                <input
                  id="initialStock"
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  placeholder="10"
                  value={form.initialStock}
                  onChange={(event) => setField('initialStock', event.target.value)}
                  disabled={isSubmitting}
                />
                {fieldErrors.initialStock && (
                  <span className={styles.fieldError}>{fieldErrors.initialStock}</span>
                )}
              </label>

              <label className={styles.field} htmlFor="initialVariantLabel">
                Option name <span className={styles.optional}>(optional)</span>
                <input
                  id="initialVariantLabel"
                  className={styles.input}
                  type="text"
                  placeholder="e.g. M / Black"
                  value={form.initialVariantLabel}
                  onChange={(event) => setField('initialVariantLabel', event.target.value)}
                  disabled={isSubmitting}
                />
              </label>
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Images</span>
            <ImageManager images={images} onChange={setImages} disabled={isSubmitting} />
            {fieldErrors.images && (
              <span className={styles.fieldError}>{fieldErrors.images}</span>
            )}
          </div>

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
