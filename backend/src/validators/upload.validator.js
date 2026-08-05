// Checks the uploaded file. Multer has already enforced the size limit by the
// time we run, so what is left is making sure the field is actually there and
// the content type is one we want.

import { badRequest } from '../utils/httpError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// An allowlist, not a blocklist: anything unexpected (an SVG, a PDF, an HTML
// file renamed to .jpg) gets rejected instead of being hosted and served back
// to shoppers.
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

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
