import dotenv from 'dotenv';

// Reads .env into process.env. `quiet` hides dotenv's banner so our logs stay
// clean. On Render there is no .env file — the variables come from the
// dashboard — and dotenv is fine with that.
dotenv.config({ quiet: true });

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// Falls back to the default for anything that is not a whole number >= 0
// (empty, "abc", "-1", "2.5").
function parseLowStockThreshold(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  return parsed;
}

// All the configuration in one place. Nothing else reads process.env directly.
export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '1d',
  // Variants at or below this stock count as low stock.
  lowStockThreshold: parseLowStockThreshold(process.env.LOW_STOCK_THRESHOLD),
  // Origins allowed by CORS. Comma-separated, e.g.
  //   CLIENT_ORIGIN=http://localhost:5173,https://your-app.vercel.app
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Customer emails go through Brevo's HTTP API — plain HTTPS, because Render's
  // free plan blocks the SMTP ports. The on/off switch is NOT here: it is store
  // configuration the admin edits (StoreSettings.emailEnabled).
  email: {
    apiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.MAIL_FROM_EMAIL || '',
    fromName: process.env.MAIL_FROM_NAME || 'Store',
  },
  // Cloudinary hosts uploaded product images. Optional: without it the upload
  // endpoint says so and you can still paste image URLs by hand.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'ecommerce-administrator/products',
  },
};

// The admin dashboard reads this (as `emailConfigured`) to explain why the
// notification switch is greyed out.
config.email.configured = Boolean(config.email.apiKey && config.email.fromEmail);

config.cloudinary.enabled = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);

// Crash at startup if a required secret is missing. Much easier to debug than an
// empty JWT_SECRET making every login fail later. We only print the names —
// never the values.
const REQUIRED_VARS = {
  DATABASE_URL: config.databaseUrl,
  JWT_SECRET: config.jwtSecret,
};

const missingVars = Object.entries(REQUIRED_VARS)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missingVars.join(', ')}. See .env.example.`,
  );
}
