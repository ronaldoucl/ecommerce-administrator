import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

// Blocks the admin pages unless you are logged in.
//
// The isLoading check matters: while we are still verifying the saved token we
// do not know yet, and redirecting during that moment would throw a logged-in
// user out every single time they refresh the page.
//
// We remember where they were going so login can send them back there.
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
