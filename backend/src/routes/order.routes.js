import { Router } from 'express';
import {
  listOrders,
  getOrderById,
  updateOrderStatus,
} from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Order routes: /api/orders/*
//
// All admin-only: requireAuth (the existing middleware) is applied to every route.
const router = Router();

router.get('/', requireAuth, listOrders);
router.get('/:id', requireAuth, getOrderById);
router.patch('/:id/status', requireAuth, updateOrderStatus);

export default router;
