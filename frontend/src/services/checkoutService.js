import api from './api';

/**
 * Checkout service — the public storefront order submission.
 *
 * Wraps POST /api/checkout through the shared `api` instance. Checkout is public,
 * so no token is required (the request interceptor simply adds none).
 *
 * The backend computes and validates every price itself, so the payload carries
 * only customer details and `items: [{ variantId, quantity }]` — never prices.
 *
 * @param {{
 *   customerName: string,
 *   customerEmail: string,
 *   shippingInfo: string,
 *   items: Array<{ variantId: number, quantity: number }>
 * }} payload
 * @returns {Promise<object>} the created order (reference, status, totals, items)
 */
async function submitCheckout(payload) {
  const { data } = await api.post('/checkout', payload);
  return data;
}

const checkoutService = { submitCheckout };

export default checkoutService;
export { submitCheckout };
