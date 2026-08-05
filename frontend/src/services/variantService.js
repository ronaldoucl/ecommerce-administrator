import api from './api';

// Variant endpoints, all admin only. Stock lives on the variant; `price` is an
// optional override — null means "use the product's basePrice".
//
// Note the asymmetry: you create a variant through its product, but update and
// delete it by its own id.
const variantService = {
  // POST /api/products/:id/variants
  async add(productId, payload) {
    const { data } = await api.post(`/products/${productId}/variants`, payload);
    return data;
  },

  // PUT /api/variants/:id — label, price and/or stock.
  async update(id, payload) {
    const { data } = await api.put(`/variants/${id}`, payload);
    return data;
  },

  // DELETE /api/variants/:id — fails with 409 if the variant is used by an order.
  async remove(id) {
    const { data } = await api.delete(`/variants/${id}`);
    return data;
  },
};

export default variantService;
