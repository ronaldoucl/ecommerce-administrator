// The order statuses and which one can follow which. delivered and cancelled
// are dead ends.
//
// This is a copy of the backend's order.validator.js. There is no shared package
// between the two apps, so if you change it there, change it here as well or the
// UI will offer buttons the API rejects.
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Where you can go from here. Empty array means nowhere.
export function allowedTransitions(status) {
  return STATUS_TRANSITIONS[status] ?? [];
}

// Delivered or cancelled — nothing more to do with it.
export function isTerminalStatus(status) {
  return allowedTransitions(status).length === 0;
}

// "pending" -> "Pending".
export function statusLabel(status) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
