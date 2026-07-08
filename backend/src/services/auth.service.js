import prisma from '../config/prisma.js';
import { comparePassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';

// Strip the password field from a user record before it leaves the service layer.
function toSafeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// Authenticate an admin by email + password.
// Returns { token, user } on success, or null on invalid credentials.
export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) return null;

  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: toSafeUser(user) };
}

// Fetch a user by id without the password field. Returns null if not found.
export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return toSafeUser(user);
}
