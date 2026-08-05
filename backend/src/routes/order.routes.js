import { Router } from 'express';
import {
  listOrders,
  getOrderById,
  updateOrderStatus,
} from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// /api/orders/*
// All admin only.
const router = Router();

router.get('/', requireAuth, listOrders);
router.get('/:id', requireAuth, getOrderById);
router.patch('/:id/status', requireAuth, updateOrderStatus);

export default router;
