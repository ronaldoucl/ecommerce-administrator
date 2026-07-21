// Validation for product payloads.
//
// Each validator returns a NORMALIZED object ready to hand to the service layer,
// or throws a 400 error (see src/utils/httpError.js) describing the first problem
// it finds. No validation library — plain checks only.

import { badRequest } from '../utils/httpError.js';

// Numeric strings we accept for Decimal fields: "49", "49.90". Deliberately strict,
// so exotic literals ("0x10", "1e5", "Infinity") are rejected instead of silently
// coerced by Number() into something the DB would choke on.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// Parse a Decimal input. Accepts a number or a numeric string and returns a value
// Prisma can store as Decimal, preserving the caller's precision. Guarantees the
// result is a positive, finite value — never NaN.
function parseBasePrice(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw badRequest('basePrice must be a positive number');
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!DECIMAL_PATTERN.test(trimmed) || Number(trimmed) <= 0) {
      throw badRequest('basePrice must be a positive number');
    }
    // Keep the string form so trailing decimals ("49.90") survive as-is.
    return trimmed;
  }

  throw badRequest('basePrice must be a positive number');
}

// Require a non-empty string and return it trimmed.
function parseRequiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  return value.trim();
}

// Optional free-text field: a string, or null to clear it.
function parseOptionalString(value, field) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`);
  }
  return value.trim();
}

function parseBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw badRequest(`${field} must be a boolean`);
  }
  return value;
}

// Optional inline images on create: [{ url, alt? }].
function parseImages(value) {
  if (!Array.isArray(value)) {
    throw badRequest('images must be an array');
  }

  return value.map((image) => {
    if (!image || typeof image !== 'object') {
      throw badRequest('each image must be an object with a url');
    }
    return {
      url: parseRequiredString(image.url, 'image url'),
      alt: image.alt === undefined ? null : parseOptionalString(image.alt, 'image alt'),
    };
  });
}

// POST /api/products — name, description and basePrice are required.
export function validateCreateProduct(body) {
  if (!body || typeof body !== 'object') {
    throw badRequest('request body is required');
  }

  const data = {
    name: parseRequiredString(body.name, 'name'),
    description: parseRequiredString(body.description, 'description'),
    basePrice: parseBasePrice(body.basePrice),
    benefits: body.benefits === undefined ? null : parseOptionalString(body.benefits, 'benefits'),
  };

  if (body.isActive !== undefined) data.isActive = parseBoolean(body.isActive, 'isActive');
  if (body.isFeatured !== undefined) data.isFeatured = parseBoolean(body.isFeatured, 'isFeatured');
  if (body.images !== undefined) data.images = parseImages(body.images);

  return data;
}

// PUT /api/products/:id — every field is optional, but at least one must be present.
// Only the provided fields end up in the returned patch.
export function validateUpdateProduct(body) {
  if (!body || typeof body !== 'object') {
    throw badRequest('request body is required');
  }

  const data = {};

  if (body.name !== undefined) data.name = parseRequiredString(body.name, 'name');
  if (body.description !== undefined) {
    data.description = parseRequiredString(body.description, 'description');
  }
  if (body.benefits !== undefined) data.benefits = parseOptionalString(body.benefits, 'benefits');
  if (body.basePrice !== undefined) data.basePrice = parseBasePrice(body.basePrice);
  if (body.isActive !== undefined) data.isActive = parseBoolean(body.isActive, 'isActive');
  if (body.isFeatured !== undefined) data.isFeatured = parseBoolean(body.isFeatured, 'isFeatured');

  if (Object.keys(data).length === 0) {
    throw badRequest('at least one field must be provided');
  }

  return data;
}

// Route param :id — must be a positive integer.
export function validateProductId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest('id must be a positive integer');
  }
  return id;
}
