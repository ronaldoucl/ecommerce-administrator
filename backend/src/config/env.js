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
};

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
