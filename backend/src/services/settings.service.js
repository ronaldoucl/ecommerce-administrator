import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { notFound } from '../utils/httpError.js';

// Settings service — the ONLY place StoreSettings touches Prisma.
//
// StoreSettings is a single-row configuration table. The default row is created by
// the seed (prisma/seed.js), so a configured store always has exactly one row.

// Add the read-only `emailConfigured` flag to a settings row.
//
// `emailEnabled` is the admin's choice; `emailConfigured` says whether the server
// actually has the Gmail credentials to honour it. The admin panel needs both to
// explain why the switch cannot be turned on, so every response carries it.
function withEmailConfigured(settings) {
  return { ...settings, emailConfigured: config.email.configured };
}

// Return the store configuration row. Throws 404 if the store has not been seeded.
export async function getSettings() {
  const settings = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });
  if (!settings) throw notFound('Store settings not configured');
  return withEmailConfigured(settings);
}

// Update the store configuration and return the new values.
//
// The table holds exactly one row, so we update the existing one by its id instead
// of creating a new one. On a fresh (unseeded) database no row exists yet — in that
// case we create the first one, which keeps the endpoint safe without ever ending up
// with a second row.
export async function updateSettings(data) {
  const existing = await prisma.storeSettings.findFirst({ orderBy: { id: 'asc' } });

  const saved = existing
    ? await prisma.storeSettings.update({ where: { id: existing.id }, data })
    : await prisma.storeSettings.create({ data });

  return withEmailConfigured(saved);
}
