import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Settings routes: /api/settings
//
// GET is public (the storefront reads branding/currency without a token).
// PUT is admin-only, so it goes through requireAuth.
const router = Router();

router.get('/', getSettings);
router.put('/', requireAuth, updateSettings);

export default router;
