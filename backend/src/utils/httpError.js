// Dependency-free helpers to build HTTP errors.
//
// Every error created here carries a `status`, which the centralized errorHandler
// (src/middleware/errorHandler.js) turns into the shared { "message": ... } shape.
// Services and validators throw these; controllers just forward them via next(err).

// Build an Error carrying an HTTP status code.
export function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
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
