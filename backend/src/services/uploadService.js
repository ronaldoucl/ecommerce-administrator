import cloudinary from '../config/cloudinary.js';
import { config } from '../config/env.js';
import { createHttpError } from '../utils/httpError.js';

// Upload service — the ONLY place images are handed to Cloudinary.
//
// It deliberately touches no database: an upload just turns a file into a hosted
// URL. That URL is then sent back to the admin UI, which puts it in the product's
// `images` array like any hand-pasted URL — so the frozen schema (ProductImage.url)
// needs no change at all, and uploading stays optional.

/**
 * Upload an image and return its hosted URL.
 *
 * @param {{ buffer: Buffer, mimetype: string, originalName: string }} file
 * @returns {Promise<{ url: string, publicId: string, width: number, height: number,
 *   format: string, bytes: number }>}
 */
export async function uploadImage(file) {
  if (!config.cloudinary.enabled) {
    // 503 rather than 500: the service is fine, it just has no image host wired
    // up. `expose` keeps the message — it tells the admin exactly what to do,
    // and it is documented in API_CONTRACT.md.
    throw createHttpError(
      503,
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or paste an image URL instead.',
      { expose: true },
    );
  }

  // Cloudinary's upload() takes a data URI, which avoids having to bridge its
  // stream API onto the in-memory buffer multer produced.
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: config.cloudinary.folder,
    resource_type: 'image',
    // Cloudinary re-derives the type from the bytes, so a file with a lying
    // extension cannot be stored as something else.
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}
