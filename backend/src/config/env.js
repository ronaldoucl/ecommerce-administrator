import dotenv from 'dotenv';

// Load environment variables from the .env file into process.env.
// `quiet` suppresses dotenv's startup banner so production logs contain only our
// own output. In hosted environments the variables come from the dashboard and no
// .env file exists, which dotenv handles silently.
dotenv.config({ quiet: true });

// Default low-stock threshold when the env value is missing or invalid.
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// Parse LOW_STOCK_THRESHOLD as a non-negative integer, falling back to the
// default when the env value is absent or not a valid non-negative integer
// (e.g. empty, "abc", "-1", "2.5"). The schema is locked, so this threshold is
// configuration, not a database column.
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

// Central configuration object consumed across the app.
export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '1d',
  // Variants with stock at or below this threshold are flagged as low stock.
  // Configurable via LOW_STOCK_THRESHOLD; defaults to 5.
  lowStockThreshold: parseLowStockThreshold(process.env.LOW_STOCK_THRESHOLD),
  // Allowed frontend origins for CORS (comma-separated). Defaults to the local
  // Vite dev server. In production set CLIENT_ORIGIN to the deployed Vercel URL;
  // you may list several, e.g.
  //   CLIENT_ORIGIN=http://localhost:5173,https://your-app.vercel.app
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Customer notification emails (see src/services/emailService.js). Only the
  // Gmail credentials live here — the host and port are fixed by the provider,
  // and the on/off switch is store configuration, edited from the admin
  // dashboard and stored in StoreSettings.emailEnabled.
  // Customer notification emails go out through Brevo's HTTP API (plain HTTPS,
  // so it works on hosts that block outbound SMTP ports — Render's free plan
  // blocks 25/465/587). The on/off switch is NOT here: it is store
  // configuration, edited from the admin dashboard (StoreSettings.emailEnabled).
  email: {
    apiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.MAIL_FROM_EMAIL || '',
    fromName: process.env.MAIL_FROM_NAME || 'Store',
  },
  // Cloudinary hosts the product images uploaded from the admin panel. It is
  // optional: without credentials the upload endpoint reports that it is not
  // configured and the admin can still paste image URLs by hand.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    // Folder every upload lands in, so the store's assets stay grouped.
    folder: process.env.CLOUDINARY_FOLDER || 'ecommerce-administrator/products',
  },
};

// True only when the server can actually send: both the API key and a From
// address are needed. The admin dashboard reads this (as `emailConfigured`) to
// explain why the notification switch cannot be turned on yet.
config.email.configured = Boolean(config.email.apiKey && config.email.fromEmail);

// True only when all three Cloudinary credentials are present.
config.cloudinary.enabled = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);

// Fail fast at boot when a required secret is missing, instead of letting it surface
// later as an obscure runtime failure (an empty JWT secret makes every login throw).
// Only the variable NAMES are reported — values are never logged.
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
