import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';

// Idempotent admin seed. Upserts a single admin user from ADMIN_EMAIL / ADMIN_PASSWORD.
// Uses its own PrismaClient so the script can disconnect cleanly when finished.
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed the admin user');
  }

  const hashedPassword = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: 'admin' },
    create: { email, password: hashedPassword, role: 'admin' },
  });

  console.log(`Admin user seeded: ${admin.email} (id ${admin.id})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
