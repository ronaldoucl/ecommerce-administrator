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

// /api/products/*
//
// requireAuth goes on each route instead of the whole router, because the
// storefront reads have to stay public while the admin writes do not.
const router = Router();

// Public storefront endpoints.
// '/featured' has to come before '/:id' or Express will treat the word
// "featured" as an id and we get a validation error instead of the page.
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
