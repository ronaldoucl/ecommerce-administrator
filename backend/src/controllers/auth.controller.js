import * as authService from '../services/auth.service.js';
import { isValidLoginBody } from '../validators/auth.validator.js';

// A rejected async handler is forwarded to errorHandler by Express 5 itself.

// POST /api/auth/login
// Returns 200 { token, user } on success, 401 { message } on invalid credentials.
export async function login(req, res) {
  // Missing/empty credentials are treated as invalid credentials (no user enumeration).
  if (!isValidLoginBody(req.body)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const result = await authService.login(req.body.email, req.body.password);
  if (!result) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.status(200).json(result);
}

// GET /api/auth/me (protected)
// Returns the current admin without the password field.
export async function me(req, res) {
  const user = await authService.getUserById(req.user.userId);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.status(200).json(user);
}
