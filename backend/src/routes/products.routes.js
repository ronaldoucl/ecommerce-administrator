import { Router } from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { addVariant } from '../controllers/variant.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Product routes: /api/products/*
//
// requireAuth is applied per-route rather than router-wide, so the public storefront
// endpoints below stay unauthenticated while the admin writes require a valid JWT.
const router = Router();

// Public storefront endpoints.
// NOTE: '/featured' MUST be declared before '/:id', otherwise Express would match
// the literal path "featured" as the :id parameter.
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProductById);

// Protected admin endpoints.
router.get('/', requireAuth, getProducts);
router.post('/', requireAuth, createProduct);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, deleteProduct);

// Protected: add a variant to a product (inventory lives on the variant).
router.post('/:id/variants', requireAuth, addVariant);

export default router;
