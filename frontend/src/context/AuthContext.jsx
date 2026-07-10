/*
 * AuthContext (placeholder for S1-RON-01).
 *
 * Will hold the admin authentication state and expose it to the app:
 *   - the current user / auth status
 *   - the JWT token (persisted so sessions survive reloads)
 *   - login(credentials) and logout() actions that call the auth service
 *
 * ProtectedRoute will consume this context to decide whether to grant access
 * to the admin area. The real provider is implemented in S1-RON-02.
 */

// TODO(S1-RON-02): implement createContext, AuthProvider and a useAuth hook.
export {};
