import { v2 as cloudinary } from 'cloudinary';

import { config } from './env.js';

// The only place the Cloudinary SDK is set up, same idea as config/prisma.js.
//
// The credentials are optional, so we configure the client even when they are
// empty — that way importing this file never throws. What stops us calling
// Cloudinary with blank credentials is config.cloudinary.enabled, which the
// upload service checks first.
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true, // https URLs only
});

export default cloudinary;
