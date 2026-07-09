import express from 'express';
import cors from 'cors';
import { config } from './src/config/env.js';
import router from './src/routes/index.js';
import { notFound } from './src/middleware/notFound.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// Global middleware
// CORS is restricted to the configured frontend origin (CLIENT_ORIGIN).
app.use(cors({ origin: config.clientOrigin }));
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
