import prisma from '../config/prisma.js';
import { notFound, conflict } from '../utils/httpError.js';

// Variant logic. `price` is nullable — null means "charge the product's
// basePrice" — and Prisma hands it back as a Decimal or null, never NaN.

export async function addVariant(productId, data) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Product not found');

  return prisma.productVariant.create({
    data: { ...data, productId },
  });
}

export async function updateVariant(id, data) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variant not found');

  return prisma.productVariant.update({ where: { id }, data });
}

// Real delete, unlike products. But if any order references the variant we
// refuse with 409, otherwise we would wreck that order's history.
export async function deleteVariant(id) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variant not found');

  const orderItemCount = await prisma.orderItem.count({ where: { variantId: id } });
  if (orderItemCount > 0) {
    throw conflict('Variant cannot be deleted because it belongs to existing orders');
  }

  await prisma.productVariant.delete({ where: { id } });
}
