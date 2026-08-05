// Checks the public checkout payload before the service touches the database.

import { badRequest } from '../utils/httpError.js';

// Not a full RFC email check, just "something@something.tld". Good enough here —
// a typo we cannot catch would only mean the confirmation email bounces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

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

// The cart lines. We reject duplicate variantIds instead of merging them, so the
// client cannot sneak past the per-line quantity cap by sending the same variant
// several times.
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
