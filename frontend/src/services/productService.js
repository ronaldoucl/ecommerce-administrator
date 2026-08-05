import api from './api';

// Everything under /products. The admin calls need a token, but api.js adds it
// for us, so there is nothing to do here once the admin is logged in.
const productService = {
  // GET /api/products/featured — public. What the storefront home page shows.
  async getFeatured() {
    const { data } = await api.get('/products/featured');
    return data;
  },

  // GET /api/products/:id — public. Includes images and variants.
  async getById(id) {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },

  // GET /api/products — admin list, inactive products included.
  async list() {
    const { data } = await api.get('/products');
    return data;
  },

  // POST /api/products
  async create(payload) {
    const { data } = await api.post('/products', payload);
    return data;
  },

  // PUT /api/products/:id — only the fields you send are changed.
  async update(id, payload) {
    const { data } = await api.put(`/products/${id}`, payload);
    return data;
  },

  // DELETE /api/products/:id — soft delete, the product is just deactivated.
  async remove(id) {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
};

export default productService;
