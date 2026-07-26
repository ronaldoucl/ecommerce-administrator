import * as productService from '../services/product.service.js';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
} from '../validators/product.validator.js';
import { notFound } from '../utils/httpError.js';

// Thin controllers: validate/parse the request, call the service, shape the response.
// Validators and services throw errors carrying a `status`; errorHandler renders them
// as { "message": ... }.

// GET /api/products (protected)
export async function getProducts(req, res, next) {
  try {
    const products = await productService.getAllProducts();
    return res.status(200).json(products);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/featured (public)
// Returns the featured products with their images and variants. Per the contract,
// responds 404 when no product is currently featured.
export async function getFeaturedProducts(req, res, next) {
  try {
    const products = await productService.getFeaturedProducts();
    if (products.length === 0) {
      throw notFound('No featured products found');
    }
    return res.status(200).json(products);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/:id (public)
// Returns a single product with its images and variants; 404 if it does not exist.
export async function getProductById(req, res, next) {
  try {
    const id = validateProductId(req.params.id);
    const product = await productService.getProductById(id);
    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
}

// POST /api/products (protected)
export async function createProduct(req, res, next) {
  try {
    const data = validateCreateProduct(req.body);
    const product = await productService.createProduct(data);
    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/products/:id (protected)
export async function updateProduct(req, res, next) {
  try {
    const id = validateProductId(req.params.id);
    const data = validateUpdateProduct(req.body);
    const product = await productService.updateProduct(id, data);
    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/products/:id (protected)
// Soft delete: deactivates the product (isActive=false) instead of removing it,
// preserving order history that references it.
export async function deleteProduct(req, res, next) {
  try {
    const id = validateProductId(req.params.id);
    await productService.deleteProduct(id);
    return res.status(200).json({ message: 'Product deactivated' });
  } catch (err) {
    return next(err);
  }
}
