// Validation for store settings payloads.
//
// Same style as the other validators: dependency-free checks that return a
// NORMALIZED object for the service, or throw a 400 error (see src/utils/httpError.js)
// describing the first problem found. No validation library.

import { badRequest } from '../utils/httpError.js';
import {
  BRANDING_URL_PATTERN,
  HEX_COLOR_PATTERN,
  normalizeHexColor,
  parseBranding,
  serializeBranding,
} from '../utils/branding.js';

// ISO-4217-like currency code: exactly three uppercase letters (USD, EUR, CRC).
// Deliberately strict — lowercase, symbols and 2/4-letter codes are rejected.
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

// Fields a client is allowed to send. Anything else is rejected so a typo
// ("storename") fails loudly instead of being silently dropped.
//
// `logoUrl` and `primaryColor` are convenience fields: they are NOT columns.
// Both are serialized into the single `branding` column (see utils/branding.js),
// which keeps the frozen schema untouched.
//
// `emailConfigured` is deliberately absent: it is derived from the environment
// and returned read-only by GET, so sending it back is rejected like any typo.
const ALLOWED_FIELDS = [
  'storeName',
  'mainText',
  'contactInfo',
  'currency',
  'branding',
  'logoUrl',
  'primaryColor',
  'emailEnabled',
];

// The `branding` column is capped at 500 characters, so the logo URL has to stay
// comfortably inside the serialized JSON.
const LOGO_URL_MAX = 300;
const BRANDING_MAX = 500;

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

// Strict boolean: only a real `true`/`false` is accepted, so a stringy "false"
// (which is truthy in JavaScript) can never switch notifications on by accident.
function parseBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw badRequest(`${field} must be a boolean`);
  }
  return value;
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

// Optional logo URL: an absolute http(s) URL, or empty/null to remove the logo.
function parseLogoUrl(value) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest('logoUrl must be a string');
  }

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (!BRANDING_URL_PATTERN.test(trimmed)) {
    throw badRequest('logoUrl must be a valid http(s) URL');
  }
  if (trimmed.length > LOGO_URL_MAX) {
    throw badRequest(`logoUrl must be at most ${LOGO_URL_MAX} characters`);
  }
  return trimmed;
}

// Optional primary colour: #RGB or #RRGGBB, normalized to uppercase #RRGGBB,
// or empty/null to fall back to the default theme colour.
function parsePrimaryColor(value) {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest('primaryColor must be a string');
  }

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    throw badRequest('primaryColor must be a hex colour such as #4F46E5');
  }
  return normalizeHexColor(trimmed);
}

/**
 * Resolve the value stored in the single `branding` column.
 *
 * PUT /api/settings replaces the whole row, so branding is rebuilt from the
 * payload on every save:
 *   - when `logoUrl` / `primaryColor` are sent, they win and are serialized to
 *     JSON (any tagline carried by a `branding` string in the same request is
 *     preserved);
 *   - otherwise a raw `branding` string is parsed — including legacy bare URLs
 *     and bare hex colours — and normalized into the JSON shape.
 */
function resolveBranding(body) {
  const usesStructuredFields = body.logoUrl !== undefined || body.primaryColor !== undefined;

  // Parsing never throws, so a legacy value can always be read back.
  const current = parseBranding(
    typeof body.branding === 'string' ? body.branding : null,
  );

  const branding = usesStructuredFields
    ? serializeBranding({
        logoUrl: body.logoUrl === undefined ? current.logoUrl : parseLogoUrl(body.logoUrl),
        primaryColor:
          body.primaryColor === undefined
            ? current.primaryColor
            : parsePrimaryColor(body.primaryColor),
        text: current.text,
      })
    : body.branding === undefined
      ? null
      : parseRawBranding(body.branding);

  if (branding !== null && branding.length > BRANDING_MAX) {
    throw badRequest(`branding must be at most ${BRANDING_MAX} characters`);
  }

  return branding;
}

// A `branding` string sent on its own: length-checked as before, then normalized
// into the JSON shape so legacy values converge on the current contract.
function parseRawBranding(value) {
  const raw = parseOptionalBoundedString(value, 'branding', BRANDING_MAX);
  if (raw === null || raw === '') return null;
  return serializeBranding(parseBranding(raw));
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
    branding: resolveBranding(body),
    // Omitted means "off", consistent with every other optional field on this
    // endpoint: PUT replaces the whole row, so the client sends it every time.
    emailEnabled:
      body.emailEnabled === undefined ? false : parseBoolean(body.emailEnabled, 'emailEnabled'),
  };

  return data;
}
