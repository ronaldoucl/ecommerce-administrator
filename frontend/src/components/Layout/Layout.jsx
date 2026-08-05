import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../Button/Button';
import MobileMenu from '../MobileMenu/MobileMenu';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { brandStyle } from '../../utils/branding';
import styles from './Layout.module.css';

/** Storefront navigation, shared by the desktop bar and the mobile drawer. */
const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/cart', label: 'Cart' },
];

/**
 * Public storefront shell: a header (logo + store name + navigation + cart
 * access) and a footer (contact info) wrapped around the routed page content.
 * The base theme is applied globally, so any page rendered inside this Layout
 * inherits the palette and typography.
 *
 * Store name, contact info and branding come from the store settings
 * (GET /api/settings via SettingsContext), so an admin change is reflected here
 * on the next load. Branding carries a logo URL and/or a primary colour: the
 * colour is applied as a local CSS variable override (see brandStyle), so it
 * recolours every component inside the shell without touching the global theme.
 *
 * Below the header breakpoint the navigation collapses into the shared
 * <MobileMenu> hamburger; the cart button stays visible so it is always one tap
 * away.
 */
function Layout() {
  const currentYear = new Date().getFullYear();

  // Live item count from the cart, shown in the header indicator.
  const { itemCount: cartItemCount } = useCart();

  const { storeName, contactInfo, branding } = useSettings();

  // A configured logo that fails to load must never leave a broken-image icon:
  // the store initial takes over instead.
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(branding.logoUrl) && !logoFailed;

  const linkClass = ({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink);

  return (
    <div className={styles.shell} style={brandStyle(branding.primaryColor)}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Branding logo when configured, otherwise the store initial */}
          <Link to="/" className={styles.brand} aria-label={`${storeName} — home`}>
            {showLogo ? (
              <img
                className={styles.logoImage}
                src={branding.logoUrl}
                alt=""
                width="36"
                height="36"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className={styles.logo} aria-hidden="true">
                {storeName.charAt(0)}
              </span>
            )}
            <span className={styles.brandName}>{storeName}</span>
          </Link>

          {/* Desktop navigation — replaced by the hamburger on small screens. */}
          <nav className={styles.nav} aria-label="Store">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.headerActions}>
            {/* Cart access button */}
            <Button
              as={Link}
              to="/cart"
              variant="secondary"
              className={styles.cartButton}
              aria-label={`View cart (${cartItemCount} items)`}
            >
              <span aria-hidden="true">🛒</span>
              <span className={styles.cartLabel}>Cart</span>
              <span className={styles.cartCount} aria-hidden="true">
                {cartItemCount}
              </span>
            </Button>

            <MobileMenu label="Main menu" title="Menu" className={styles.menuToggle}>
              <nav className={styles.drawerNav} aria-label="Store">
                {NAV_ITEMS.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClass}>
                    {label}
                  </NavLink>
                ))}
                <Link to="/admin/dashboard" className={styles.navLink}>
                  Admin
                </Link>
              </nav>
            </MobileMenu>
          </div>
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
