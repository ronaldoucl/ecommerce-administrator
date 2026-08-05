import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { notFound, conflict, createHttpError } from '../utils/httpError.js';
import { generateOrderReference } from '../utils/orderReference.js';

// The checkout flow. Money is Prisma.Decimal the whole way through — never plain
// JS numbers — so nothing loses cents and totals go out as strings ("129.98").

const MAX_REFERENCE_ATTEMPTS = 5;

// Did we generate a reference that already exists? That is the one error we retry.
function isReferenceCollision(err) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    err.meta.target.includes('reference')
  );
}

// The whole checkout in one transaction: if anything throws, nothing happened —
// no order, no items, no stock touched.
async function runCheckoutTransaction(input, reference) {
  const { customerName, customerEmail, shippingInfo, items } = input;
  const variantIds = items.map((item) => item.variantId);

  return prisma.$transaction(async (tx) => {
    // Fetch every variant (and its product) in one query.
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    // Check everything and work out the prices BEFORE writing anything, so a bad
    // request is rejected without leaving half an order behind.
    const lines = items.map((item) => {
      const variant = variantById.get(item.variantId);
      if (!variant) {
        throw notFound(`Variant not found: ${item.variantId}`);
      }
      if (!variant.product.isActive) {
        // 400 with no "Validation failed:" prefix — the input was fine, the
        // product just is not for sale.
        throw createHttpError(400, `Product is not available: ${variant.product.name}`);
      }
      if (variant.stock < item.quantity) {
        throw conflict(`Insufficient stock for ${variant.label}. Available: ${variant.stock}`);
      }

      // Price always comes from the database: the variant's own, or the
      // product's if the variant has none. Never from the request.
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

    // Take the stock with `stock >= quantity` built into the WHERE. If someone
    // else bought the last units a moment ago, this updates 0 rows and we bail
    // out — that is what stops two people buying the same last item.
    for (const line of lines) {
      const { count } = await tx.productVariant.updateMany({
        where: { id: line.variant.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (count !== 1) {
        throw conflict(`Insufficient stock for ${line.variant.label}. Available: ${line.variant.stock}`);
      }
    }

    // Order + line items in one write. The items keep a copy of the price so the
    // order total never changes if the product is repriced later.
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

// Entry point. Retries ONLY when the reference collided, with a new one each
// time. Real errors (404/400/409) go straight up and are never retried.
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

  // Never runs — the loop always returns or throws — but it keeps the function
  // honest for anyone reading it.
  throw createHttpError(500, 'Could not generate a unique order reference. Please try again.', {
    expose: true,
  });
}
