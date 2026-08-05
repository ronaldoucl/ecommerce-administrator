import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import MobileMenu from '../MobileMenu/MobileMenu';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { brandStyle } from '../../utils/branding';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/settings', label: 'Settings' },
];

/**
 * Layout for the authenticated admin area: a sidebar with section navigation,
 * the signed-in account with a logout control, and an outlet for the active
 * admin page. Used as the layout route wrapping the protected /admin/* pages.
 *
 * On narrow screens the sidebar is replaced by a top bar whose hamburger opens
 * the SAME accessible drawer the storefront uses (<MobileMenu>): focus trapped,
 * ESC / backdrop / link click all close it, focus returns to the button.
 *
 * The store branding (logo and primary colour) is applied here too, so the
 * admin shell matches the storefront it configures.
 */
function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? styles.linkActive : styles.link);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { storeName, branding } = useSettings();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  // The links and the account block are identical in the sidebar and in the
  // drawer, so they are built once here and rendered in both places.
  const navLinks = NAV_ITEMS.map(({ to, label }) => (
    <NavLink key={to} to={to} className={linkClass}>
      {label}
    </NavLink>
  ));

  const accountBlock = (
    <div className={styles.account}>
      {user?.email && <p className={styles.accountEmail}>{user.email}</p>}
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Log out
      </button>
      <Link to="/" className={styles.backLink}>
        &larr; Back to store
      </Link>
    </div>
  );

  const brandContent = (
    <>
      {branding.logoUrl && (
        <img className={styles.brandLogo} src={branding.logoUrl} alt="" width="28" height="28" />
      )}
      <span className={styles.brandName}>{storeName}</span>
    </>
  );

  return (
    <div className={styles.shell} style={brandStyle(branding.primaryColor)}>
      {/* Mobile top bar: brand + hamburger. Hidden on wide screens. */}
      <header className={styles.topbar}>
        <Link to="/admin/dashboard" className={styles.brand}>
          {brandContent}
        </Link>

        <MobileMenu label="Admin menu" title="Admin">
          <nav className={styles.nav} aria-label="Admin">
            {navLinks}
          </nav>
          {accountBlock}
        </MobileMenu>
      </header>

      <aside className={styles.sidebar}>
        <Link to="/admin/dashboard" className={styles.brandDesktop}>
          {brandContent}
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          {navLinks}
        </nav>
        {accountBlock}
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
