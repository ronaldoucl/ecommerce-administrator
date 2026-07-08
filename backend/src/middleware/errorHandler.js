// Centralized Express error-handling middleware.
// Uses the (err, req, res, next) signature so Express treats it as an error handler.
// Returns the error's status (default 500) with the shared { "message": ... } shape.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
}
