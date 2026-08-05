// The `branding` setting is one free-text column, and the API contract lets it
// hold any of these:
//   - JSON: {"primaryColor":"#4F46E5","logoUrl":"https://.../logo.png"}
//   - just a logo URL
//   - just a colour
//   - any other short text, shown as a tagline
//
// parseBranding turns all of them into the same object so the storefront never
// has to check which shape it got.

const URL_PATTERN = /^https?:\/\/\S+$/i;
const COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function cleanString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function parseBranding(branding) {
  const empty = { logoUrl: null, primaryColor: null, text: null };

  const raw = cleanString(branding);
  if (!raw) return empty;

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
      // Not JSON after all — treat it as plain text below.
    }
  }

  if (URL_PATTERN.test(raw)) return { ...empty, logoUrl: raw };
  if (COLOR_PATTERN.test(raw)) return { ...empty, primaryColor: raw };

  return { ...empty, text: raw };
}

// "#abc" -> "#AABBCC". Same rule as the backend (backend/src/utils/branding.js)
// so the swatch, the colour input and the saved value never disagree.
// Returns null if the value is not a valid hex colour.
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

// --- colour maths, so a custom brand colour never makes text unreadable ---

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// The theme's --color-surface and --color-text.
const SURFACE = [255, 255, 255];
const INK = [15, 23, 42];

function toRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex(rgb) {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

// Blends `weight` (0-1) of `target` into `base`.
function mix(base, target, weight) {
  return base.map((channel, index) => channel + (target[index] - channel) * weight);
}

// WCAG relative luminance — how bright a colour looks to the eye.
function luminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio: 1 = same colour, 21 = black on white. 4.5 is the minimum
// for normal text.
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// White or dark text, whichever stays readable on ALL the given backgrounds, so
// the label does not have to change colour when you hover.
// We keep white while it passes AA, because white on a coloured button is the
// look people expect; dark text only kicks in for pale brand colours.
function readableText(backgrounds) {
  const worst = (text) => Math.min(...backgrounds.map((background) => contrast(text, background)));
  if (worst(WHITE) >= 4.5) return WHITE;

  return worst(WHITE) >= worst(INK) ? WHITE : INK;
}

// Darkens the colour until it is readable as TEXT on a white card.
function legibleOnSurface(rgb, target = 4.5) {
  let color = rgb;
  for (let step = 0; step < 20 && contrast(color, SURFACE) < target; step += 1) {
    color = mix(color, BLACK, 0.08);
  }

  return color;
}

// Inline style that repaints everything inside an element with the store's
// colour. No colour set means no style, so the default theme shows through.
//
// We build the whole family from the one colour the admin picked. Overriding
// only --color-primary was not enough: the rest of the theme stayed indigo, so
// hover looked identical to the base and white labels disappeared on pale
// colours. Now hover always moves away from the base (darker, or lighter if the
// brand is nearly black), the text colour is picked for contrast, and -ink is a
// version dark enough to read as text on white.
export function brandStyle(primaryColor) {
  const color = normalizeHexColor(primaryColor);
  if (!color) return undefined;

  const base = toRgb(color);
  const hover = luminance(base) > 0.02 ? mix(base, BLACK, 0.18) : mix(base, WHITE, 0.25);

  return {
    '--brand-primary': color,
    '--color-primary': color,
    '--color-primary-dark': toHex(hover),
    '--color-primary-light': toHex(mix(base, WHITE, 0.88)),
    '--color-primary-ink': toHex(legibleOnSurface(base)),
    '--color-text-inverse': toHex(readableText([base, hover])),
  };
}
