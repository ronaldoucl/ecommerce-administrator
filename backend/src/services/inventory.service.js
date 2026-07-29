import prisma from '../config/prisma.js';
import { config } from '../config/env.js';

// Inventory service — the ONLY place inventory reads touch Prisma.
//
// The low-stock query lives here as a single reusable function so both the
// dedicated GET /api/inventory/low-stock endpoint and the Sprint 4 analytics
// summary can call it instead of duplicating the query.

/**
 * Return every variant at or below the low-stock threshold, across ACTIVE
 * products only, ordered by stock ascending (most urgent first).
 *
 * @param {number} [threshold=config.lowStockThreshold] - inclusive stock ceiling
 * @returns {Promise<Array<{ variantId: number, variantLabel: string, stock: number,
 *   productId: number, productName: string, isOutOfStock: boolean }>>}
 */
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
