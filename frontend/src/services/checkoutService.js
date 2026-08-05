import api from './api';

// POST /api/checkout — public, no token needed.
//
// We only send customer details and items as [{ variantId, quantity }]. Prices
// are never sent: the backend looks them up and does the maths, otherwise anyone
// could post their own total.
async function submitCheckout(payload) {
  const { data } = await api.post('/checkout', payload);
  return data;
}

const checkoutService = { submitCheckout };

export default checkoutService;
export { submitCheckout };
