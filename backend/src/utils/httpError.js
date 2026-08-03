// Dependency-free helpers to build HTTP errors.
//
// Every error created here carries a `status`, which the centralized errorHandler
// (src/middleware/errorHandler.js) turns into the shared { "message": ... } shape.
// Services and validators throw these; controllers just forward them via next(err).

// Build an Error carrying an HTTP status code.
//
// `expose` tells the error handler whether the message is safe to send to the client.
// It defaults to true for 4xx (those messages are written for the caller) and false
// for 5xx (those are internal and get masked). Pass `{ expose: true }` on a 5xx only
// when the message is deliberately caller-facing AND documented in API_CONTRACT.md.
export function createHttpError(status, message, { expose = status < 500 } = {}) {
  const error = new Error(message);
  error.status = status;
  error.expose = expose;
  return error;
}

// 400 — invalid input. The API contract prefixes validation messages,
// e.g. "Validation failed: basePrice must be a positive number".
export function badRequest(reason) {
  return createHttpError(400, `Validation failed: ${reason}`);
}

// 404 — the requested resource does not exist.
export function notFound(message) {
  return createHttpError(404, message);
}

// 409 — the request conflicts with the current state of the resource
// (e.g. deleting a variant that already belongs to an order).
export function conflict(message) {
  return createHttpError(409, message);
}
