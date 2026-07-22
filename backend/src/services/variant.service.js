import prisma from '../config/prisma.js';
import { notFound } from '../utils/httpError.js';

// Variant service — the ONLY place variants touch Prisma.
//
// Decimal note: `price` is a nullable Decimal. Prisma returns a Decimal instance
// (serialized to a string like "54.90") or null, so it never becomes NaN.

// Add a variant to a product. Throws 404 if the parent product does not exist.
export async function addVariant(productId, data) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Product not found');

  return prisma.productVariant.create({
    data: { ...data, productId },
  });
}

// Update the provided fields of a variant. Throws 404 if it does not exist.
export async function updateVariant(id, data) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variant not found');

  return prisma.productVariant.update({ where: { id }, data });
}

// Delete a variant. Throws 404 if it does not exist.
export async function deleteVariant(id) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw notFound('Variant not found');

  await prisma.productVariant.delete({ where: { id } });
}
