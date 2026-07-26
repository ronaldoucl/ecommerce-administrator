import * as checkoutService from '../services/checkout.service.js';
import { validateCheckout } from '../validators/checkout.validator.js';

// Thin controller: validate/parse the request, call the service, shape the response.
// Errors carrying a `status` are rendered by errorHandler as { "message": ... }.

// POST /api/checkout (public)
export async function checkout(req, res, next) {
  try {
    const input = validateCheckout(req.body);
    const order = await checkoutService.checkout(input);
    return res.status(201).json(order);
  } catch (err) {
    return next(err);
  }
}
