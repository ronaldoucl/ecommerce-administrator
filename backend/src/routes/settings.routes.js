import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// /api/settings
// GET is public — the storefront needs the name, branding and currency.
// PUT is admin only.
const router = Router();

router.get('/', getSettings);
router.put('/', requireAuth, updateSettings);

export default router;
