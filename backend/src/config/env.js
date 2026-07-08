import dotenv from 'dotenv';

// Load environment variables from the .env file into process.env.
dotenv.config();

// Central configuration object consumed across the app.
export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '1d',
};
