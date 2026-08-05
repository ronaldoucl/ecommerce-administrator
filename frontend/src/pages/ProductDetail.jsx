import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import Button from '../components/Button/Button';
import ProductGallery from '../components/ProductGallery/ProductGallery';
import { useToast } from '../components/Toast/ToastProvider';
import { productService } from '../services';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { formatPrice, parsePrice, placeholderImage } from '../utils/format';
import styles from './ProductDetail.module.css';

// The product page: gallery, description, benefits, price and the variant
// picker. Choosing a variant updates the price and the stock shown.
//
// Adding to the cart does NOT navigate away — you get a toast with a thumbnail
// and a "View cart" link, so you can keep browsing.
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { currency } = useSettings();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setNotFound(false);

    try {
      const data = await productService.getById(id);
      setProduct(data);
      // Pick the first variant automatically, so there is a price on screen
      // straight away instead of a blank.
      setSelectedVariantId(data.variants?.[0]?.id ?? null);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Unable to load this product.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddToCart = () => {
    if (!product) return;

    const variant = product.variants?.find((v) => v.id === selectedVariantId) ?? null;
    const quantity = 1;
    // The first image is the main one.
    const thumbnail = product.images?.[0]?.url ?? null;

    addItem(
      {
        productId: product.id,
        variantId: variant?.id ?? null,
        label: variant?.label ?? null,
        name: product.name,
        image: thumbnail,
        // Variant price wins; null means fall back to the product price. Run it
        // through parsePrice first, since it arrives as a string.
        unitPrice: parsePrice(variant?.price ?? product.basePrice),
      },
      quantity,
    );

    const name = variant?.label ? `${product.name} — ${variant.label}` : product.name;

    // Same id for the same product+variant, so adding it twice replaces the
    // toast instead of stacking two almost identical ones.
    toast.success(`${name} × ${quantity} added to cart`, {
      id: `cart:${product.id}:${variant?.id ?? 'base'}`,
      image: thumbnail ?? placeholderImage(product.name),
      action: { label: 'View cart', onClick: () => navigate('/cart') },
    });
  };

  if (isLoading) {
    return (
      <section>
        <p role="status">Loading product…</p>
      </section>
    );
  }

  if (notFound) {
    return (
      <section>
        <h1>Product not found</h1>
        <p>The product you are looking for does not exist or is no longer available.</p>
        <Button as={Link} to="/">
          Back to store
        </Button>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={load}>
          Retry
        </Button>
      </section>
    );
  }

  const images = product.images ?? [];
  const variants = product.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  // The variant's own price overrides the base price; a null override falls back.
  const displayedPrice = selectedVariant?.price ?? product.basePrice;
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : false;

  return (
    <section className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to="/">&larr; Back to store</Link>
      </p>

      <div className={styles.layout}>
        {/* ── Image gallery ─────────────────────────────────────────────── */}
        <ProductGallery images={images} productName={product.name} />

        {/* ── Details ───────────────────────────────────────────────────── */}
        <div className={styles.info}>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.price}>{formatPrice(displayedPrice, currency)}</p>

          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          {product.benefits && (
            <div className={styles.benefits}>
              <h2 className={styles.subheading}>Benefits</h2>
              <p>{product.benefits}</p>
            </div>
          )}

          {/* ── Variant selector ────────────────────────────────────────── */}
          {variants.length > 0 && (
            <div className={styles.variants}>
              <h2 className={styles.subheading}>Options</h2>
              <div className={styles.variantList} role="group" aria-label="Variants">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={
                      variant.id === selectedVariantId ? styles.variantActive : styles.variant
                    }
                    onClick={() => setSelectedVariantId(variant.id)}
                    aria-pressed={variant.id === selectedVariantId}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>

              <p className={styles.stock}>
                {isOutOfStock ? (
                  <span className={styles.outOfStock}>Out of stock</span>
                ) : (
                  <>In stock: {selectedVariant.stock}</>
                )}
              </p>
            </div>
          )}

          <div className={styles.actions}>
            {/*
              The result is confirmed by a toast (thumbnail + "View cart"), so
              nothing here interrupts browsing after an add.
            */}
            <Button type="button" onClick={handleAddToCart} disabled={isOutOfStock}>
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductDetail;
