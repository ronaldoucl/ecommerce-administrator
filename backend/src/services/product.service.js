import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { notFound } from '../utils/httpError.js';

// Product service — the ONLY place products touch Prisma.
//
// Decimal note: Prisma returns `basePrice` as a Decimal instance whose toJSON()
// yields a string, so it serializes as "49.90" (never NaN), matching the contract.

// Products are always returned with their images and variants attached.
// Images are ordered by id so every read returns the gallery in its stored
// order — the first image is the product's primary one.
const productInclude = { images: { orderBy: { id: 'asc' } }, variants: true };

// Attach computed stock flags to a product and its variants. These are derived
// in the service from the live `stock` value (never stored) so every product
// read exposes the same low-stock / out-of-stock signal:
//   - variant.isLowStock   — in stock but at or below the configured threshold
//   - variant.isOutOfStock — stock is exactly 0
//   - product.hasLowStock  — any variant is low stock
//   - product.isOutOfStock — the product has variants and ALL of them are at 0
// Spreading preserves the Decimal `price`/`basePrice` instances, so monetary
// values still serialize as strings.
function withStockFlags(product) {
  const variants = (product.variants ?? []).map((variant) => ({
    ...variant,
    isLowStock: variant.stock > 0 && variant.stock <= config.lowStockThreshold,
    isOutOfStock: variant.stock === 0,
  }));

  return {
    ...product,
    variants,
    hasLowStock: variants.some((variant) => variant.isLowStock),
    isOutOfStock: variants.length > 0 && variants.every((variant) => variant.isOutOfStock),
  };
}

// Single source of truth for the "public products must be active" rule.
// Soft-deleted products (isActive=false) are hidden from the storefront.
// Used both as a Prisma `where` fragment (list queries) and as a predicate
// (single-record reads), so the rule lives in exactly one place.
const publicVisibilityWhere = { isActive: true };
function isPubliclyVisible(product) {
  return product.isActive === true;
}

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
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(withStockFlags);
}

// Public storefront: return featured products with their images and variants.
// The "one featured at a time" rule means this is normally a single-item array,
// but the contract shape is a list. Inactive products are excluded — a deactivated
// product must never surface on the storefront even if still flagged as featured.
export async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { isFeatured: true, ...publicVisibilityWhere },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(withStockFlags);
}

// Public storefront: return a single product with its images and variants.
// Throws 404 if it does not exist or has been soft-deleted (isActive=false),
// so a deactivated product is indistinguishable from a missing one publicly.
export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product || !isPubliclyVisible(product)) throw notFound('Product not found');
  return withStockFlags(product);
}

// Create a product, optionally with inline images. If it is created as featured,
// every other product is unfeatured in the same transaction.
export async function createProduct(data) {
  const { images, ...productData } = data;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...productData,
        ...(images?.length ? { images: { create: images } } : {}),
      },
      include: productInclude,
    });

    if (created.isFeatured) {
      await unfeatureOthers(tx, created.id);
    }

    return created;
  });

  return withStockFlags(product);
}

// Sync a product's gallery to match `images` exactly, inside the caller's
// transaction (`tx`) so the product update and its gallery commit together.
//
// ProductImage has no position column (the schema is frozen), so the gallery
// order IS the row creation order and the first row is the primary image. That
// makes the sync order-sensitive:
//   - when the incoming urls already match the stored ones in the same order,
//     only the alt texts are refreshed and no row is churned;
//   - otherwise the gallery is rebuilt in the requested order, which removes the
//     images that are no longer present and creates the new ones in one pass.
async function syncProductImages(tx, productId, images) {
  const existing = await tx.productImage.findMany({
    where: { productId },
    orderBy: { id: 'asc' },
  });

  const sameOrder =
    existing.length === images.length &&
    existing.every((image, index) => image.url === images[index].url);

  if (sameOrder) {
    for (const [index, image] of existing.entries()) {
      if (image.alt !== images[index].alt) {
        await tx.productImage.update({
          where: { id: image.id },
          data: { alt: images[index].alt },
        });
      }
    }
    return;
  }

  await tx.productImage.deleteMany({ where: { productId } });

  // Created one by one (not createMany) so the ids — and therefore the gallery
  // order — follow the array order deterministically.
  for (const image of images) {
    await tx.productImage.create({ data: { ...image, productId } });
  }
}

// Update the provided fields of a product. Throws 404 if it does not exist.
// Featuring it unfeatures every other product in the same transaction.
// When `images` is provided, the gallery is synced to match it exactly.
export async function updateProduct(id, data) {
  const { images, ...productData } = data;

  const product = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Product not found');

    if (images !== undefined) {
      await syncProductImages(tx, id, images);
    }

    const updated = await tx.product.update({
      where: { id },
      data: productData,
      include: productInclude,
    });

    if (updated.isFeatured) {
      await unfeatureOthers(tx, updated.id);
    }

    return updated;
  });

  return withStockFlags(product);
}

// Soft-delete a product: deactivate it instead of removing the row, so order
// history that references it (OrderItem) is preserved. Clearing isFeatured keeps
// a deactivated product out of the storefront's featured list. Throws 404 if it
// does not exist.
export async function deleteProduct(id) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Product not found');

  await prisma.product.update({
    where: { id },
    data: { isActive: false, isFeatured: false },
  });
}
