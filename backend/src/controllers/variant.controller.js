import * as variantService from '../services/variant.service.js';
import {
  validateCreateVariant,
  validateUpdateVariant,
  validateVariantId,
} from '../validators/variant.validator.js';
import { validateProductId } from '../validators/product.validator.js';

// Thin controllers: validate/parse the request, call the service, shape the response.
// A rejected async handler is forwarded to errorHandler by Express 5 itself.

// POST /api/products/:id/variants (protected)
// Mounted on the products router; :id is the parent product id.
export async function addVariant(req, res) {
  const productId = validateProductId(req.params.id);
  const data = validateCreateVariant(req.body);
  const variant = await variantService.addVariant(productId, data);
  return res.status(201).json(variant);
}

// PUT /api/variants/:id (protected)
export async function updateVariant(req, res) {
  const id = validateVariantId(req.params.id);
  const data = validateUpdateVariant(req.body);
  const variant = await variantService.updateVariant(id, data);
  return res.status(200).json(variant);
}

// DELETE /api/variants/:id (protected)
export async function deleteVariant(req, res) {
  const id = validateVariantId(req.params.id);
  await variantService.deleteVariant(id);
  return res.status(200).json({ message: 'Variant deleted successfully' });
}
