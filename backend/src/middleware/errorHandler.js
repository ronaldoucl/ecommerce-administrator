// Centralized Express error-handling middleware — the ONLY place errors become
// responses. Uses the (err, req, res, next) signature so Express treats it as an
// error handler, and is mounted last in server.js.
//
// Disclosure rule:
//   - 4xx  — the message was written for the caller by a validator or a service
//            (e.g. "Validation failed: id must be a positive integer"), so it is safe
//            to return as-is.
//   - 5xx  — the message is internal (Prisma query dumps, driver errors, stack traces)
//            and MUST NOT reach the client. The real error is logged server-side only
//            and the caller gets a generic message.

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // express.json() rejects unparseable bodies with its own parser message. Normalize
  // it to the shared shape rather than echoing body-parser internals.
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }

  const status = err?.status || err?.statusCode || 500;

  if (status < 500) {
    return res.status(status).json({ message: err.message || 'Bad request' });
  }

  // A 5xx always gets logged: it is a real server-side failure either way.
  console.error(`[error] ${req.method} ${req.originalUrl} —`, err);

  // Deliberate, contract-documented server errors keep their message (see
  // createHttpError's `expose` option). Everything else is masked.
  if (err.expose === true) {
    return res.status(status).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
}
