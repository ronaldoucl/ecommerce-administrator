import api from './api';

const analyticsService = {
  // GET /api/analytics/summary — the five dashboard numbers.
  // simulatedRevenue comes back as a string so the decimals stay exact.
  async getSummary() {
    // Timestamp so the browser cannot serve a cached summary — the dashboard has
    // to show fresh numbers when you reload it. The backend ignores it.
    const { data } = await api.get('/analytics/summary', { params: { _: Date.now() } });
    return data;
  },
};

export default analyticsService;
