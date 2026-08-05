// The only place errors turn into responses. Mounted last in server.js, and the
// (err, req, res, next) signature is what tells Express it is an error handler.
//
// The rule for what the client sees:
//   4xx - the message was written for them by a validator or service, so we send
//         it as-is ("Validation failed: id must be a positive integer").
//   5xx - the message is ours (Prisma dumps, driver errors, stack traces) and
//         must not leak. We log it and send something generic.

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // express.json() has its own wording for a broken body. Replace it so every
  // error looks the same from outside.
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }

  const status = err?.status || err?.statusCode || 500;

  if (status < 500) {
    return res.status(status).json({ message: err.message || 'Bad request' });
  }

  // A 5xx is always a real failure on our side, so always log it.
  console.error(`[error] ${req.method} ${req.originalUrl} —`, err);

  // A few 5xx messages are written for the client on purpose (see `expose` in
  // utils/httpError.js). Everything else gets hidden.
  if (err.expose === true) {
    return res.status(status).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error' });
}
