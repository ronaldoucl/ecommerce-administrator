// Checks the settings payload and hands the service a clean object, or throws a
// 400 describing the first thing that is wrong. No validation library — just
// plain functions.

import { badRequest } from '../utils/httpError.js';
import {
  BRANDING_URL_PATTERN,
  HEX_COLOR_PATTERN,
  normalizeHexColor,
  parseBranding,
  serializeBranding,
} from '../utils/branding.js';

// Three uppercase letters: USD, EUR, CRC. Strict on purpose.
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

// What a client may send. Anything else is an error, so a typo like "storename"
// fails loudly instead of being quietly ignored.
//
// logoUrl and primaryColor are not columns — they get packed into `branding`.
// emailConfigured is missing on purpose: it is read-only, so sending it back is
// treated like any other typo.
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

// The branding column holds 500 chars, so the URL has to fit inside the JSON.
const LOGO_URL_MAX = 300;
const BRANDING_MAX = 500;

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

// Optional text: a trimmed string, or null to clear the column.
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

// Only a real true/false. The string "false" is truthy in JS and would switch
// notifications ON, which is exactly the bug this prevents.
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

// Empty or null both mean "no logo".
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

// Empty or null both mean "use the default theme colour".
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

// Works out what goes in the single `branding` column.
//
// PUT replaces the whole row, so we rebuild branding every save:
//   - if logoUrl / primaryColor were sent, they win (and we keep any tagline the
//     `branding` string in the same request was carrying);
//   - otherwise we parse the raw `branding` string — old bare URLs and colours
//     included — and save it back in the JSON shape.
function resolveBranding(body) {
  const usesStructuredFields = body.logoUrl !== undefined || body.primaryColor !== undefined;

  // parseBranding never throws, so an old value can always be read.
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

// A `branding` string on its own: check the length, then rewrite it as JSON so
// old values slowly converge on the current format.
function parseRawBranding(value) {
  const raw = parseOptionalBoundedString(value, 'branding', BRANDING_MAX);
  if (raw === null || raw === '') return null;
  return serializeBranding(parseBranding(raw));
}

function rejectUnknownFields(body) {
  const unknown = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unknown.length > 0) {
    throw badRequest(
      `unknown field(s): ${unknown.join(', ')}. Allowed fields: ${ALLOWED_FIELDS.join(', ')}`,
    );
  }
}

// storeName and currency are required; everything else is optional and can be
// null to clear it.
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
    // Not sent means off, same as every other optional field here: PUT replaces
    // the row, so the client has to send it every time.
    emailEnabled:
      body.emailEnabled === undefined ? false : parseBoolean(body.emailEnabled, 'emailEnabled'),
  };

  return data;
}
