/**
 * Branding helper.
 *
 * `branding` is stored as a single free-text column (up to 500 characters), so
 * the API contract allows several shapes for it:
 *   - a JSON object, e.g. {"primaryColor":"#4F46E5","logoUrl":"https://…/logo.png"}
 *   - a bare logo URL, e.g. https://cdn.store.com/logo.png
 *   - a bare colour, e.g. #4F46E5
 *   - any other short text, used as a tagline next to the store name
 *
 * This helper normalizes all of them into one predictable object so the
 * storefront never has to branch on the raw string.
 */

const URL_PATTERN = /^https?:\/\/\S+$/i;
const COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Return `value` when it is a non-empty string, otherwise null. */
function cleanString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * @param {string|null|undefined} branding - the raw `branding` settings column
 * @returns {{ logoUrl: string|null, primaryColor: string|null, text: string|null }}
 */
export function parseBranding(branding) {
  const empty = { logoUrl: null, primaryColor: null, text: null };

  const raw = cleanString(branding);
  if (!raw) return empty;

  // JSON object form.
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const logoUrl = cleanString(parsed.logoUrl);
        const primaryColor = cleanString(parsed.primaryColor);
        return {
          logoUrl: logoUrl && URL_PATTERN.test(logoUrl) ? logoUrl : null,
          primaryColor: primaryColor && COLOR_PATTERN.test(primaryColor) ? primaryColor : null,
          text: cleanString(parsed.text ?? parsed.tagline),
        };
      }
    } catch {
      // Not valid JSON after all — fall through to the plain-text handling.
    }
  }

  if (URL_PATTERN.test(raw)) return { ...empty, logoUrl: raw };
  if (COLOR_PATTERN.test(raw)) return { ...empty, primaryColor: raw };

  return { ...empty, text: raw };
}

/**
 * Expand `#RGB` to `#RRGGBB` and uppercase it, mirroring the backend
 * normalization (backend/src/utils/branding.js), so the swatch, the native
 * colour input and the stored value always agree.
 *
 * @param {string} value - a hex colour, with or without shorthand
 * @returns {string|null} the normalized `#RRGGBB`, or null when invalid
 */
export function normalizeHexColor(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return null;

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

/** Darken a `#RRGGBB` colour by `amount` (0–1) for hover/active states. */
function darken(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) =>
    Math.max(0, Math.round(((value >> shift) & 0xff) * (1 - amount)))
      .toString(16)
      .padStart(2, '0');

  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}

/**
 * Build the inline style that applies the store's primary colour to a shell.
 *
 * Setting the custom properties on the wrapping element recolours every
 * component inside it — buttons, badges, links — without touching the global
 * theme, so an unset colour simply falls back to the theme default.
 * `--brand-primary` is exposed as well for styles that want the brand colour
 * explicitly rather than the themeable `--color-primary`.
 *
 * @param {string|null|undefined} primaryColor - the branding colour
 * @returns {object|undefined} an inline style object, or undefined when unset
 */
export function brandStyle(primaryColor) {
  const color = normalizeHexColor(primaryColor);
  if (!color) return undefined;

  return {
    '--brand-primary': color,
    '--color-primary': color,
    '--color-primary-dark': darken(color, 0.15),
  };
}
