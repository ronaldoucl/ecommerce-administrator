import { Link } from 'react-router-dom';
import Button from '../components/Button/Button';
// TEMPORARY (S1-SHARED-04): end-to-end backend connectivity check.
// Remove this import and the <BackendStatus /> block below after Sprint 1.
import BackendStatus from '../components/BackendStatus/BackendStatus';
import styles from './Storefront.module.css';

/**
 * Public storefront landing page.
 *
 * This ticket (S1-RON-03) builds the structure and responsive layout with
 * PLACEHOLDER content only — no API calls. In Sprint 2 the featured product and
 * the product grid are populated from GET /api/products/featured via
 * `productService` (see the "Sprint 2" comments below for the exact injection
 * points).
 */

/** Inline SVG placeholder image (no network/asset dependency). */
const placeholderImage = (label) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">` +
      `<rect width="100%" height="100%" fill="#eef2ff"/>` +
      `<text x="50%" y="50%" font-family="sans-serif" font-size="40" fill="#4f46e5" ` +
      `text-anchor="middle" dominant-baseline="middle">${label}</text>` +
      `</svg>`,
  );

// Sprint 2: remove this static list; render the array returned by
// productService.getFeatured() instead.
const placeholderProducts = Array.from({ length: 8 }, (_, i) => i + 1);

function Storefront() {
  return (
    <div className={styles.page}>
      {/* TEMPORARY (S1-SHARED-04): backend connectivity indicator — remove after Sprint 1. */}
      <div className={styles.backendStatus}>
        <BackendStatus />
      </div>

      {/* ── Featured product ─────────────────────────────────────────────── */}
      <section aria-labelledby="featured-heading" className={styles.featuredSection}>
        <h1 id="featured-heading" className={styles.sectionTitle}>
          Featured product
        </h1>

        <div className={styles.featured}>
          <div className={styles.media}>
            {/* Sprint 2: use the real image -> product.images[0].url / .alt */}
            <img
              className={styles.image}
              src={placeholderImage('Featured product')}
              alt="Placeholder image of the featured product"
              width="800"
              height="800"
            />
            <span className={styles.badge}>Featured</span>
          </div>

          <div className={styles.details}>
            {/* Sprint 2: real title -> product.name */}
            <h2 className={styles.productTitle}>Product name placeholder</h2>

            {/* Sprint 2: real copy -> product.description / product.benefits */}
            <p className={styles.productDesc}>
              A short placeholder description of the featured product. Real copy is
              injected in Sprint 2 from the product data.
            </p>

            {/* Sprint 2: real price -> product.basePrice, formatted with the store currency */}
            <p className={styles.price}>$00.00</p>

            <div className={styles.actions}>
              {/* Sprint 2: link to /product/{product.id} */}
              <Button as={Link} to="/product/1">
                View product
              </Button>
              <Button as={Link} to="/cart" variant="secondary">
                Add to cart
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── More products (responsive base grid) ─────────────────────────── */}
      <section aria-labelledby="catalog-heading" className={styles.catalogSection}>
        <h2 id="catalog-heading" className={styles.sectionTitle}>
          More products
        </h2>

        {/* Sprint 2: replace the placeholder list with the fetched products. */}
        <ul className={styles.grid}>
          {placeholderProducts.map((n) => (
            <li key={n} className={styles.gridItem}>
              <article className={styles.card}>
                <img
                  className={styles.cardImage}
                  src={placeholderImage(`Product ${n}`)}
                  alt={`Placeholder image of product ${n}`}
                  width="400"
                  height="400"
                />
                <div className={styles.cardBody}>
                  {/* Sprint 2: product.name */}
                  <h3 className={styles.cardTitle}>Product {n}</h3>
                  {/* Sprint 2: product.basePrice */}
                  <p className={styles.cardPrice}>$00.00</p>
                  <Button
                    as={Link}
                    to={`/product/${n}`}
                    variant="secondary"
                    className={styles.cardCta}
                  >
                    View
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Storefront;
