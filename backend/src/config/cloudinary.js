import { v2 as cloudinary } from 'cloudinary';

import { config } from './env.js';

// Configured Cloudinary client — the ONLY place the SDK is set up, mirroring how
// src/config/prisma.js owns the database client. Services import it from here.
//
// The credentials are optional: when they are missing the client is still built
// (so importing this module never throws) but `config.cloudinary.enabled` is
// false and the upload service refuses the request with a clear message instead
// of calling out to Cloudinary with empty credentials.
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true, // always return https URLs
});

export default cloudinary;
