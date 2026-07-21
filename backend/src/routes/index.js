import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './products.routes.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Aggregator router — mounts every feature router under /api.
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

// Temporary route to validate requireAuth. Remove once feature routes exist.
router.get('/protected-test', requireAuth, (req, res) => {
  res.status(200).json({ message: 'You are authenticated', user: req.user });
});

export default router;
