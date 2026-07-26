import { randomInt } from 'node:crypto';

// Order reference generator: ORD-YYYYMMDD-XXXXX
//
// The date part is UTC (YYYYMMDD) so references are stable regardless of the
// server's local timezone. The suffix is a random uppercase alphanumeric block;
// with 36^5 (~60M) combinations per day collisions are extremely unlikely, and the
// checkout service still retries on the unique-constraint violation just in case.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SUFFIX_LENGTH = 5;

function randomSuffix() {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    // randomInt (Node crypto, built-in) avoids the modulo bias of Math.random.
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return suffix;
}

// Build a fresh reference. `date` is injectable for deterministic tests.
export function generateOrderReference(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `ORD-${year}${month}${day}-${randomSuffix()}`;
}
