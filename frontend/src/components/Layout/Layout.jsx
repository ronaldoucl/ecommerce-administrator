import { Link, NavLink, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

/**
 * Application shell: header (brand + primary navigation) and footer wrapped
 * around the routed page content. The base theme is applied globally, so any
 * page rendered inside this Layout inherits the palette and typography.
 *
 * Rendered as a route layout element; pages appear where <Outlet /> is placed.
 */
function Layout() {
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            Shop<span className={styles.brandAccent}>Admin</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
            >
              Storefront
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
            >
              Cart
            </NavLink>
            <NavLink
              to="/admin/login"
              className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
            >
              Admin
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.footerText}>
            &copy; {currentYear} ShopAdmin — E-commerce Management System.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
