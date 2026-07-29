/**
 * Order status vocabulary and the allowed status transitions.
 *
 * This mirrors the backend validator (src/validators/order.validator.js). It is
 * the single source of truth on the frontend: the orders UI reads it to decide
 * which transitions to offer, so it must stay in sync with the backend map.
 * `delivered` and `cancelled` are terminal (no exits).
 */
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

export const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Transitions available from a status (empty array for terminal statuses). */
export function allowedTransitions(status) {
  return STATUS_TRANSITIONS[status] ?? [];
}

/** True when the order can no longer change status (delivered / cancelled). */
export function isTerminalStatus(status) {
  return allowedTransitions(status).length === 0;
}

/** Human-readable label for a status (e.g. "pending" -> "Pending"). */
export function statusLabel(status) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
