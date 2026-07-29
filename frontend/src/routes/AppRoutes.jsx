import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from '../components/Layout/Layout';
import AdminLayout from '../components/AdminLayout/AdminLayout';
import ProtectedRoute from './ProtectedRoute';

// Public pages
import Storefront from '../pages/Storefront';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Confirmation from '../pages/Confirmation';

// Admin pages
import Login from '../pages/admin/Login';
import Dashboard from '../pages/admin/Dashboard';
import Products from '../pages/admin/Products';
import ProductForm from '../pages/admin/ProductForm';
import Orders from '../pages/admin/Orders';
import OrderDetail from '../pages/admin/OrderDetail';
import Settings from '../pages/admin/Settings';

/**
 * Central route configuration.
 *
 * Public routes are wrapped in the storefront Layout (header + footer).
 * Admin routes live under /admin: the login page is public, while the
 * remaining pages are wrapped in AdminLayout and guarded by ProtectedRoute.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public storefront */}
      <Route element={<Layout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/confirmation/:reference" element={<Confirmation />} />
      </Route>

      {/* Admin: public login */}
      <Route path="/admin/login" element={<Login />} />

      {/* Admin: protected area */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback: unknown routes redirect to the storefront */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
