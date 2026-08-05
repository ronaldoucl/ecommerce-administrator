import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService, AUTH_TOKEN_KEY } from '../services';

// Who is logged in, plus login/logout. ProtectedRoute uses this to guard /admin.
//
// The token is saved in localStorage under the same key api.js reads, so a
// reload keeps you signed in.
const AuthContext = createContext(null);

function readStoredToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readStoredToken());
  // Only show a loading state if there is actually a token to check.
  const [isLoading, setIsLoading] = useState(() => Boolean(readStoredToken()));

  // On startup, ask the backend who the saved token belongs to. If it is expired
  // or bogus we throw it away, so you land on the login page instead of a
  // half-logged-in app.
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

  // Throws the API error straight through so the login page can show it.
  const login = useCallback(async (email, password) => {
    const { token: newToken, user: loggedUser } = await authService.login({ email, password });

    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(loggedUser);

    return loggedUser;
  }, []);

  // Just forget the token — a JWT is stateless, there is nothing to revoke.
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

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export { AuthContext, AuthProvider, useAuth };
