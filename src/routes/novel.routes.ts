import { Router } from 'express';
import {
  getNovels,
  getNovelById,
  getNovelBySlug,
  createNovel,
  updateNovel,
  deleteNovel,
  getPopularNovels,
  getLatestNovels,
  getTrendingNovels,
} from '../controllers/novel.controller';
import { getSimilarNovels } from '../controllers/recommendation.controller';
import { validate } from '../middleware/validate.middleware';
import { auth, optionalAuth } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/auth.middleware';
import { uploadCover } from '../config/upload';
import {
  novelQuerySchema,
  novelIdSchema,
  novelSlugSchema,
  createNovelSchema,
  updateNovelSchema,
} from '../validation/novel.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Novels
 *   description: Novel management
 */

// Public routes
router.get('/', validate(novelQuerySchema), getNovels);
router.get('/trending', getTrendingNovels);
router.get('/popular', getPopularNovels);
router.get('/latest', getLatestNovels);
router.get('/slug/:slug', validate(novelSlugSchema), getNovelBySlug);
router.get('/:id/similar', validate(novelIdSchema), getSimilarNovels);
router.get('/:id', validate(novelIdSchema), optionalAuth, getNovelById);

// Protected routes (require auth)
// @ts-expect-error - multer type mismatch with express 5 types
router.post('/', auth, uploadCover.single('cover'), validate(createNovelSchema), createNovel);
// @ts-expect-error - multer type mismatch with express 5 types
router.put('/:id', auth, uploadCover.single('cover'), validate(updateNovelSchema), updateNovel);
router.delete('/:id', auth, validate(novelIdSchema), deleteNovel);

export default router;
