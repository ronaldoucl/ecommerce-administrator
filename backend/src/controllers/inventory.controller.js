import * as inventoryService from '../services/inventory.service.js';
import { config } from '../config/env.js';

// Thin controller: call the service, shape the response.

// GET /api/inventory/low-stock (protected)
// Returns the configured threshold alongside every variant at or below it.
export async function getLowStock(req, res, next) {
  try {
    const data = await inventoryService.getLowStockVariants();
    return res.status(200).json({ threshold: config.lowStockThreshold, data });
  } catch (err) {
    return next(err);
  }
}
