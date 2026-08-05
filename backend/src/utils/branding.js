// StoreSettings has one free-text `branding` column, so we keep both the logo
// and the primary colour in it as a small JSON object:
//
//   {"logoUrl":"https://cdn.store.com/logo.png","primaryColor":"#4F46E5"}
//
// Older rows might hold just a URL, just a colour or a tagline, so parseBranding
// guesses instead of failing. Whatever it reads gets saved back as JSON.

export const BRANDING_URL_PATTERN = /^https?:\/\/\S+$/i;
export const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function cleanString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// "#abc" -> "#AABBCC", so the stored colour always looks the same. Null if the
// value is not a hex colour. The frontend has a matching copy of this.
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

// Reads the column into { logoUrl, primaryColor, text }. Never throws.
export function parseBranding(branding) {
  const empty = { logoUrl: null, primaryColor: null, text: null };

  const raw = cleanString(branding);
  if (!raw) return empty;

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
      // Not JSON — fall through to the old formats below.
    }
  }

  // Old rows: a bare URL, a bare colour, or plain text.
  if (BRANDING_URL_PATTERN.test(raw)) return { ...empty, logoUrl: raw };

  const color = normalizeHexColor(raw);
  if (color) return { ...empty, primaryColor: color };

  return { ...empty, text: raw };
}

// Packs the parts back into the column. Empty parts are dropped, and if nothing
// is left we return null so the column is cleared instead of holding "{}".
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
