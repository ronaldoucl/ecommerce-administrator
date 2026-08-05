// Branding helpers.
//
// The schema is frozen, so StoreSettings has a single free-text `branding`
// column. Both the store logo and the primary colour are kept there, serialized
// as a small JSON object:
//
//   {"logoUrl":"https://cdn.store.com/logo.png","primaryColor":"#4F46E5"}
//
// Legacy rows may hold a bare URL, a bare hex colour or a short tagline, so
// `parseBranding` interprets those heuristically instead of throwing. Whatever
// it reads is normalized back into the JSON shape on the next save.

/** Absolute http(s) URL. Kept deliberately simple — no URL parsing library. */
export const BRANDING_URL_PATTERN = /^https?:\/\/\S+$/i;

/** #RGB or #RRGGBB. Normalized to uppercase #RRGGBB by `normalizeHexColor`. */
export const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Return `value` trimmed when it is a non-empty string, otherwise null. */
function cleanString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Expand #RGB to #RRGGBB and uppercase it, so the stored colour always has one
 * canonical form. Returns null when the value is not a valid hex colour.
 */
export function normalizeHexColor(value) {
  const raw = cleanString(value);
  if (!raw || !HEX_COLOR_PATTERN.test(raw)) return null;

  const hex = raw.slice(1);
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;

  return `#${full.toUpperCase()}`;
}

/**
 * Read the `branding` column into a predictable object. Never throws: an
 * unparseable or legacy value is interpreted as best it can be.
 *
 * @param {string|null|undefined} branding - the raw column value
 * @returns {{ logoUrl: string|null, primaryColor: string|null, text: string|null }}
 */
export function parseBranding(branding) {
  const empty = { logoUrl: null, primaryColor: null, text: null };

  const raw = cleanString(branding);
  if (!raw) return empty;

  // Current shape: a JSON object.
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const logoUrl = cleanString(parsed.logoUrl);
        return {
          logoUrl: logoUrl && BRANDING_URL_PATTERN.test(logoUrl) ? logoUrl : null,
          primaryColor: normalizeHexColor(parsed.primaryColor),
          text: cleanString(parsed.text),
        };
      }
    } catch {
      // Not JSON after all — fall through to the legacy handling below.
    }
  }

  // Legacy values: a bare logo URL, a bare hex colour, or free text.
  if (BRANDING_URL_PATTERN.test(raw)) return { ...empty, logoUrl: raw };

  const color = normalizeHexColor(raw);
  if (color) return { ...empty, primaryColor: color };

  return { ...empty, text: raw };
}

/**
 * Serialize branding parts back into the JSON column value. Empty parts are
 * dropped, and a branding object with nothing in it becomes `null` so the
 * column is cleared rather than storing "{}".
 *
 * @param {{ logoUrl?: string|null, primaryColor?: string|null, text?: string|null }} parts
 * @returns {string|null} the value to store in `StoreSettings.branding`
 */
export function serializeBranding({ logoUrl, primaryColor, text } = {}) {
  const value = {};

  const url = cleanString(logoUrl);
  if (url) value.logoUrl = url;

  const color = normalizeHexColor(primaryColor);
  if (color) value.primaryColor = color;

  const tagline = cleanString(text);
  if (tagline) value.text = tagline;

  return Object.keys(value).length === 0 ? null : JSON.stringify(value);
}
