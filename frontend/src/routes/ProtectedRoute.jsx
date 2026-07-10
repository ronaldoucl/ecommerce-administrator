import { Navigate } from 'react-router-dom';

/**
 * Guards admin routes that require authentication.
 *
 * TODO(S1-RON-02): replace the placeholder check with a real guard backed by
 * AuthContext (verify the stored JWT / auth state). For now access is always
 * allowed so the admin pages can be developed and previewed.
 */
function ProtectedRoute({ children }) {
  // Placeholder: authentication is not yet implemented, so allow access.
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
