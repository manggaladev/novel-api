import { Router } from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
} from '../controllers/follow.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Follows
 *   description: User follow management
 */

// Follow/unfollow
router.post('/:userId', authenticate, followUser);
router.delete('/:userId', authenticate, unfollowUser);

// Get followers/following
router.get('/followers/:userId', getFollowers);
router.get('/following/:userId', getFollowing);

// Check follow status
router.get('/status/:userId', optionalAuth, getFollowStatus);

export default router;
