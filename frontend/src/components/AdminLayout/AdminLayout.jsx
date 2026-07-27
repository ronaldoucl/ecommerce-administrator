import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import { useAuth } from '../../context/AuthContext';

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
 * On narrow screens the sidebar collapses behind a menu button in a top bar,
 * so the shell stays usable without horizontal scrolling on mobile.
 */
function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? styles.linkActive : styles.link);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      {/* Mobile top bar: brand + menu toggle. Hidden on wide screens. */}
      <header className={styles.topbar}>
        <Link to="/admin/dashboard" className={styles.brand} onClick={closeMenu}>
          ShopAdmin
        </Link>
        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls="admin-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <aside id="admin-nav" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <Link to="/admin/dashboard" className={styles.brandDesktop} onClick={closeMenu}>
          ShopAdmin
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={closeMenu}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.account}>
          {user?.email && <p className={styles.accountEmail}>{user.email}</p>}
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out
          </button>
          <Link to="/" className={styles.backLink} onClick={closeMenu}>
            &larr; Back to store
          </Link>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
