import dotenv from 'dotenv';

// Load environment variables from the .env file into process.env.
dotenv.config();

// Central configuration object consumed across the app.
export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '1d',
  // Allowed frontend origins for CORS (comma-separated). Defaults to the local
  // Vite dev server. In production set CLIENT_ORIGIN to the deployed Vercel URL;
  // you may list several, e.g.
  //   CLIENT_ORIGIN=http://localhost:5173,https://your-app.vercel.app
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
