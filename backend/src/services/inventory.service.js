import prisma from '../config/prisma.js';
import { config } from '../config/env.js';

// Every variant at or below the low-stock threshold, lowest stock first so the
// most urgent ones are on top. Only counts variants of active products.
//
// This lives in its own function because both GET /api/inventory/low-stock and
// the dashboard summary need it — writing the query twice would be asking for
// them to drift apart.
export async function getLowStockVariants(threshold = config.lowStockThreshold) {
  const variants = await prisma.productVariant.findMany({
    where: {
      stock: { lte: threshold },
      product: { isActive: true },
    },
    orderBy: { stock: 'asc' },
    include: { product: { select: { id: true, name: true } } },
  });

  return variants.map((variant) => ({
    variantId: variant.id,
    variantLabel: variant.label,
    stock: variant.stock,
    productId: variant.productId,
    productName: variant.product.name,
    isOutOfStock: variant.stock === 0,
  }));
}
