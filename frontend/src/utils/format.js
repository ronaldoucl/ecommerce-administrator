/**
 * Shared presentation helpers for the storefront.
 *
 * Monetary values arrive from the API as strings to preserve Decimal precision
 * (e.g. "49.90"). These helpers only affect DISPLAY — never persist a value
 * derived from them.
 */

/**
 * Parse a monetary value into a number before any arithmetic or formatting.
 *
 * Prisma serializes Decimal columns as STRINGS (e.g. "49.90"), so prices arrive
 * as text. Always run them through this helper first: it returns a finite number
 * or `NaN`, so a bad value surfaces as an em dash via {@link formatPrice} instead
 * of leaking `NaN` into totals rendered on screen.
 *
 * @param {string|number} value - a numeric price (string or number)
 * @returns {number} the parsed amount, or `NaN` when it is not a finite number
 */
export function parsePrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : NaN;
}

/**
 * Format a monetary value for display as `$49.90`.
 *
 * @param {string|number} value - a numeric price (string or number)
 * @returns {string} the formatted price, or an em dash when not a finite number
 */
export function formatPrice(value) {
  const amount = parsePrice(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '—';
}

/**
 * Build an inline SVG data URI to stand in for a missing product image, so the
 * layout stays stable without any network or asset dependency.
 *
 * @param {string} label - short text drawn on the placeholder
 * @returns {string} a `data:image/svg+xml,...` URI
 */
export function placeholderImage(label) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">` +
        `<rect width="100%" height="100%" fill="#eef2ff"/>` +
        `<text x="50%" y="50%" font-family="sans-serif" font-size="40" fill="#4f46e5" ` +
        `text-anchor="middle" dominant-baseline="middle">${label}</text>` +
        `</svg>`,
    )
  );
}
