import multer from 'multer';

import { badRequest } from '../utils/httpError.js';
import { MAX_IMAGE_BYTES } from '../validators/upload.validator.js';

// Multipart parsing for the image upload endpoint.
//
// The file is kept in MEMORY, never written to disk: it is streamed straight on
// to Cloudinary by the upload service, so the API keeps no local state and works
// on hosts with an ephemeral filesystem (Render, Vercel).

const parseSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('file');

/**
 * Parse one `file` field from a multipart request into `req.file`.
 *
 * Multer reports its own limits as errors without a status, which would surface
 * as a 500. They are translated here into the shared 400 `{ message }` shape.
 */
export function uploadSingleImage(req, res, next) {
  parseSingleFile(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(badRequest(`file must be at most ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(badRequest('send exactly one image in a "file" field'));
    }

    return next(err);
  });
}
