import api from './api';

// Admin /orders endpoints. All protected — api.js handles the token and the 401.
const orderService = {
  // GET /api/orders — newest first, optional status filter and paging.
  async listOrders({ status, page, pageSize } = {}) {
    // Only send what was actually passed, so the backend uses its own defaults.
    const query = {};
    if (status) query.status = status;
    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;

    const { data } = await api.get('/orders', { params: query });
    return data;
  },

  // GET /api/orders/:id — the order plus its saved line items.
  async getOrder(id) {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  },

  // PATCH /api/orders/:id/status — the backend checks the move is allowed and
  // puts the stock back if we are cancelling.
  async updateOrderStatus(id, status) {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    return data;
  },
};

export default orderService;
