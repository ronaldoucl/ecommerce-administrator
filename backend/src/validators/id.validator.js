// Shared validation for numeric route params (:id).
//
// Every id column in the schema is a PostgreSQL `Int` (int4), so any value above
// INT4_MAX cannot possibly exist. Without the upper bound such a value passes
// Number.isInteger(), reaches Prisma and fails there — surfacing as a 500 carrying a
// raw driver error instead of a clean 400. Bounding it here keeps malformed input a
// client error, and keeps the rule in ONE place for products, variants and orders.

import { badRequest } from '../utils/httpError.js';

// Largest value a PostgreSQL int4 primary key can hold.
const INT4_MAX = 2147483647;

// Parse a route param as a positive, in-range integer id.
// Throws 400 with the message the API contract documents.
export function parseRouteId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > INT4_MAX) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return id;
}
