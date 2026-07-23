import api from './api';

/**
 * Variant service. Wraps the protected variant endpoints from the API contract.
 * Inventory lives on the variant (`stock`); `price` is an optional override of
 * the parent product's `basePrice` (null falls back to the product price).
 *
 * Creation is addressed through the parent product
 * (POST /api/products/:id/variants), while update and delete target a variant
 * directly by its own id.
 */
const variantService = {
  /**
   * Add a variant to a product.
   * POST /api/products/:id/variants (protected)
   *
   * @param {number|string} productId - parent product id
   * @param {{ label: string, price?: string|null, stock?: number }} payload
   * @returns {Promise<{ id: number, label: string, price: string|null,
   *   stock: number, productId: number }>} the created variant (201)
   */
  async add(productId, payload) {
    const { data } = await api.post(`/products/${productId}/variants`, payload);
    return data;
  },

  /**
   * Update a variant (label, price override, or stock).
   * PUT /api/variants/:id (protected)
   *
   * @param {number|string} id - variant id
   * @param {{ label?: string, price?: string|null, stock?: number }} payload
   * @returns {Promise<object>} the updated variant
   */
  async update(id, payload) {
    const { data } = await api.put(`/variants/${id}`, payload);
    return data;
  },

  /**
   * Delete a variant.
   * DELETE /api/variants/:id (protected)
   *
   * @param {number|string} id - variant id
   * @returns {Promise<{ message: string }>}
   */
  async remove(id) {
    const { data } = await api.delete(`/variants/${id}`);
    return data;
  },
};

export default variantService;
