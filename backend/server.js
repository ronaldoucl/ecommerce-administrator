import express from 'express';
import cors from 'cors';
import { config } from './src/config/env.js';
import router from './src/routes/index.js';
import { notFound } from './src/middleware/notFound.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// CORS. We allow whatever is in CLIENT_ORIGIN plus any *.vercel.app, so preview
// deployments work without adding each URL by hand. Requests with no Origin
// (curl, health checks) are allowed too. A blocked origin just gets no CORS
// headers back, and the browser does the rest.
const vercelDeployment = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin(origin, callback) {
    const isAllowed =
      !origin || config.clientOrigins.includes(origin) || vercelDeployment.test(origin);
    callback(null, isAllowed);
  },
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', router);

// These two go LAST or they would swallow the real routes.
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
