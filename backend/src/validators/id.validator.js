// One place to validate :id route params, used by products, variants and orders.
//
// The upper bound matters: every id column is a Postgres int4, so a bigger
// number cannot exist. Without the check it passes Number.isInteger(), reaches
// Prisma, and blows up there as a 500 with a raw driver error instead of a
// clean 400.

import { badRequest } from '../utils/httpError.js';

const INT4_MAX = 2147483647;

export function parseRouteId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > INT4_MAX) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return id;
}
