import { Router } from 'express';
import { getLowStock } from '../controllers/inventory.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Inventory routes: /api/inventory/*
//
// Admin-only: the low-stock signal is an operational tool, guarded by the
// existing requireAuth middleware.
const router = Router();

router.get('/low-stock', requireAuth, getLowStock);

export default router;
