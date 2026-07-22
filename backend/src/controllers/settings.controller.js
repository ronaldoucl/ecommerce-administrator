import * as settingsService from '../services/settings.service.js';

// Thin controller: call the service, shape the response.

// GET /api/settings (public)
// Returns the single store configuration row used by the storefront.
export async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json(settings);
  } catch (err) {
    return next(err);
  }
}
