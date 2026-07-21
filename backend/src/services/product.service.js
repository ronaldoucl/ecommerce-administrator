import prisma from '../config/prisma.js';
import { notFound } from '../utils/httpError.js';

// Product service — the ONLY place products touch Prisma.
//
// Decimal note: Prisma returns `basePrice` as a Decimal instance whose toJSON()
// yields a string, so it serializes as "49.90" (never NaN), matching the contract.

// Products are always returned with their images and variants attached.
const productInclude = { images: true, variants: true };

// Business rule: only one product is featured at a time.
// Clears isFeatured on every OTHER product. Must run inside the caller's
// transaction (`tx`) so featuring and unfeaturing commit together.
async function unfeatureOthers(tx, productId) {
  await tx.product.updateMany({
    where: { id: { not: productId }, isFeatured: true },
    data: { isFeatured: false },
  });
}

// Return all products (admin listing — includes inactive ones).
export async function getAllProducts() {
  return prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// Public storefront: return featured products with their images and variants.
// The "one featured at a time" rule means this is normally a single-item array,
// but the contract shape is a list. Inactive products are excluded — a deactivated
// product must never surface on the storefront even if still flagged as featured.
export async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isFeatured: true, isActive: true },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// Public storefront: return a single product with its images and variants.
// Throws 404 if it does not exist.
export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) throw notFound('Product not found');
  return product;
}

// Create a product, optionally with inline images. If it is created as featured,
// every other product is unfeatured in the same transaction.
export async function createProduct(data) {
  const { images, ...productData } = data;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...productData,
        ...(images?.length ? { images: { create: images } } : {}),
      },
      include: productInclude,
    });

    if (product.isFeatured) {
      await unfeatureOthers(tx, product.id);
    }

    return product;
  });
}

// Update the provided fields of a product. Throws 404 if it does not exist.
// Featuring it unfeatures every other product in the same transaction.
export async function updateProduct(id, data) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Product not found');

    const product = await tx.product.update({
      where: { id },
      data,
      include: productInclude,
    });

    if (product.isFeatured) {
      await unfeatureOthers(tx, product.id);
    }

    return product;
  });
}

// Delete a product along with its images and variants. Throws 404 if it does not exist.
//
// TODO Sprint 3: switch to soft-delete (isActive=false) once OrderItem references
// products, to preserve order history.
export async function deleteProduct(id) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Product not found');

    // The schema already cascades on delete; clearing the children explicitly keeps
    // the intent visible and independent of the FK configuration.
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
}
