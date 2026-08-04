import { Link, Outlet } from 'react-router-dom';
import Button from '../Button/Button';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import styles from './Layout.module.css';

/**
 * Public storefront shell: a header (logo + store name + cart access button)
 * and a footer (contact info) wrapped around the routed page content. The base
 * theme is applied globally, so any page rendered inside this Layout inherits
 * the palette and typography.
 *
 * Store name, contact info and branding come from the store settings
 * (GET /api/settings via SettingsContext), so an admin change is reflected here
 * on the next load. Branding may carry a logo URL and/or a primary colour: the
 * colour is applied as a local CSS variable override, so it recolours every
 * component inside the shell without touching the global theme.
 */
function Layout() {
  const currentYear = new Date().getFullYear();

  // Live item count from the cart, shown in the header indicator.
  const { itemCount: cartItemCount } = useCart();

  const { storeName, contactInfo, branding } = useSettings();

  const shellStyle = branding.primaryColor
    ? { '--color-primary': branding.primaryColor, '--color-primary-dark': branding.primaryColor }
    : undefined;

  return (
    <div className={styles.shell} style={shellStyle}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Branding logo when configured, otherwise the store initial */}
          <Link to="/" className={styles.brand} aria-label={`${storeName} — home`}>
            {branding.logoUrl ? (
              <img className={styles.logoImage} src={branding.logoUrl} alt="" width="36" height="36" />
            ) : (
              <span className={styles.logo} aria-hidden="true">
                {storeName.charAt(0)}
              </span>
            )}
            <span className={styles.brandName}>{storeName}</span>
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
          <address className={styles.contact}>
            <strong className={styles.contactStore}>{storeName}</strong>
            {contactInfo ? (
              <span>{contactInfo}</span>
            ) : (
              <span>Contact details are not available yet.</span>
            )}
            {branding.text && <span className={styles.tagline}>{branding.text}</span>}
          </address>

          <p className={styles.footerText}>
            &copy; {currentYear} {storeName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
