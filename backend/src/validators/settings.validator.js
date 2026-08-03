// Validation for store settings payloads.
//
// Same style as the other validators: dependency-free checks that return a
// NORMALIZED object for the service, or throw a 400 error (see src/utils/httpError.js)
// describing the first problem found. No validation library.

import { badRequest } from '../utils/httpError.js';

// ISO-4217-like currency code: exactly three uppercase letters (USD, EUR, CRC).
// Deliberately strict — lowercase, symbols and 2/4-letter codes are rejected.
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

// Fields a client is allowed to send. Anything else is rejected so a typo
// ("storename") fails loudly instead of being silently dropped.
const ALLOWED_FIELDS = ['storeName', 'mainText', 'contactInfo', 'currency', 'branding'];

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

// Optional free-text field: a trimmed string capped at `max` characters,
// or null to clear the column.
function parseOptionalBoundedString(value, field, max) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw badRequest(`${field} must be at most ${max} characters`);
  }
  return trimmed;
}

function parseCurrency(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('currency is required');
  }
  const trimmed = value.trim();
  if (!CURRENCY_PATTERN.test(trimmed)) {
    throw badRequest('currency must be a 3-letter uppercase code (e.g. USD, EUR, CRC)');
  }
  return trimmed;
}

// Reject any property that is not part of the settings payload.
function rejectUnknownFields(body) {
  const unknown = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unknown.length > 0) {
    throw badRequest(
      `unknown field(s): ${unknown.join(', ')}. Allowed fields: ${ALLOWED_FIELDS.join(', ')}`,
    );
  }
}

// PUT /api/settings — storeName and currency are required; the rest are optional
// and may be null to clear them. Unknown fields and empty bodies are rejected.
export function validateUpdateSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('request body is required');
  }
  if (Object.keys(body).length === 0) {
    throw badRequest('request body must not be empty');
  }

  rejectUnknownFields(body);

  const data = {
    storeName: parseBoundedString(body.storeName, 'storeName', 2, 80),
    currency: parseCurrency(body.currency),
    mainText:
      body.mainText === undefined
        ? null
        : parseOptionalBoundedString(body.mainText, 'mainText', 2000),
    contactInfo:
      body.contactInfo === undefined
        ? null
        : parseOptionalBoundedString(body.contactInfo, 'contactInfo', 500),
    branding:
      body.branding === undefined
        ? null
        : parseOptionalBoundedString(body.branding, 'branding', 500),
  };

  return data;
}
