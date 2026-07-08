// Catch-all middleware for unmatched routes. Returns 404 with the shared error shape.
export function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}
