import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { notFound } from '../utils/httpError.js';
import { assertValidTransition } from '../validators/order.validator.js';
import { sendOrderStatusEmail } from './emailService.js';

// Order service — the ONLY place the admin order flow touches Prisma.
//
// Decimal note: unitPrice and totalAmount are Prisma.Decimal; lineTotal is computed
// with Decimal arithmetic. They stay as Decimal so they serialize as strings ("99.80")
// and are never converted to Number in the backend.

// Include shape for the detail view: each item with its product and (optional) variant.
const orderDetailInclude = {
  items: { include: { product: true, variant: true }, orderBy: { id: 'asc' } },
};

// Shape a full order (detail view) shared by GET /:id and PATCH /:id/status.
function shapeOrderDetail(order) {
  return {
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    shippingInfo: order.shippingInfo,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: new Prisma.Decimal(item.unitPrice).mul(item.quantity),
      productId: item.productId,
      productName: item.product.name,
      variantId: item.variantId,
      variantLabel: item.variant?.label ?? null,
    })),
  };
}

// GET /api/orders — newest first, optional status filter, paginated.
// Returns { data, page, pageSize, total }. Count and page are read together so
// `total` is consistent with the returned slice.
export async function listOrders({ status, page, pageSize }) {
  const where = status ? { status } : {};

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const data = orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: order._count.items,
    createdAt: order.createdAt,
  }));

  return { data, page, pageSize, total };
}

// GET /api/orders/:id — one order with its item snapshots. Throws 404 if missing.
export async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });
  if (!order) throw notFound('Order not found');
  return shapeOrderDetail(order);
}

// PATCH /api/orders/:id/status — validate the transition and persist it. Cancelling
// (transition INTO "cancelled") restores each line's quantity to its variant stock.
// The status update and stock restoration run in ONE transaction so they cannot drift.
//
// AFTER the transaction has committed, the customer notification email is
// attempted. It is deliberately outside the transaction and cannot fail the
// request: the status change is already durable, so the outcome is only
// REPORTED to the client as `emailSent` / `emailError`.
export async function updateOrderStatus(id, newStatus) {
  const order = await runStatusTransition(id, newStatus);

  // sendOrderStatusEmail never throws; the extra guard keeps that guarantee
  // local even if the implementation behind it changes.
  let email = { sent: false, error: null };
  try {
    email = await sendOrderStatusEmail({ order, newStatus });
  } catch (err) {
    email = { sent: false, error: err?.message || 'The notification email could not be sent.' };
  }

  return { ...order, emailSent: Boolean(email.sent), emailError: email.error ?? null };
}

// The transactional part of the status change: guard, restore stock when
// cancelling, persist, and return the updated order in the detail shape.
async function runStatusTransition(id, newStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw notFound('Order not found');

    // Throws 409 on a no-op or disallowed transition, leaving everything unchanged.
    assertValidTransition(order.status, newStatus);

    if (newStatus === 'cancelled') {
      // cancelled is terminal and the transition guard forbids re-entering it, so
      // stock is restored exactly once. Line items without a variant are skipped.
      for (const item of order.items) {
        if (item.variantId == null) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.order.update({ where: { id }, data: { status: newStatus } });

    const updated = await tx.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    return shapeOrderDetail(updated);
  });
}
