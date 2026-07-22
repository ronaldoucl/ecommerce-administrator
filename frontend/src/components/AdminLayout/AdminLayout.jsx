import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import { useAuth } from '../../context/AuthContext';

/**
 * Layout for the authenticated admin area: a sidebar with section navigation,
 * the signed-in account with a logout control, and an outlet for the active
 * admin page. Used as the layout route wrapping the protected /admin/* pages.
 */
function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? styles.linkActive : styles.link);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/admin/dashboard" className={styles.brand}>
          ShopAdmin
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/admin/products" className={linkClass}>Products</NavLink>
          <NavLink to="/admin/orders" className={linkClass}>Orders</NavLink>
          <NavLink to="/admin/settings" className={linkClass}>Settings</NavLink>
        </nav>
        <div className={styles.account}>
          {user?.email && <p className={styles.accountEmail}>{user.email}</p>}
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out
          </button>
          <Link to="/" className={styles.backLink}>&larr; Back to store</Link>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
