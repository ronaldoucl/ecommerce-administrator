// Checks product payloads and returns a clean object for the service, or throws
// a 400 with the first problem found.

import { badRequest } from '../utils/httpError.js';
import { parseRouteId } from './id.validator.js';

// What we accept for money: "49" or "49.90". Strict on purpose — without this,
// Number() would happily swallow "0x10", "1e5" or "Infinity" and hand the
// database something it cannot store.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// Takes a number or a numeric string and returns something Prisma can store as
// Decimal. Always positive and finite, never NaN.
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
    // Keep it as a string so "49.90" does not become 49.9.
    return trimmed;
  }

  throw badRequest('basePrice must be a positive number');
}

function parseRequiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  return value.trim();
}

// Optional text: a string, or null to clear it.
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

// We store image URLs, not files. The admin can paste one or upload a file, but
// an upload just becomes a hosted URL before it reaches here.
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;
const IMAGE_URL_MAX = 2048;
const IMAGE_ALT_MAX = 200;
const MAX_IMAGES = 10;

// The gallery: [{ url, alt? }, ...].
//
// The order matters — it is saved as given and the FIRST image is the main one.
// ProductImage has no position column, so row order is all we have. An empty
// array is fine and just clears the gallery.
function parseImages(value) {
  if (!Array.isArray(value)) {
    throw badRequest('images must be an array');
  }
  if (value.length > MAX_IMAGES) {
    throw badRequest(`images must contain at most ${MAX_IMAGES} entries`);
  }

  return value.map((image) => {
    if (!image || typeof image !== 'object' || Array.isArray(image)) {
      throw badRequest('each image must be an object with a url');
    }

    const url = parseRequiredString(image.url, 'image url');
    if (!IMAGE_URL_PATTERN.test(url)) {
      throw badRequest('image url must be a valid http(s) URL');
    }
    if (url.length > IMAGE_URL_MAX) {
      throw badRequest(`image url must be at most ${IMAGE_URL_MAX} characters`);
    }

    const alt = image.alt === undefined ? null : parseOptionalString(image.alt, 'image alt');
    if (alt !== null && alt.length > IMAGE_ALT_MAX) {
      throw badRequest(`image alt must be at most ${IMAGE_ALT_MAX} characters`);
    }

    return { url, alt };
  });
}

// The variant a product starts with. Stock lives on variants, so this is what
// makes a brand new product sellable — without it the product is created with an
// empty "Default" variant and cannot be bought until stock is set.
//
// Only on create: afterwards variants are managed through /api/variants.
const VARIANT_LABEL_MAX = 100;

function parseInitialVariant(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest('initialVariant must be an object');
  }

  if (typeof value.stock !== 'number' || !Number.isInteger(value.stock) || value.stock < 0) {
    throw badRequest('initialVariant.stock must be a non-negative integer');
  }

  const variant = { stock: value.stock };

  // No label means "this product is sold without options" — the service falls
  // back to the default label.
  if (value.label !== undefined && value.label !== null && value.label.trim?.() !== '') {
    const label = parseRequiredString(value.label, 'initialVariant.label');
    if (label.length > VARIANT_LABEL_MAX) {
      throw badRequest(`initialVariant.label must be at most ${VARIANT_LABEL_MAX} characters`);
    }
    variant.label = label;
  }

  return variant;
}

// Create: name, description and basePrice are required.
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
  if (body.initialVariant !== undefined) {
    data.initialVariant = parseInitialVariant(body.initialVariant);
  }

  return data;
}

// Update: everything is optional, but send at least one field. Only what you
// send comes back, so only that gets written.
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
  if (body.images !== undefined) data.images = parseImages(body.images);

  if (Object.keys(data).length === 0) {
    throw badRequest('at least one field must be provided');
  }

  return data;
}

export function validateProductId(value) {
  return parseRouteId(value);
}
