import api from './api';

/**
 * Product service. Wraps the `/products` endpoints from the API contract:
 * public storefront reads plus the protected admin CRUD operations. The shared
 * `api` instance attaches the JWT automatically, so the admin calls just work
 * once an admin is logged in.
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

  /**
   * Return every product for the admin listing (includes inactive products).
   * GET /api/products (protected)
   *
   * @returns {Promise<Array<{ id: number, name: string, basePrice: string,
   *   isActive: boolean, isFeatured: boolean, createdAt: string }>>}
   */
  async list() {
    const { data } = await api.get('/products');
    return data;
  },

  /**
   * Create a new product.
   * POST /api/products (protected)
   *
   * @param {{ name: string, description: string, basePrice: string,
   *   benefits?: string|null, isActive?: boolean, isFeatured?: boolean,
   *   images?: Array<{ url: string, alt?: string|null }> }} payload
   * @returns {Promise<object>} the created product (201)
   */
  async create(payload) {
    const { data } = await api.post('/products', payload);
    return data;
  },

  /**
   * Update an existing product. Only the provided fields are changed.
   * PUT /api/products/:id (protected)
   *
   * @param {number|string} id - product id
   * @param {object} payload - any subset of the product fields
   * @returns {Promise<object>} the updated product
   */
  async update(id, payload) {
    const { data } = await api.put(`/products/${id}`, payload);
    return data;
  },

  /**
   * Delete a product.
   * DELETE /api/products/:id (protected)
   *
   * @param {number|string} id - product id
   * @returns {Promise<{ message: string }>}
   */
  async remove(id) {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
};

export default productService;
