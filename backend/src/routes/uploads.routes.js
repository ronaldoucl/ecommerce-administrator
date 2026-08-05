import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { uploadSingleImage } from '../middleware/uploadFile.js';

// /api/uploads
//
// Admin only, and requireAuth runs BEFORE the file parser on purpose — a
// stranger's upload is rejected before we read a single byte of it.
const router = Router();

router.post('/image', requireAuth, uploadSingleImage, uploadImage);

export default router;
