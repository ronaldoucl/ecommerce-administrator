// Validation for the image upload endpoint.
//
// Same style as the other validators: dependency-free checks that return a
// NORMALIZED value for the service, or throw a 400 error (see src/utils/httpError.js).
// Multer has already enforced the byte limit by the time this runs; these checks
// cover what it cannot (the field being present, and the actual content type).

import { badRequest } from '../utils/httpError.js';

/** Maximum accepted size. Also enforced by multer, which rejects earlier. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Image formats the storefront can display. Deliberately an allowlist: an
 * unexpected type (SVG, PDF, HTML renamed to .jpg) is rejected rather than
 * uploaded and served back to shoppers.
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

/**
 * Validate the uploaded file and return what the service needs.
 *
 * @param {{ buffer: Buffer, mimetype: string, size: number, originalname: string }} [file]
 * @returns {{ buffer: Buffer, mimetype: string, originalName: string }}
 */
export function validateImageUpload(file) {
  if (!file || !file.buffer) {
    throw badRequest('an image file is required in the "file" field');
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw badRequest(`file type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw badRequest(`file must be at most ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
  }

  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalName: file.originalname || 'image',
  };
}
