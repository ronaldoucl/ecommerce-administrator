// Small helpers for throwing errors with an HTTP status attached. Services and
// validators throw these; errorHandler turns them into { "message": ... }.

// `expose` says whether the message is safe to show the client. 4xx messages are
// written for them so it defaults to true; 5xx messages are internal so it
// defaults to false. Only pass { expose: true } on a 5xx if the message is meant
// for the client AND is in docs/API_CONTRACT.md.
export function createHttpError(status, message, { expose = status < 500 } = {}) {
  const error = new Error(message);
  error.status = status;
  error.expose = expose;
  return error;
}

// 400. The contract wants validation messages prefixed, e.g.
// "Validation failed: basePrice must be a positive number".
export function badRequest(reason) {
  return createHttpError(400, `Validation failed: ${reason}`);
}

export function notFound(message) {
  return createHttpError(404, message);
}

// 409 — the request clashes with the current state, like deleting a variant that
// an order already points at.
export function conflict(message) {
  return createHttpError(409, message);
}
