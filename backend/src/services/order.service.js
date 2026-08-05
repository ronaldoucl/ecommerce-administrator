import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { notFound } from '../utils/httpError.js';
import { assertValidTransition } from '../validators/order.validator.js';
import { sendOrderStatusEmail } from './emailService.js';

// Admin order logic. Amounts stay as Prisma.Decimal so they serialize as strings
// and keep their cents.

const orderDetailInclude = {
  items: { include: { product: true, variant: true }, orderBy: { id: 'asc' } },
};

// One shape for the order detail, used by both GET /:id and the status update.
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

// Newest first, optional status filter, paged. The count and the page are read
// in the same transaction so `total` always matches what we return.
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

export async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });
  if (!order) throw notFound('Order not found');
  return shapeOrderDetail(order);
}

// Changes the status, then tries to email the customer.
//
// The email is sent AFTER the transaction on purpose. The status change is
// already saved, so a failing email must not undo it — we just tell the client
// what happened with emailSent / emailError.
export async function updateOrderStatus(id, newStatus) {
  const order = await runStatusTransition(id, newStatus);

  // sendOrderStatusEmail promises never to throw; the try/catch keeps us safe
  // even if that ever changes.
  let email = { sent: false, error: null };
  try {
    email = await sendOrderStatusEmail({ order, newStatus });
  } catch (err) {
    email = { sent: false, error: err?.message || 'The notification email could not be sent.' };
  }

  return { ...order, emailSent: Boolean(email.sent), emailError: email.error ?? null };
}

// The database half: check the move is legal, put stock back if we are
// cancelling, save. All in one transaction so they cannot get out of sync.
async function runStatusTransition(id, newStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw notFound('Order not found');

    // 409 if the move is not allowed (or is a no-op), and nothing changes.
    assertValidTransition(order.status, newStatus);

    if (newStatus === 'cancelled') {
      // You cannot cancel twice (cancelled is terminal and the guard above
      // blocks re-entering it), so stock goes back exactly once.
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
