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
  // Number() coerces null, '', [] and false to 0, which would render a MISSING
  // price as a real "$0.00". Only a number or a non-empty numeric string counts;
  // everything else is NaN so it surfaces as an em dash instead.
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || value.trim() === '') return NaN;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : NaN;
}

/**
 * Currency used when the store settings have not been loaded (yet) or carry no
 * usable code. The real code comes from GET /api/settings.
 */
export const DEFAULT_CURRENCY = 'USD';

/** A valid store currency: exactly three uppercase letters, as the backend enforces. */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * Currencies the store settings offer, with the symbol every price is rendered
 * with. The backend stays permissive (any 3-letter uppercase code is accepted,
 * so existing values keep working) — this list only drives the admin dropdown
 * and the symbol used for display.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
];

/** code -> symbol, for the currencies above. */
const CURRENCY_SYMBOLS = Object.fromEntries(
  SUPPORTED_CURRENCIES.map(({ code, symbol }) => [code, symbol]),
);

/**
 * The symbol a currency code is displayed with, falling back to the code itself
 * for anything outside the supported list.
 *
 * @param {string} [currency=DEFAULT_CURRENCY] - ISO-4217-like 3-letter code
 * @returns {string} the currency symbol (e.g. `$`, `€`, `₡`)
 */
export function currencySymbol(currency = DEFAULT_CURRENCY) {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/**
 * Format a monetary value for display in the given currency, e.g. `$49.90`
 * (USD), `€49.90` (EUR) or `₡49.90` (CRC).
 *
 * Only the SYMBOL and formatting depend on the currency — the amount itself is
 * never converted. The value is always run through {@link parsePrice} first, so
 * a non-numeric price renders as an em dash instead of leaking `NaN` onto the
 * page.
 *
 * @param {string|number} value - a numeric price (string or number)
 * @param {string} [currency=DEFAULT_CURRENCY] - ISO-4217-like 3-letter code
 * @returns {string} the formatted price, or an em dash when not a finite number
 */
export function formatPrice(value, currency = DEFAULT_CURRENCY) {
  const amount = parsePrice(value);
  if (!Number.isFinite(amount)) return '—';

  const code = CURRENCY_PATTERN.test(currency) ? currency : DEFAULT_CURRENCY;

  // Supported currencies use the store's own symbol so the storefront, the cart
  // and the admin all render a code such as CRC identically across engines.
  if (CURRENCY_SYMBOLS[code]) {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${CURRENCY_SYMBOLS[code]}${formatted}`;
  }

  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    // Well-formed but unknown codes are rejected by some engines; still show the
    // amount with its code rather than nothing at all.
    return `${code} ${amount.toFixed(2)}`;
  }
}

/**
 * Format an ISO date string for display as `Jul 28, 2026`.
 *
 * @param {string|number|Date} value - a date value (ISO string, timestamp, Date)
 * @returns {string} the formatted date, or an em dash when it is not a valid date
 */
export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
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
