import api from './api';

/**
 * Order service. Wraps the admin `/orders` endpoints from the API contract.
 *
 * Every endpoint is protected: the shared `api` instance attaches the JWT from
 * localStorage["auth_token"] in its request interceptor and centralizes 401
 * handling in its response interceptor, so these methods never touch the token
 * or the Authorization header themselves.
 */
const orderService = {
  /**
   * List orders, newest first, with an optional status filter and pagination.
   * GET /api/orders (protected)
   *
   * @param {{ status?: string, page?: number, pageSize?: number }} [params]
   * @returns {Promise<{ data: Array, page: number, pageSize: number, total: number }>}
   */
  async listOrders({ status, page, pageSize } = {}) {
    // Only send params that are set, so the backend applies its own defaults.
    const query = {};
    if (status) query.status = status;
    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;

    const { data } = await api.get('/orders', { params: query });
    return data;
  },

  /**
   * Return a single order with its item snapshots.
   * GET /api/orders/:id (protected)
   *
   * @param {number|string} id - order id
   * @returns {Promise<object>} the full order
   */
  async getOrder(id) {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  },

  /**
   * Update an order's status. The backend enforces the transition map and, when
   * moving to "cancelled", restores each item's stock.
   * PATCH /api/orders/:id/status (protected)
   *
   * @param {number|string} id - order id
   * @param {string} status - the target status
   * @returns {Promise<object>} the updated order (full detail)
   */
  async updateOrderStatus(id, status) {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    return data;
  },
};

export default orderService;
