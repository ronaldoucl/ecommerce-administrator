import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// JWT helpers. Token payload shape: { userId, role }. Tokens expire in 1 day.

// Sign a JWT for the given payload.
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Verify a JWT and return its decoded payload. Throws if invalid or expired.
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
