// Order service — stubs for a later ticket.
//
// Wraps the checkout + `/orders` endpoints from the API contract. Signatures
// are sketched here so callers/UI can be planned against them; each will be
// implemented on top of the shared `api` instance.
//
// import api from './api';

const orderService = {
  /**
   * Place an order.
   * POST /api/checkout (public)
   * @param {object} _payload - { customerName, customerEmail, shippingInfo, items }
   */
  async checkout(_payload) {
    // TODO: return (await api.post('/checkout', _payload)).data;
    throw new Error('orderService.checkout is not implemented yet');
  },

  /**
   * List all orders (admin).
   * GET /api/orders (protected)
   */
  async getAll() {
    // TODO: return (await api.get('/orders')).data;
    throw new Error('orderService.getAll is not implemented yet');
  },

  /**
   * Return a single order with its line items.
   * GET /api/orders/:id (protected)
   * @param {number|string} _id
   */
  async getById(_id) {
    // TODO: return (await api.get(`/orders/${_id}`)).data;
    throw new Error('orderService.getById is not implemented yet');
  },

  /**
   * Update the status of an order.
   * PATCH /api/orders/:id/status (protected)
   * @param {number|string} _id
   * @param {string} _status - pending | confirmed | preparing | delivered | cancelled
   */
  async updateStatus(_id, _status) {
    // TODO: return (await api.patch(`/orders/${_id}/status`, { status: _status })).data;
    throw new Error('orderService.updateStatus is not implemented yet');
  },
};

export default orderService;
