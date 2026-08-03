// Validation for product-variant payloads.
//
// Same style as product.validator.js: each function returns a NORMALIZED object
// ready for the service, or throws a 400 error (see src/utils/httpError.js).

import { badRequest } from '../utils/httpError.js';
import { parseRouteId } from './id.validator.js';

// Numeric strings accepted for the Decimal price: "54", "54.90".
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// price is an OPTIONAL override of Product.basePrice. Accepts a positive number or
// numeric string, or null to clear the override (fall back to the product price).
// Never returns NaN.
function parsePrice(value) {
  if (value === null) return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw badRequest('price must be a positive number');
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!DECIMAL_PATTERN.test(trimmed) || Number(trimmed) <= 0) {
      throw badRequest('price must be a positive number');
    }
    // Keep the string form so trailing decimals ("54.90") survive as-is.
    return trimmed;
  }

  throw badRequest('price must be a positive number');
}

// stock is the on-hand inventory for the variant: a non-negative integer.
function parseStock(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw badRequest('stock must be a non-negative integer');
  }
  return value;
}

// label is a required non-empty string.
function parseRequiredLabel(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('label is required');
  }
  return value.trim();
}

// POST /api/products/:id/variants — label required; price and stock optional.
// stock defaults to 0 (matching the schema default) when omitted.
export function validateCreateVariant(body) {
  if (!body || typeof body !== 'object') {
    throw badRequest('request body is required');
  }

  return {
    label: parseRequiredLabel(body.label),
    price: body.price === undefined ? null : parsePrice(body.price),
    stock: body.stock === undefined ? 0 : parseStock(body.stock),
  };
}

// PUT /api/variants/:id — every field optional, but at least one must be present.
export function validateUpdateVariant(body) {
  if (!body || typeof body !== 'object') {
    throw badRequest('request body is required');
  }

  const data = {};
  if (body.label !== undefined) data.label = parseRequiredLabel(body.label);
  if (body.price !== undefined) data.price = parsePrice(body.price);
  if (body.stock !== undefined) data.stock = parseStock(body.stock);

  if (Object.keys(data).length === 0) {
    throw badRequest('at least one field must be provided');
  }

  return data;
}

// Route param :id — must be a positive integer within the int4 range.
export function validateVariantId(value) {
  return parseRouteId(value);
}
