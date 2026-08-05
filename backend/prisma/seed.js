import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';

// Sets up a fresh database: the admin user, the default store settings and one
// sample product. Safe to run more than once — nothing is duplicated.
//
// It makes its own PrismaClient so the script can disconnect and exit cleanly.
const prisma = new PrismaClient();

// Default store configuration used until an admin edits it via PUT /api/settings.
const DEFAULT_SETTINGS = {
  storeName: 'My Store',
  mainText: 'Welcome to our store.',
  contactInfo: 'support@example.com',
  currency: 'USD',
  branding: '{"primaryColor":"#4F46E5"}',
};

// A sample product so the storefront is not empty on a fresh database.
//
// The images are fixed picsum.photos URLs, so they actually load. The variants
// are picked to cover the interesting cases: one with no price of its own (falls
// back to basePrice), one that overrides it, and one out of stock.
const SAMPLE_PRODUCT = {
  name: 'Aurora Hoodie',
  description: 'Soft brushed-fleece hoodie with a relaxed unisex fit and kangaroo pocket.',
  benefits: 'Warm, breathable, and pre-shrunk. Ethically sourced organic cotton.',
  basePrice: '49.90',
  isActive: true,
  isFeatured: true,
  images: {
    create: [
      { url: 'https://picsum.photos/seed/aurora-front/800/800', alt: 'Aurora Hoodie — front view' },
      { url: 'https://picsum.photos/seed/aurora-back/800/800', alt: 'Aurora Hoodie — back view' },
      { url: 'https://picsum.photos/seed/aurora-detail/800/800', alt: 'Aurora Hoodie — fabric detail' },
    ],
  },
  variants: {
    create: [
      { label: 'M / Black', price: null, stock: 12 }, // inherits basePrice
      { label: 'L / Black', price: '54.90', stock: 5 }, // price override
      { label: 'XL / Charcoal', price: '54.90', stock: 0 }, // out of stock
    ],
  },
};

async function seedAdmin() {
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

// We cannot upsert here: StoreSettings has one row and no unique column to match
// on. So we only create it when the table is empty, and never touch an existing
// configuration — re-running the seed must not wipe someone's settings.
async function seedSettings() {
  const existing = await prisma.storeSettings.findFirst();
  if (existing) {
    console.log(`Store settings already present (id ${existing.id}); left unchanged.`);
    return;
  }

  const settings = await prisma.storeSettings.create({ data: DEFAULT_SETTINGS });
  console.log(`Default store settings seeded: "${settings.storeName}" (id ${settings.id})`);
}

// Same problem as the settings: a product has no unique column, so we look it up
// by name first instead of upserting. That is what stops a second run creating a
// duplicate product.
async function seedSampleProduct() {
  const existing = await prisma.product.findFirst({ where: { name: SAMPLE_PRODUCT.name } });
  if (existing) {
    console.log(`Sample product already present: "${existing.name}" (id ${existing.id}); left unchanged.`);
    return;
  }

  const product = await prisma.product.create({
    data: SAMPLE_PRODUCT,
    include: { images: true, variants: true },
  });
  console.log(
    `Sample featured product seeded: "${product.name}" (id ${product.id}) ` +
      `with ${product.images.length} images and ${product.variants.length} variants.`,
  );
}

async function main() {
  await seedAdmin();
  await seedSettings();
  await seedSampleProduct();
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
