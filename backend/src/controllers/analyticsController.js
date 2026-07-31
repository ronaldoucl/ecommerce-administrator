import * as analyticsService from '../services/analyticsService.js';

// Thin controller: call the service, shape the response.

// GET /api/analytics/summary (protected)
// Returns the five MVP dashboard metrics in a single payload.
export async function getSummary(req, res, next) {
  try {
    const summary = await analyticsService.getSummary();
    return res.status(200).json(summary);
  } catch (err) {
    return next(err);
  }
}
