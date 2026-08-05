// Barrel export for the service layer, so consumers can do:
//   import { authService, productService } from '../services';

export { default as api, AUTH_TOKEN_KEY } from './api';
export { default as authService } from './authService';
export { default as productService } from './productService';
export { default as variantService } from './variantService';
export { default as orderService } from './orderService';
export { default as checkoutService } from './checkoutService';
export { default as settingsService } from './settingsService';
export { default as uploadService } from './uploadService';
export { default as analyticsService } from './analyticsService';
export { default as healthService } from './healthService';
