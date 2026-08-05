// Checks for the admin order endpoints.
//
// The status list and the transition map here are the source of truth. The
// frontend keeps a copy by hand in src/constants/orderStatus.js, so if you
// change something here, change it there too.

import { badRequest, conflict, createHttpError } from '../utils/httpError.js';
import { parseRouteId } from './id.validator.js';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

// Which status can go where. delivered and cancelled are dead ends.
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const MAX_PAGE_SIZE = 100;

// The contract asks for this exact wording, with no "Validation failed:" prefix.
const INVALID_STATUS_MESSAGE = `Invalid status. Allowed values: ${ORDER_STATUSES.join(', ')}`;

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

// Query params: optional status, page (default 1), pageSize (default 20, max 100).
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

export function validateStatusUpdate(body) {
  if (!body || typeof body !== 'object' || !ORDER_STATUSES.includes(body.status)) {
    throw createHttpError(400, INVALID_STATUS_MESSAGE);
  }
  return body.status;
}

// Applies the transition map. Setting the status it already has, or any move the
// map does not allow, gives a 409 and changes nothing.
export function assertValidTransition(from, to) {
  if (from === to) {
    throw conflict(`Order is already ${to}`);
  }
  if (!STATUS_TRANSITIONS[from]?.includes(to)) {
    throw conflict(`Cannot change status from ${from} to ${to}`);
  }
}
