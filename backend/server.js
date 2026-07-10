import express from 'express';
import cors from 'cors';
import { config } from './src/config/env.js';
import router from './src/routes/index.js';
import { notFound } from './src/middleware/notFound.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// CORS: allow the origins configured in CLIENT_ORIGIN (comma-separated) plus any
// Vercel deployment (*.vercel.app) so preview deployments also work. Requests
// without an Origin header (curl, health checks, server-to-server) are allowed.
// Disallowed origins simply receive no CORS headers, so the browser blocks them.
const vercelDeployment = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin(origin, callback) {
    const isAllowed =
      !origin || config.clientOrigins.includes(origin) || vercelDeployment.test(origin);
    callback(null, isAllowed);
  },
};

// Global middleware
app.use(cors(corsOptions));
app.use(express.json());

// Application routers
app.use('/api', router);

// Fallback middleware — must be mounted LAST
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
