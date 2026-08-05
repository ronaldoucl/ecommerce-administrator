import { PrismaClient } from '@prisma/client';

// One PrismaClient for the whole process.
//
// In dev, nodemon reloads modules on every save. Without this cache each reload
// would build a new client with a new connection pool, and we would run the
// database out of connections after a few edits.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
