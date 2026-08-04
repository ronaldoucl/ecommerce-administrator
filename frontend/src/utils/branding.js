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
