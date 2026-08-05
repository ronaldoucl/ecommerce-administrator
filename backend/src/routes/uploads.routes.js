import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { uploadSingleImage } from '../middleware/uploadFile.js';

// Upload routes: /api/uploads
//
// Admin-only: requireAuth runs BEFORE the multipart parser, so an unauthenticated
// request is rejected without the server ever reading the uploaded bytes.
const router = Router();

router.post('/image', requireAuth, uploadSingleImage, uploadImage);

export default router;
