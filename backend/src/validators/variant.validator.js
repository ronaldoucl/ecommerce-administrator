// Checks for variant payloads. Same idea as product.validator.js.

import { badRequest } from '../utils/httpError.js';
import { parseRouteId } from './id.validator.js';

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// price overrides the product's basePrice. null clears the override, so the
// variant goes back to selling at the product price.
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
    // Keep it as a string so "54.90" does not become 54.9.
    return trimmed;
  }

  throw badRequest('price must be a positive number');
}

function parseStock(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw badRequest('stock must be a non-negative integer');
  }
  return value;
}

function parseRequiredLabel(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('label is required');
  }
  return value.trim();
}

// Create: only the label is required. stock defaults to 0, same as the schema.
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

// Update: everything optional, but send at least one field.
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

export function validateVariantId(value) {
  return parseRouteId(value);
}
