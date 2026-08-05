import { Router } from 'express';
import { getLowStock } from '../controllers/inventory.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// /api/inventory/*
// Admin only — this is a tool for running the shop, not for customers.
const router = Router();

router.get('/low-stock', requireAuth, getLowStock);

export default router;
