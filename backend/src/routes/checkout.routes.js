import { Router } from 'express';
import { checkout } from '../controllers/checkout.controller.js';

// Checkout route: /api/checkout
//
// Public (no requireAuth): the storefront places orders without a token. Stock is
// decremented atomically inside the service's transaction, so there is no payment step.
const router = Router();

router.post('/', checkout);

export default router;
