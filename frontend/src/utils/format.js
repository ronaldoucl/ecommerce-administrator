// Helpers for showing prices and dates. Display only — never save a value that
// came out of here.
//
// Prices arrive from the API as strings ("49.90") because Prisma serializes
// Decimal that way, so run them through parsePrice before doing any math.

// Returns a finite number, or NaN if the value is not a usable price.
export function parsePrice(value) {
  // Careful: Number() turns null, '', [] and false into 0, which would show a
  // missing price as a real "$0.00". Anything odd becomes NaN so formatPrice can
  // render an em dash instead.
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || value.trim() === '') return NaN;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : NaN;
}

// Used until the store settings load. The real one comes from GET /api/settings.
export const DEFAULT_CURRENCY = 'USD';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

// What the admin dropdown offers. The backend accepts any 3-letter code, so an
// old store with something else keeps working — it just shows the raw code.
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
];

const CURRENCY_SYMBOLS = Object.fromEntries(
  SUPPORTED_CURRENCIES.map(({ code, symbol }) => [code, symbol]),
);

// "$49.90". Only the symbol changes with the currency — we never convert amounts.
export function formatPrice(value, currency = DEFAULT_CURRENCY) {
  const amount = parsePrice(value);
  if (!Number.isFinite(amount)) return '—';

  const code = CURRENCY_PATTERN.test(currency) ? currency : DEFAULT_CURRENCY;

  // We add the symbol ourselves so a code like CRC looks the same in every
  // browser (Intl formats it differently depending on the engine).
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
    // Some engines reject valid-looking but unknown codes. Show the amount anyway.
    return `${code} ${amount.toFixed(2)}`;
  }
}

// "Jul 28, 2026", or an em dash if the date is not valid.
export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Grey box with a label, used when a product has no image. It is an inline SVG
// so it needs no network request and the layout never jumps.
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
