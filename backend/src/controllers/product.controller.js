import * as productService from '../services/product.service.js';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
} from '../validators/product.validator.js';
import { notFound } from '../utils/httpError.js';

// Thin controllers: validate/parse the request, call the service, shape the response.
// Validators and services throw errors carrying a `status`; Express 5 forwards a
// rejected async handler to errorHandler on its own, which renders them as
// { "message": ... } — so no controller needs its own try/catch.

// GET /api/products (protected)
export async function getProducts(req, res) {
  const products = await productService.getAllProducts();
  return res.status(200).json(products);
}

// GET /api/products/featured (public)
// Returns the featured products with their images and variants. Per the contract,
// responds 404 when no product is currently featured.
export async function getFeaturedProducts(req, res) {
  const products = await productService.getFeaturedProducts();
  if (products.length === 0) {
    throw notFound('No featured products found');
  }
  return res.status(200).json(products);
}

// GET /api/products/:id (public)
// Returns a single product with its images and variants; 404 if it does not exist.
export async function getProductById(req, res) {
  const id = validateProductId(req.params.id);
  const product = await productService.getProductById(id);
  return res.status(200).json(product);
}

// POST /api/products (protected)
export async function createProduct(req, res) {
  const data = validateCreateProduct(req.body);
  const product = await productService.createProduct(data);
  return res.status(201).json(product);
}

// PUT /api/products/:id (protected)
export async function updateProduct(req, res) {
  const id = validateProductId(req.params.id);
  const data = validateUpdateProduct(req.body);
  const product = await productService.updateProduct(id, data);
  return res.status(200).json(product);
}

// DELETE /api/products/:id (protected)
// Soft delete: deactivates the product (isActive=false) instead of removing it,
// preserving order history that references it.
export async function deleteProduct(req, res) {
  const id = validateProductId(req.params.id);
  await productService.deleteProduct(id);
  return res.status(200).json({ message: 'Product deactivated' });
}
