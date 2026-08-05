import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../Button/Button';
import MobileMenu from '../MobileMenu/MobileMenu';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { brandStyle } from '../../utils/branding';
import styles from './Layout.module.css';

// Shared by the desktop bar and the mobile drawer, so they never drift apart.
const NAV_ITEMS = [{ to: '/', label: 'Home', end: true }];

// The storefront frame: header with the logo, store name, nav and cart, footer
// with the contact details, and the current page in between.
//
// The name, contact info and branding all come from the store settings, so an
// admin change shows up here on the next load. The brand colour is applied as
// CSS variables on the wrapper (see brandStyle), which repaints everything
// inside without touching the global theme.
//
// On narrow screens the nav collapses into the hamburger, but the cart button
// stays put — it should always be one tap away.
function Layout() {
  const currentYear = new Date().getFullYear();

  // Live item count from the cart, shown in the header indicator.
  const { itemCount: cartItemCount } = useCart();

  const { storeName, contactInfo, branding } = useSettings();

  // If the logo will not load we show the store's initial instead. A broken
  // image icon in the header would look awful.
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
