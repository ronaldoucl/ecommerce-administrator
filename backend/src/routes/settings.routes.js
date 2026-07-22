import { Router } from 'express';
import { getSettings } from '../controllers/settings.controller.js';

// Settings routes: /api/settings
//
// GET is public (the storefront reads branding/currency without a token).
// PUT (protected update) is a later ticket.
const router = Router();

router.get('/', getSettings);

export default router;
