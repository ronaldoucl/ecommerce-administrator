import multer from 'multer';

import { badRequest } from '../utils/httpError.js';
import { MAX_IMAGE_BYTES } from '../validators/upload.validator.js';

// Reads the multipart body for the image upload endpoint.
//
// The file stays in memory and never hits the disk — the upload service pipes it
// straight to Cloudinary. That also means we do not depend on a writable
// filesystem, which hosts like Render do not really give us.

const parseSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('file');

// Puts the file in req.file.
//
// Multer throws its limit errors without a status, so they would come out as a
// 500. We turn them into normal 400s here.
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
