import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { getLowStockVariants } from './inventory.service.js';

// The numbers behind the admin dashboard.
//
// Revenue is summed by the database and stays a Prisma.Decimal until we format
// it. We never turn it into a JS number, because floats cannot hold decimal
// money exactly (0.1 + 0.2 !== 0.3).
//
// Low stock is not rewritten here — we reuse getLowStockVariants() so both
// endpoints agree on what "low stock" means.

// Cancelled orders gave their stock back and earned nothing, so they must not
// count towards revenue or best seller. totalOrders is the exception: it counts
// every order whatever its status.
const CANCELLED_STATUS = 'cancelled';
const SALE_ORDER_FILTER = { status: { not: CANCELLED_STATUS } };
const SALE_ORDER_ITEM_FILTER = { order: SALE_ORDER_FILTER };

// "1499.88". Handles null, which is what Prisma returns when there is nothing
// to sum.
function toMoneyString(value) {
  return new Prisma.Decimal(value ?? 0).toFixed(2);
}

// Product with the most units sold, cancelled orders excluded. groupBy does the
// work in SQL and we only take the winner, so we never load order items into
// memory. Null when nothing has sold yet.
async function getBestSellingProduct() {
  const [top] = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: SALE_ORDER_ITEM_FILTER,
    _sum: { quantity: true },
    // The productId tiebreak keeps the answer stable between calls.
    orderBy: [{ _sum: { quantity: 'desc' } }, { productId: 'asc' }],
    take: 1,
  });

  if (!top) return null;

  const product = await prisma.product.findUnique({
    where: { id: top.productId },
    select: { id: true, name: true },
  });

  // We only want the name here. A product that was deactivated still keeps its
  // sales history, which is why we do not filter by isActive.
  return {
    productId: top.productId,
    productName: product?.name ?? null,
    unitsSold: top._sum.quantity ?? 0,
  };
}

// The five dashboard numbers. All five queries run at the same time.
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
