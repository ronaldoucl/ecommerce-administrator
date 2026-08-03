import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './products.routes.js';
import variantRoutes from './variants.routes.js';
import checkoutRoutes from './checkout.routes.js';
import orderRoutes from './order.routes.js';
import settingsRoutes from './settings.routes.js';
import inventoryRoutes from './inventory.routes.js';
import analyticsRoutes from './analyticsRoutes.js';

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
router.use('/analytics', analyticsRoutes);

export default router;
