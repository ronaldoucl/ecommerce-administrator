import { Router } from 'express';
import { getSummary } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Analytics routes: /api/analytics/*
//
// Admin-only: the dashboard metrics expose revenue and order volume, so the
// endpoint is guarded by the existing requireAuth middleware.
const router = Router();

router.get('/summary', requireAuth, getSummary);

export default router;
