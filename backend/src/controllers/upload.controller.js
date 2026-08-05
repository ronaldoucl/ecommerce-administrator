import * as uploadService from '../services/uploadService.js';
import { validateImageUpload } from '../validators/upload.validator.js';

// Thin controller: validate the parsed file, call the service, shape the response.

// POST /api/uploads/image (protected)
// Accepts one multipart `file` field and returns the hosted image URL, ready to
// be placed in a product's `images` array.
export async function uploadImage(req, res, next) {
  try {
    const file = validateImageUpload(req.file);
    const image = await uploadService.uploadImage(file);
    return res.status(201).json(image);
  } catch (err) {
    return next(err);
  }
}
