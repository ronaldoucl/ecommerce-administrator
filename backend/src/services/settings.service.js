import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { notFound } from '../utils/httpError.js';

// StoreSettings is a one-row table. The seed creates that row, so a working
// store always has exactly one.

// Adds `emailConfigured`, which is read-only and comes from the environment,
// not the database. `emailEnabled` is what the admin wants; `emailConfigured` is
// whether the server can actually send. The admin panel needs both to explain
// why the switch is greyed out.
function withEmailConfigured(settings) {
  return { ...settings, emailConfigured: config.email.configured };
}

export async function getSettings() {
  const settings = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!settings) throw notFound('Store settings not configured');
  return withEmailConfigured(settings);
}

// Updates the single row. If the database was never seeded there is no row yet,
// so we create the first one — that way the endpoint works either way and we
// still never end up with two.
export async function updateSettings(data) {
  const existing = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });

  const saved = existing
    ? await prisma.storeSettings.update({ where: { id: existing.id }, data })
    : await prisma.storeSettings.create({ data });

  return withEmailConfigured(saved);
}
