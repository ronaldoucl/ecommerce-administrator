import { Link, Outlet } from 'react-router-dom';
import Button from '../Button/Button';
import BackendStatus from '../BackendStatus/BackendStatus';
import styles from './Layout.module.css';

/**
 * Public storefront shell: a header (logo placeholder + store name + cart
 * access button) and a footer (contact info) wrapped around the routed page
 * content. The base theme is applied globally, so any page rendered inside
 * this Layout inherits the palette and typography.
 *
 * Rendered as a route layout element; pages appear where <Outlet /> is placed.
 */

// Sprint 2: replace these placeholders with the real store configuration
// loaded from GET /api/settings (store name, contact info, branding/logo).
const STORE_NAME = 'Aurora Store';
const CONTACT_EMAIL = 'support@example.com';
const CONTACT_PHONE = '+1 555 0100';
const CONTACT_ADDRESS = '123 Market Street, Springfield';

function Layout() {
  const currentYear = new Date().getFullYear();

  // Sprint 2: replace with the live item count from CartContext.
  const cartItemCount = 0;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Logo placeholder + store name (links home) */}
          <Link to="/" className={styles.brand} aria-label={`${STORE_NAME} — home`}>
            <span className={styles.logo} aria-hidden="true">
              {STORE_NAME.charAt(0)}
            </span>
            <span className={styles.brandName}>{STORE_NAME}</span>
          </Link>

          {/* Cart access button */}
          <Button
            as={Link}
            to="/cart"
            variant="secondary"
            className={styles.cartButton}
            aria-label={`View cart (${cartItemCount} items)`}
          >
            <span aria-hidden="true">🛒</span>
            <span>Cart</span>
            <span className={styles.cartCount} aria-hidden="true">
              {cartItemCount}
            </span>
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          {/* Contact info placeholder (Sprint 2: from store settings) */}
          <address className={styles.contact}>
            <strong className={styles.contactStore}>{STORE_NAME}</strong>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>{CONTACT_PHONE}</a>
            <span>{CONTACT_ADDRESS}</span>
          </address>

          <div className={styles.footerMeta}>
            {/* Backend connectivity indicator (deployed FE -> deployed BE). */}
            <BackendStatus />
            <p className={styles.footerText}>
              &copy; {currentYear} {STORE_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
