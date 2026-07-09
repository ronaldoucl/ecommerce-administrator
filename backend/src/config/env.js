import dotenv from 'dotenv';

// Load environment variables from the .env file into process.env.
dotenv.config();

// Central configuration object consumed across the app.
export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '1d',
  // Allowed frontend origin for CORS. Defaults to the local Vite dev server.
  // TODO: set CLIENT_ORIGIN to the deployed Vercel URL once the frontend is deployed.
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
