import { Router } from 'express';
import { updateVariant, deleteVariant } from '../controllers/variant.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Variant routes: /api/variants/*
//
// Creation lives on the products router (POST /api/products/:id/variants) because it
// needs the parent product id. Update and delete address a variant directly by its id.
const router = Router();

router.put('/:id', requireAuth, updateVariant);
router.delete('/:id', requireAuth, deleteVariant);

export default router;
