// Validation for the admin order endpoints.
//
// The status list and the transition map are exported as constants so the frontend
// team can mirror them. Same style as the Sprint 2 validators: dependency-free checks
// that return normalized values or throw an HTTP error (see src/utils/httpError.js).

import { badRequest, conflict, createHttpError } from '../utils/httpError.js';
import { parseRouteId } from './id.validator.js';

// The only statuses an order may hold. Order matters only for display.
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

// Allowed status transitions. `delivered` and `cancelled` are terminal (no exits).
export const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const MAX_PAGE_SIZE = 100;

// Exact message required by the contract for an unknown status (no "Validation failed:" prefix).
const INVALID_STATUS_MESSAGE = `Invalid status. Allowed values: ${ORDER_STATUSES.join(', ')}`;

// Route param :id — must be a positive integer within the int4 range.
export function validateOrderId(value) {
  return parseRouteId(value);
}

function parsePositiveIntParam(value, field, fallback) {
  if (value === undefined) return fallback;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return num;
}

// GET /api/orders query params: optional status filter, page (default 1),
// pageSize (default 20, capped at 100).
export function validateListQuery(query) {
  const source = query || {};

  let status;
  if (source.status !== undefined) {
    if (!ORDER_STATUSES.includes(source.status)) {
      throw createHttpError(400, INVALID_STATUS_MESSAGE);
    }
    status = source.status;
  }

  const page = parsePositiveIntParam(source.page, 'page', 1);
  const pageSize = Math.min(parsePositiveIntParam(source.pageSize, 'pageSize', 20), MAX_PAGE_SIZE);

  return { status, page, pageSize };
}

// PATCH body: { status } — must be one of ORDER_STATUSES.
export function validateStatusUpdate(body) {
  if (!body || typeof body !== 'object' || !ORDER_STATUSES.includes(body.status)) {
    throw createHttpError(400, INVALID_STATUS_MESSAGE);
  }
  return body.status;
}

// Enforce the transition map. A no-op (same status) and any disallowed transition
// both reject with 409, changing nothing. Kept here so the rule lives in the validator,
// not inline in the controller/service logic.
export function assertValidTransition(from, to) {
  if (from === to) {
    throw conflict(`Order is already ${to}`);
  }
  if (!STATUS_TRANSITIONS[from]?.includes(to)) {
    throw conflict(`Cannot change status from ${from} to ${to}`);
  }
}
