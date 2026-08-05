import cloudinary from '../config/cloudinary.js';
import { config } from '../config/env.js';
import { createHttpError } from '../utils/httpError.js';

// The only place we talk to Cloudinary.
//
// It never touches the database. An upload just turns a file into a hosted URL,
// and the admin UI then saves that URL in the product's images like any other.
// That is why uploading is optional and why ProductImage only stores a url.

export async function uploadImage(file) {
  if (!config.cloudinary.enabled) {
    // 503, not 500: nothing is broken, there is just no image host set up. We
    // keep the message visible because it tells the admin exactly what to do.
    throw createHttpError(
      503,
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or paste an image URL instead.',
      { expose: true },
    );
  }

  // Cloudinary accepts a data URI, which saves us from wiring its stream API up
  // to the in-memory buffer multer gave us.
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: config.cloudinary.folder,
    resource_type: 'image',
    // Cloudinary works the real type out from the bytes, so renaming a file to
    // .jpg does not get it stored as an image.
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
