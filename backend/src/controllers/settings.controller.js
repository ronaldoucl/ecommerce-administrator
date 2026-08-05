import * as settingsService from '../services/settings.service.js';
import { validateUpdateSettings } from '../validators/settings.validator.js';

// Thin controller: call the service, shape the response. A rejected async handler
// is forwarded to errorHandler by Express 5 itself.

// GET /api/settings (public)
// Returns the single store configuration row used by the storefront.
export async function getSettings(req, res) {
  const settings = await settingsService.getSettings();
  return res.status(200).json(settings);
}

// PUT /api/settings (protected)
// Updates the single store configuration row and returns it in the GET shape.
export async function updateSettings(req, res) {
  const data = validateUpdateSettings(req.body);
  const settings = await settingsService.updateSettings(data);
  return res.status(200).json(settings);
}
