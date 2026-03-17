import { Router } from 'express';
import {
  getStats,
  getAllUsers,
  updateUserRole,
  getAllNovels,
  getActivity,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations
 */

// All routes require admin authentication
router.get('/stats', authenticate, getStats);
router.get('/users', authenticate, getAllUsers);
router.put('/users/:id/role', authenticate, updateUserRole);
router.get('/novels', authenticate, getAllNovels);
router.get('/activity', authenticate, getActivity);

export default router;
