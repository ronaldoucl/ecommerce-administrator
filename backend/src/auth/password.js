import bcrypt from 'bcryptjs';

// Password hashing helpers built on bcryptjs.
const SALT_ROUNDS = 10;

// Hash a plaintext password. Returns a Promise<string>.
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Compare a plaintext password against a stored hash. Returns a Promise<boolean>.
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
