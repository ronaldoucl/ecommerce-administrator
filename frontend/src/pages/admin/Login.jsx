import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

/**
 * Admin login page. Submits the credentials through AuthContext, which stores
 * the JWT and hydrates the user; on success the admin area is opened, and a
 * rejected login (401) is shown inline using the normalized `{ message }`.
 */
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where the visitor was heading before the guard sent them here.
  const redirectTo = location.state?.from?.pathname || '/admin';

  // Restoring a session: wait instead of flashing the form to a signed-in user.
  if (isLoading) {
    return <p role="status">Loading…</p>;
  }

  // Already signed in (e.g. opened /admin/login directly): skip the form.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <h1>Admin login</h1>
      <p className={styles.subtitle}>Sign in to manage products and orders.</p>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.field} htmlFor="email">
            Email
            <input
              id="email"
              className={styles.input}
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              required
              disabled={isSubmitting}
            />
          </label>

          <label className={styles.field} htmlFor="password">
            Password
            <input
              id="password"
              className={styles.input}
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </section>
  );
}

export default Login;
