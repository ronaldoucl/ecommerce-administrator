import { Router } from 'express';
import { getSummary } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/requireAuth.js';

// /api/analytics/*
// Admin only — these numbers give away revenue and order volume.
const router = Router();

router.get('/summary', requireAuth, getSummary);

export default router;
