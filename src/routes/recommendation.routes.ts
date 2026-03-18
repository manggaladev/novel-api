import { Router } from 'express';
import {
  getRecommendations,
} from '../controllers/recommendation.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Personalized novel recommendations
 */

// All routes require authentication
router.get('/', auth, getRecommendations);

export default router;
