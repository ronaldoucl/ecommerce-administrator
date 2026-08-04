import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../components/Button/Button';
import { productService } from '../services';
import { useSettings } from '../context/SettingsContext';
import { formatPrice, placeholderImage } from '../utils/format';
import styles from './Storefront.module.css';

/**
 * Public storefront landing page.
 *
 * The intro block (store name and main text) comes from the store settings via
 * SettingsContext, and the same settings supply the currency every price is
 * rendered in.
 *
 * The featured section is populated from GET /api/products/featured via
 * `productService.getFeatured()`. The store enforces one featured product at a
 * time, so that product headlines the page; should the endpoint ever return
 * more, the extras fill the "More products" grid. There is no public
 * catalogue endpoint, so the grid is sourced from the same featured payload.
 */
function Storefront() {
  const { storeName, mainText, currency } = useSettings();
  const [featured, setFeatured] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // `notFound` is the graceful "no featured product yet" case (API 404); it is
  // kept separate from `error`, which signals an actual failure worth retrying.
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setNotFound(false);

    try {
      const products = await productService.getFeatured();
      setFeatured(products);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Unable to load the featured product.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [hero, ...more] = featured;

  return (
    <div className={styles.page}>
      {/* ── Store intro (from settings) ──────────────────────────────────── */}
      <section className={styles.intro}>
        <h1 className={styles.storeName}>{storeName}</h1>
        {mainText && <p className={styles.mainText}>{mainText}</p>}
      </section>

      {/* ── Featured product ─────────────────────────────────────────────── */}
      <section aria-labelledby="featured-heading" className={styles.featuredSection}>
        <h2 id="featured-heading" className={styles.sectionTitle}>
          Featured product
        </h2>

        {isLoading ? (
          <p role="status">Loading featured product…</p>
        ) : error ? (
          <div role="alert">
            <p className={styles.error}>{error}</p>
            <Button variant="secondary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : notFound || !hero ? (
          <p className={styles.empty}>No featured product right now. Please check back soon.</p>
        ) : (
          <FeaturedProduct product={hero} currency={currency} />
        )}
      </section>

      {/* ── More products ────────────────────────────────────────────────── */}
      {more.length > 0 && (
        <section aria-labelledby="catalog-heading" className={styles.catalogSection}>
          <h2 id="catalog-heading" className={styles.sectionTitle}>
            More products
          </h2>

          <ul className={styles.grid}>
            {more.map((product) => (
              <li key={product.id} className={styles.gridItem}>
                <ProductCard product={product} currency={currency} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The headline featured product: image, name, description, price and a CTA. */
function FeaturedProduct({ product, currency }) {
  const image = product.images?.[0];

  return (
    <div className={styles.featured}>
      <div className={styles.media}>
        <img
          className={styles.image}
          src={image?.url || placeholderImage(product.name)}
          alt={image?.alt || product.name}
          width="800"
          height="800"
        />
        <span className={styles.badge}>Featured</span>
      </div>

      <div className={styles.details}>
        <h3 className={styles.productTitle}>{product.name}</h3>
        {product.description && <p className={styles.productDesc}>{product.description}</p>}
        <p className={styles.price}>{formatPrice(product.basePrice, currency)}</p>

        <div className={styles.actions}>
          <Button as={Link} to={`/product/${product.id}`}>
            View product
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Compact product card used in the "More products" grid. */
function ProductCard({ product, currency }) {
  const image = product.images?.[0];

  return (
    <article className={styles.card}>
      <img
        className={styles.cardImage}
        src={image?.url || placeholderImage(product.name)}
        alt={image?.alt || product.name}
        width="400"
        height="400"
      />
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{product.name}</h3>
        <p className={styles.cardPrice}>{formatPrice(product.basePrice, currency)}</p>
        <Button as={Link} to={`/product/${product.id}`} variant="secondary" className={styles.cardCta}>
          View
        </Button>
      </div>
    </article>
  );
}

export default Storefront;
