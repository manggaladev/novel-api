import { Router } from 'express';
import {
  getProgress,
  updateProgress,
  getRecentProgress,
} from '../controllers/progress.controller';
import { auth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reading Progress
 *   description: Track reading progress across novels
 */

// Validation schemas
const progressParamsSchema = z.object({
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
});

const updateProgressSchema = z.object({
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
    chapterId: z.string().uuid('Invalid chapter ID'),
  }),
  body: z.object({
    progress: z.number().min(0).max(100).optional(),
  }),
});

// All routes require authentication
router.get('/recent', auth, getRecentProgress);
router.get('/:novelId', auth, validate(progressParamsSchema), getProgress);
router.put('/:novelId/:chapterId', auth, validate(updateProgressSchema), updateProgress);

export default router;
