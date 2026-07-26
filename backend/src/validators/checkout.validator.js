// Validation for the public checkout payload.
//
// Same style as the Sprint 2 validators: dependency-free checks that return a
// NORMALIZED object for the service, or throw a 400 error (see src/utils/httpError.js)
// describing the first problem found. No validation library.

import { badRequest } from '../utils/httpError.js';

// Simple email check — not RFC-complete, just "something@something.tld".
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

// Required trimmed string constrained to [min, max] characters.
function parseBoundedString(value, field, min, max) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw badRequest(`${field} must be between ${min} and ${max} characters`);
  }
  return trimmed;
}

function parseEmail(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('customerEmail is required');
  }
  const trimmed = value.trim();
  if (!EMAIL_PATTERN.test(trimmed)) {
    throw badRequest('customerEmail must be a valid email address');
  }
  return trimmed;
}

function parsePositiveInteger(value, field) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return value;
}

// items: non-empty array, at most MAX_ITEMS, no duplicate variantId. Each entry
// carries a positive-integer variantId and an integer quantity in [1, MAX_QUANTITY].
function parseItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest('items must be a non-empty array');
  }
  if (value.length > MAX_ITEMS) {
    throw badRequest(`items must contain at most ${MAX_ITEMS} entries`);
  }

  const seen = new Set();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw badRequest(`items[${index}] must be an object`);
    }

    const variantId = parsePositiveInteger(item.variantId, `items[${index}].variantId`);

    if (
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      throw badRequest(`items[${index}].quantity must be an integer between 1 and ${MAX_QUANTITY}`);
    }

    if (seen.has(variantId)) {
      throw badRequest(`duplicate variantId ${variantId} in items; merge them into a single entry`);
    }
    seen.add(variantId);

    return { variantId, quantity: item.quantity };
  });
}

// POST /api/checkout — validate and normalize the cart payload.
export function validateCheckout(body) {
  if (!body || typeof body !== 'object') {
    throw badRequest('request body is required');
  }

  return {
    customerName: parseBoundedString(body.customerName, 'customerName', 2, 100),
    customerEmail: parseEmail(body.customerEmail),
    shippingInfo: parseBoundedString(body.shippingInfo, 'shippingInfo', 5, 500),
    items: parseItems(body.items),
  };
}
