import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { notFound } from '../utils/httpError.js';
import { DEFAULT_VARIANT_LABEL } from '../utils/variants.js';

// All the product logic. Nothing else touches Prisma for products.
//
// About prices: Prisma gives us `basePrice` as a Decimal object, and its
// toJSON() returns a string, so it goes out as "49.90" and never loses cents.

// Products always come back with their images and variants. Images are ordered
// by id, so the gallery keeps the order it was saved in and the first one is the
// main image.
const productInclude = { images: { orderBy: { id: 'asc' } }, variants: true };

// Adds the stock flags every product read exposes. We calculate them from the
// live stock instead of storing them, so they can never go stale:
//   variant.isLowStock   - still has stock, but at or below the threshold
//   variant.isOutOfStock - stock is 0
//   product.hasLowStock  - at least one variant is low
//   product.isOutOfStock - it has variants and every one of them is at 0
// Spreading keeps the Decimal price objects intact so they still serialize as
// strings.
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

// "The storefront only shows active products", written once. One version for
// queries, one for checking a record we already have.
const publicVisibilityWhere = { isActive: true };
function isPubliclyVisible(product) {
  return product.isActive === true;
}

// Only one product can be featured at a time, so featuring one clears the rest.
// Runs inside the caller's transaction so both changes commit together.
async function unfeatureOthers(tx, productId) {
  await tx.product.updateMany({
    where: { id: { not: productId }, isFeatured: true },
    data: { isFeatured: false },
  });
}

// Admin list — inactive products included.
export async function getAllProducts() {
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(withStockFlags);
}

// Storefront home. Usually one product because of the featured rule, but the
// contract says list. Inactive products are filtered out — deactivating one has
// to hide it even if it is still flagged as featured.
export async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { isFeatured: true, ...publicVisibilityWhere },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(withStockFlags);
}

// Storefront product page. A deactivated product gives the same 404 as one that
// never existed, so customers cannot tell the difference.
export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product || !isPubliclyVisible(product)) throw notFound('Product not found');
  return withStockFlags(product);
}

// Every product is born with exactly one variant, so it is never left in the
// unsellable state of having nowhere to keep stock. `initialVariant` is what the
// admin filled in on the create form; without it we fall back to an empty
// "Default" one, and the product stays out of stock until someone sets it.
//
// Further variants (sizes, colours) are added afterwards from the product page,
// where this first one can also be renamed or deleted.
export async function createProduct(data) {
  const { images, initialVariant, ...productData } = data;

  const firstVariant = {
    label: initialVariant?.label ?? DEFAULT_VARIANT_LABEL,
    stock: initialVariant?.stock ?? 0,
  };

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...productData,
        ...(images?.length ? { images: { create: images } } : {}),
        variants: { create: [firstVariant] },
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

// Makes the gallery match `images` exactly.
//
// ProductImage has no position column, so the order of the rows IS the gallery
// order and the first row is the main image. That is why this cares about order:
// if the urls already match one for one we only refresh the alt texts (no rows
// are touched); otherwise we wipe the gallery and rebuild it in the order given.
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

  // One at a time instead of createMany, so the ids come out in array order and
  // the gallery order is predictable.
  for (const image of images) {
    await tx.productImage.create({ data: { ...image, productId } });
  }
}

// Updates only the fields that were sent. If `images` is included the gallery is
// rewritten to match it.
export async function updateProduct(id, data) {
  const { images, ...productData } = data;

  const product = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Product not found');

    if (images !== undefined) {
      await syncProductImages(tx, id, images);
    }

    // Products created before the default-variant rule have none, which makes
    // them impossible to buy. Give them one on the next save.
    const variantCount = await tx.productVariant.count({ where: { productId: id } });
    if (variantCount === 0) {
      await tx.productVariant.create({ data: { productId: id, label: DEFAULT_VARIANT_LABEL } });
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

// Soft delete: we deactivate instead of deleting so old orders still point at a
// real product. We also clear isFeatured, or a deactivated product would still
// be the featured one.
export async function deleteProduct(id) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Product not found');

  await prisma.product.update({
    where: { id },
    data: { isActive: false, isFeatured: false },
  });
}
