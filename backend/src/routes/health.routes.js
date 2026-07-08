import { Router } from 'express';

// Health check route: GET /api/health.
const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
