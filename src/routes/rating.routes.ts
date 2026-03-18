import { Router } from 'express';
import {
  getRatings,
  rateNovel,
  getMyRating,
  removeRating,
} from '../controllers/rating.controller';
import { validate } from '../middleware/validate.middleware';
import { auth, optionalAuth } from '../middleware/auth.middleware';
import { createRatingSchema, ratingQuerySchema } from '../validation/rating.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Novel ratings
 */

// Public routes
router.get('/:novelId', validate(ratingQuerySchema), getRatings);
router.get('/:novelId/me', optionalAuth, getMyRating);

// Protected routes (require auth)
router.post('/:novelId', auth, validate(createRatingSchema), rateNovel);
router.delete('/:novelId', auth, removeRating);

export default router;
