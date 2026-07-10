// Analytics service — stubs for a later ticket.
//
// Wraps the `/analytics` endpoints from the API contract (admin dashboard).
//
// import api from './api';

const analyticsService = {
  /**
   * Return aggregated metrics for the admin dashboard.
   * GET /api/analytics/summary (protected)
   */
  async getSummary() {
    // TODO: return (await api.get('/analytics/summary')).data;
    throw new Error('analyticsService.getSummary is not implemented yet');
  },
};

export default analyticsService;
