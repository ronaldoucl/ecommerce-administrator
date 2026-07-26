import * as orderService from '../services/order.service.js';
import {
  validateOrderId,
  validateListQuery,
  validateStatusUpdate,
} from '../validators/order.validator.js';

// Thin controllers: validate/parse the request, call the service, shape the response.
// Errors carrying a `status` are rendered by errorHandler as { "message": ... }.

// GET /api/orders (protected)
export async function listOrders(req, res, next) {
  try {
    const query = validateListQuery(req.query);
    const result = await orderService.listOrders(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

// GET /api/orders/:id (protected)
export async function getOrderById(req, res, next) {
  try {
    const id = validateOrderId(req.params.id);
    const order = await orderService.getOrderById(id);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/orders/:id/status (protected)
export async function updateOrderStatus(req, res, next) {
  try {
    const id = validateOrderId(req.params.id);
    const status = validateStatusUpdate(req.body);
    const order = await orderService.updateOrderStatus(id, status);
    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}
