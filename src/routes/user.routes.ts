import { Router } from 'express';
import { getUserProfile, updateProfile, getUserNovels } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

router.get('/:id', getUserProfile);
router.get('/:id/novels', getUserNovels);
router.put('/profile', authenticate, updateProfile);

export default router;
