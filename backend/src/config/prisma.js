import { PrismaClient } from '@prisma/client';

// Global-singleton PrismaClient.
// During development nodemon hot-reloads modules, which would otherwise create a new
// PrismaClient (and a new connection pool) on every reload and exhaust DB connections.
// Caching the instance on globalThis guarantees a single client per process.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
