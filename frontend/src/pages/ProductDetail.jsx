import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import Button from '../components/Button/Button';
import { productService } from '../services';
import { useCart } from '../context/CartContext';
import { formatPrice, parsePrice, placeholderImage } from '../utils/format';
import styles from './ProductDetail.module.css';

/**
 * Public product detail page. Loads the product from GET /api/products/:id and
 * renders an image gallery, description, benefits, price and a variant
 * selector. Picking a variant updates the displayed price (the variant's own
 * price when set, otherwise the product base price) and shows its stock.
 */
function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [imageIndex, setImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setNotFound(false);

    try {
      const data = await productService.getById(id);
      setProduct(data);
      setImageIndex(0);
      // Default to the first variant so a price and stock are shown immediately.
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

    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      label: variant?.label ?? null,
      name: product.name,
      image: product.images?.[0]?.url ?? null,
      // The variant price overrides the base price; a null override falls back.
      // Parse the raw Decimal string through the shared helper before storing.
      unitPrice: parsePrice(variant?.price ?? product.basePrice),
    });

    setJustAdded(true);
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
  const mainImage = images[imageIndex];
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
        <div className={styles.gallery}>
          <img
            className={styles.mainImage}
            src={mainImage?.url || placeholderImage(product.name)}
            alt={mainImage?.alt || product.name}
            width="800"
            height="800"
          />

          {images.length > 1 && (
            <ul className={styles.thumbs}>
              {images.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    className={index === imageIndex ? styles.thumbActive : styles.thumb}
                    onClick={() => setImageIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={index === imageIndex}
                  >
                    <img src={image.url} alt={image.alt || `${product.name} thumbnail ${index + 1}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Details ───────────────────────────────────────────────────── */}
        <div className={styles.info}>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.price}>{formatPrice(displayedPrice)}</p>

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
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setJustAdded(false);
                    }}
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
            <Button type="button" onClick={handleAddToCart} disabled={isOutOfStock}>
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
            {justAdded && !isOutOfStock && (
              <p className={styles.added} role="status">
                Added to cart. <Link to="/cart">View cart</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductDetail;
