import api from './api';

/**
 * Analytics service — wraps the `/analytics` endpoints from the API contract.
 */
const analyticsService = {
  /**
   * Return the aggregated metrics for the admin dashboard.
   * GET /api/analytics/summary (protected — the JWT is attached by the api.js
   * request interceptor, so callers never handle the token themselves).
   *
   * The payload shape is:
   *   {
   *     totalOrders: number,
   *     simulatedRevenue: string,   // Decimal-safe string, e.g. "1499.88"
   *     pendingOrders: number,
   *     bestSellingProduct: { productId, productName, unitsSold } | null,
   *     lowStock: { threshold: number, count: number, items: Array<{
   *       variantId, variantLabel, stock, productId, productName, isOutOfStock
   *     }> },
   *   }
   *
   * @returns {Promise<object>} the dashboard summary
   */
  async getSummary() {
    // The dashboard is re-pulled on demand during a demo, so the request carries
    // a throwaway timestamp: it keeps each URL unique and stops the browser from
    // serving a heuristically cached copy of an earlier summary. The backend
    // ignores unknown query parameters on this endpoint.
    const { data } = await api.get('/analytics/summary', { params: { _: Date.now() } });
    return data;
  },
};

export default analyticsService;
