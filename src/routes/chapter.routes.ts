import { Router } from 'express';
import {
  getChapters,
  getChapterById,
  getChapterByNumber,
  createChapter,
  updateChapter,
  deleteChapter,
  getScheduledChapters,
} from '../controllers/chapter.controller';
import { validate } from '../middleware/validate.middleware';
import { auth, optionalAuth } from '../middleware/auth.middleware';
import {
  chapterQuerySchema,
  chapterIdSchema,
  chapterByNovelSchema,
  createChapterSchema,
  updateChapterSchema,
} from '../validation/chapter.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chapters
 *   description: Chapter management
 */

// Public routes
router.get('/scheduled', auth, getScheduledChapters);
router.get('/novel/:novelId', validate(chapterQuerySchema), getChapters);
router.get('/:id', validate(chapterIdSchema), optionalAuth, getChapterById);
router.get('/novel/:novelId/:chapterNum', validate(chapterByNovelSchema), optionalAuth, getChapterByNumber);

// Protected routes (require auth)
router.post('/novel/:novelId', auth, validate(createChapterSchema), createChapter);
router.put('/:id', auth, validate(updateChapterSchema), updateChapter);
router.delete('/:id', auth, validate(chapterIdSchema), deleteChapter);

export default router;
