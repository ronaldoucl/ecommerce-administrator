import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService, AUTH_TOKEN_KEY } from '../services';

/**
 * AuthContext holds the admin authentication state and exposes it to the app:
 *   - `user`, `token` and the derived `isAuthenticated` flag
 *   - `login(email, password)` / `logout()` actions
 *   - `isLoading`, true while the stored session is being restored on start
 *
 * The JWT is persisted in localStorage under the same key the axios instance
 * reads in its request interceptor, so a reload keeps the session alive.
 * ProtectedRoute consumes this context to guard the /admin area.
 */
const AuthContext = createContext(null);

/** Read the persisted token, tolerating environments without localStorage. */
function readStoredToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readStoredToken());
  // Start in a loading state only when there is a token worth validating.
  const [isLoading, setIsLoading] = useState(() => Boolean(readStoredToken()));

  /**
   * Restore the session on start: if a token is stored, ask the backend who it
   * belongs to. An invalid or expired token is discarded so the user is sent
   * back to the login page instead of hitting a half-authenticated state.
   */
  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const currentUser = await authService.me();
        if (cancelled) return;

        setUser(currentUser);
        setToken(storedToken);
      } catch {
        if (cancelled) return;

        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Authenticate against the backend and persist the session.
   * Rejects with the normalized `{ message }` error from the API layer so the
   * caller can render it inline (e.g. 401 "Invalid credentials").
   */
  const login = useCallback(async (email, password) => {
    const { token: newToken, user: loggedUser } = await authService.login({ email, password });

    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(loggedUser);

    return loggedUser;
  }, []);

  /** Clear the session locally (the JWT is stateless, nothing to revoke). */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth state. Must be used inside <AuthProvider>. */
function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export { AuthContext, AuthProvider, useAuth };
