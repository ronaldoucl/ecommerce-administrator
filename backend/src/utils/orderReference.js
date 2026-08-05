import { randomInt } from 'node:crypto';

// Builds the order reference customers quote: ORD-YYYYMMDD-XXXXX
//
// The date is UTC so the reference does not depend on the server's timezone.
// The 5-character suffix gives ~60 million combinations per day, so a clash is
// very unlikely — and the checkout retries with a new one if it ever happens.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SUFFIX_LENGTH = 5;

function randomSuffix() {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    // randomInt instead of Math.random: it does not favour some letters over
    // others the way a modulo would.
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return suffix;
}

// `date` is a parameter so a test can pass a fixed one.
export function generateOrderReference(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `ORD-${year}${month}${day}-${randomSuffix()}`;
}
