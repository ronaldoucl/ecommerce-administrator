import api from './api';

/**
 * Authentication service. Wraps the `/auth` endpoints from the API contract.
 */
const authService = {
  /**
   * Authenticate an admin user.
   * POST /api/auth/login (public)
   *
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ token: string, user: { id: number, email: string, role: string } }>}
   */
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  /**
   * Return the currently authenticated user.
   * GET /api/auth/me (protected)
   *
   * @returns {Promise<{ id: number, email: string, role: string, createdAt: string }>}
   */
  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export default authService;
