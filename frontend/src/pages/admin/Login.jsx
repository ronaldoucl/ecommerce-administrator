import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';

/**
 * Admin login page. Placeholder for S1-RON-01 — the real authentication flow
 * (calling the backend and storing the JWT via AuthContext) arrives in
 * S1-RON-02. For now, submitting simply navigates to the dashboard.
 */
function Login() {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO(S1-RON-02): authenticate against the backend and persist the token.
    navigate('/admin/dashboard');
  };

  return (
    <section style={{ maxWidth: '420px', margin: '0 auto' }}>
      <h1>Admin login</h1>
      <p>Sign in to manage products and orders.</p>

      <Card>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Email
            <input type="email" name="email" placeholder="admin@example.com" required
              style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }} />
          </label>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Password
            <input type="password" name="password" placeholder="••••••••" required
              style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }} />
          </label>
          <Button type="submit">Sign in</Button>
        </form>
      </Card>
    </section>
  );
}

export default Login;
