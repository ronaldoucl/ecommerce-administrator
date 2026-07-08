import { verifyToken } from '../auth/jwt.js';

// Protects a route: requires a valid "Authorization: Bearer <token>" header.
// On success attaches the decoded payload ({ userId, role, iat, exp }) to req.user.
// On any failure responds with 401 and the shared { "message": ... } shape.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
