import { Router } from 'express';
import { updateVariant, deleteVariant } from '../controllers/variant.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

// /api/variants/*
//
// Creating a variant lives on the products router instead, because it needs the
// product id in the URL. Update and delete only need the variant's own id.
const router = Router();

router.put('/:id', requireAuth, updateVariant);
router.delete('/:id', requireAuth, deleteVariant);

export default router;
