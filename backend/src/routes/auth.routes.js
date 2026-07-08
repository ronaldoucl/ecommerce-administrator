import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Auth routes: /api/auth/*
const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, me);

export default router;
