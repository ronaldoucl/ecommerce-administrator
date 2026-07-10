import api from './api';

/**
 * Product service. Wraps the public `/products` endpoints used by the
 * storefront. Admin-only product endpoints (list/create/update/delete) are
 * added in a later ticket.
 */
const productService = {
  /**
   * Return products flagged as featured for the storefront.
   * GET /api/products/featured (public)
   *
   * @returns {Promise<Array>} list of featured products with images and variants
   */
  async getFeatured() {
    const { data } = await api.get('/products/featured');
    return data;
  },

  /**
   * Return a single product with its images and variants.
   * GET /api/products/:id (public)
   *
   * @param {number|string} id - product id
   * @returns {Promise<object>} the product
   */
  async getById(id) {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
};

export default productService;
