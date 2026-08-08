// One-off maintenance script: gives a "Default" variant to every product that
// has none. Those are products created before the default-variant rule existed —
// without a variant they have no stock and the checkout rejects them.
//
// Safe to run more than once: products that already have variants are skipped.
//
//   npm run backfill:variants

import prisma from '../src/config/prisma.js';
import { DEFAULT_VARIANT_LABEL } from '../src/utils/variants.js';

async function main() {
  const products = await prisma.product.findMany({
    where: { variants: { none: {} } },
    select: { id: true, name: true },
  });

  if (products.length === 0) {
    console.log('Nothing to do: every product already has at least one variant.');
    return;
  }

  await prisma.productVariant.createMany({
    data: products.map((product) => ({
      productId: product.id,
      label: DEFAULT_VARIANT_LABEL,
    })),
  });

  console.log(`Added a "${DEFAULT_VARIANT_LABEL}" variant to ${products.length} product(s):`);
  for (const product of products) {
    console.log(`  #${product.id} ${product.name}`);
  }
  console.log('Stock starts at 0 — set it from the admin dashboard.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
