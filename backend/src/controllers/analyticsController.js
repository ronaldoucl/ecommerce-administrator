import * as analyticsService from '../services/analyticsService.js';

// Thin controller: call the service, shape the response. A rejected async handler
// is forwarded to errorHandler by Express 5 itself.

// GET /api/analytics/summary (protected)
// Returns the five MVP dashboard metrics in a single payload.
export async function getSummary(req, res) {
  const summary = await analyticsService.getSummary();
  return res.status(200).json(summary);
}
