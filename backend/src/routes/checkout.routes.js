import { Router } from 'express';
import { checkout } from '../controllers/checkout.controller.js';

// /api/checkout
// Public — customers order without logging in. No payment step: the service
// just takes the stock and creates the order, all in one transaction.
const router = Router();

router.post('/', checkout);

export default router;
