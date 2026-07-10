import api from './api';

/**
 * TEMPORARY health-check helper (S1-RON-02).
 *
 * Calls the backend health endpoint through the shared `api` instance to
 * confirm the frontend is wired to the configured backend. Safe to delete once
 * the connection has been verified.
 *
 * GET /api/health (public) -> { "status": "ok" }
 */
const healthService = {
  async check() {
    const { data } = await api.get('/health');
    return data;
  },
};

export default healthService;
