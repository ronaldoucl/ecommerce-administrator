import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

/**
 * Guards admin routes that require authentication.
 *
 * While the stored session is being restored nothing is decided yet, so a
 * neutral placeholder is rendered — redirecting during that window would kick
 * an authenticated user out on every page refresh. Once resolved, visitors
 * without a session are sent to the login page, remembering where they were
 * heading so they can be returned there after signing in.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p role="status">Loading…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
