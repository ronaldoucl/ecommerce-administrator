import prisma from '../config/prisma.js';
import { notFound } from '../utils/httpError.js';

// Settings service — the ONLY place StoreSettings touches Prisma.
//
// StoreSettings is a single-row configuration table. The default row is created by
// the seed (prisma/seed.js), so a configured store always has exactly one row.

// Return the store configuration row. Throws 404 if the store has not been seeded.
export async function getSettings() {
  const settings = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!settings) throw notFound('Store settings not configured');
  return settings;
}
