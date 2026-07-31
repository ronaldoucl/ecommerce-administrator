import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { getLowStockVariants } from './inventory.service.js';

// Analytics service — the ONLY place the dashboard metrics touch Prisma.
//
// Money rule: revenue is aggregated SQL-side and kept as a Prisma.Decimal end to end,
// then serialized with toFixed(2). It is NEVER converted to a JS Number, because
// floating point cannot represent decimal money exactly (0.1 + 0.2 !== 0.3).
//
// Low stock is NOT reimplemented here: it reuses getLowStockVariants() from
// inventory.service.js (S3-LUC-03), so both endpoints share one query and one
// definition of "low stock".

// CANCELLED-ORDER RULE — declared once and reused by every money/units metric.
//
// Cancelled orders restored their stock and represent no sale, so they must not
// inflate simulatedRevenue or bestSellingProduct. totalOrders deliberately does NOT
// use this filter: it counts every order regardless of status.
const CANCELLED_STATUS = 'cancelled';

// Matches orders that count as a sale (applied to the Order model).
const SALE_ORDER_FILTER = { status: { not: CANCELLED_STATUS } };

// The same rule expressed for OrderItem, traversed through its parent order.
const SALE_ORDER_ITEM_FILTER = { order: SALE_ORDER_FILTER };

// Format a Decimal money value as a fixed 2-decimal string ("1499.88").
// Accepts null, which is what Prisma returns for _sum over an empty set.
function toMoneyString(value) {
  return new Prisma.Decimal(value ?? 0).toFixed(2);
}

// Highest total quantity sold per product, excluding cancelled orders.
// Aggregated SQL-side with groupBy; only the single winning row is fetched (take: 1),
// so order items are never loaded into memory. Returns null when there are no sales.
async function getBestSellingProduct() {
  const [top] = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: SALE_ORDER_ITEM_FILTER,
    _sum: { quantity: true },
    // productId ascending breaks ties deterministically, so repeated calls agree.
    orderBy: [{ _sum: { quantity: 'desc' } }, { productId: 'asc' }],
    take: 1,
  });

  if (!top) return null;

  const product = await prisma.product.findUnique({
    where: { id: top.productId },
    select: { id: true, name: true },
  });

  // The product is read for its name only; sales history still counts even if the
  // product was since soft-deleted (isActive: false).
  return {
    productId: top.productId,
    productName: product?.name ?? null,
    unitsSold: top._sum.quantity ?? 0,
  };
}

// GET /api/analytics/summary — the five MVP dashboard metrics.
// Every count/sum is computed by the database; the queries run concurrently.
export async function getSummary() {
  const [totalOrders, revenue, pendingOrders, bestSellingProduct, lowStockItems] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: SALE_ORDER_FILTER }),
      prisma.order.count({ where: { status: 'pending' } }),
      getBestSellingProduct(),
      getLowStockVariants(),
    ]);

  return {
    totalOrders,
    simulatedRevenue: toMoneyString(revenue._sum.totalAmount),
    pendingOrders,
    bestSellingProduct,
    lowStock: {
      threshold: config.lowStockThreshold,
      count: lowStockItems.length,
      items: lowStockItems,
    },
  };
}
