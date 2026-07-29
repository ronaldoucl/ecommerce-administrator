import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './products.routes.js';
import variantRoutes from './variants.routes.js';
import checkoutRoutes from './checkout.routes.js';
import orderRoutes from './order.routes.js';
import settingsRoutes from './settings.routes.js';
import inventoryRoutes from './inventory.routes.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Aggregator router — mounts every feature router under /api.
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/variants', variantRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/settings', settingsRoutes);
router.use('/inventory', inventoryRoutes);

// Temporary route to validate requireAuth. Remove once feature routes exist.
router.get('/protected-test', requireAuth, (req, res) => {
  res.status(200).json({ message: 'You are authenticated', user: req.user });
});

export default router;
