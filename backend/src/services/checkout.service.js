import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { notFound, conflict, createHttpError } from '../utils/httpError.js';
import { generateOrderReference } from '../utils/orderReference.js';

// Checkout service — the ONLY place the order flow touches Prisma.
//
// Money is handled with Prisma.Decimal end to end (never JS floating point), so
// prices and totals keep exact precision and serialize as strings ("129.98").

const MAX_REFERENCE_ATTEMPTS = 5;

// True when the error is the Order.reference unique-constraint violation, which is
// the only failure we retry (with a freshly generated reference).
function isReferenceCollision(err) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    err.meta.target.includes('reference')
  );
}

// Run the whole checkout in a single transaction with the given reference.
// Any thrown error rolls everything back: no order, no items, no stock change.
async function runCheckoutTransaction(input, reference) {
  const { customerName, customerEmail, shippingInfo, items } = input;
  const variantIds = items.map((item) => item.variantId);

  return prisma.$transaction(async (tx) => {
    // 1. Load every requested variant WITH its product in a single query.
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    // 2-6. Validate existence/availability/stock and resolve prices on the SERVER.
    // All checks run BEFORE any write, so an oversell is rejected without side effects.
    const lines = items.map((item) => {
      const variant = variantById.get(item.variantId);
      if (!variant) {
        throw notFound(`Variant not found: ${item.variantId}`);
      }
      if (!variant.product.isActive) {
        // 400 without the "Validation failed:" prefix — this is a state error, not input.
        throw createHttpError(400, `Product is not available: ${variant.product.name}`);
      }
      if (variant.stock < item.quantity) {
        throw conflict(`Insufficient stock for ${variant.label}. Available: ${variant.stock}`);
      }

      // Unit price is resolved from the DB only: variant override, else product base.
      const unitPrice = new Prisma.Decimal(variant.price ?? variant.product.basePrice);
      const lineTotal = unitPrice.mul(item.quantity);

      return {
        variant,
        productId: variant.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const totalAmount = lines.reduce(
      (sum, line) => sum.add(line.lineTotal),
      new Prisma.Decimal(0),
    );

    // 10. Atomically decrement stock, guarded by `stock >= quantity`. If a concurrent
    // order grabbed the last units, updateMany affects 0 rows and we roll back.
    for (const line of lines) {
      const { count } = await tx.productVariant.updateMany({
        where: { id: line.variant.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (count !== 1) {
        throw conflict(`Insufficient stock for ${line.variant.label}. Available: ${line.variant.stock}`);
      }
    }

    // 8-9. Create the order and its line items (price snapshots) in one write.
    const order = await tx.order.create({
      data: {
        reference,
        customerName,
        customerEmail,
        shippingInfo,
        status: 'pending',
        totalAmount,
        items: {
          create: lines.map((line) => ({
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            productId: line.productId,
            variantId: line.variant.id,
          })),
        },
      },
    });

    // Shape the response. Decimal values stay as Prisma.Decimal so they serialize
    // as strings ("64.99") — never converted to Number in the backend.
    return {
      reference: order.reference,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: lines.map((line) => ({
        productName: line.variant.product.name,
        variantLabel: line.variant.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    };
  });
}

// Public checkout entry point. Retries only on a reference collision, regenerating
// the reference each time; after MAX_REFERENCE_ATTEMPTS it surfaces a 500. Business
// errors (404/400/409) propagate immediately and are never retried.
export async function checkout(input) {
  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      return await runCheckoutTransaction(input, generateOrderReference());
    } catch (err) {
      if (isReferenceCollision(err) && attempt < MAX_REFERENCE_ATTEMPTS) {
        continue;
      }
      if (isReferenceCollision(err)) {
        throw createHttpError(500, 'Could not generate a unique order reference. Please try again.', {
          expose: true,
        });
      }
      throw err;
    }
  }

  // Unreachable: the loop either returns or throws, but keeps the function total.
  throw createHttpError(500, 'Could not generate a unique order reference. Please try again.', {
    expose: true,
  });
}
