import { Router } from 'express';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getMyComments,
} from '../controllers/comment.controller';
import { validate } from '../middleware/validate.middleware';
import { auth, optionalAuth } from '../middleware/auth.middleware';
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
  commentQuerySchema,
} from '../validation/comment.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Chapter comments
 */

// Public routes
router.get('/chapter/:chapterId', validate(commentQuerySchema), getComments);

// Protected routes (require auth)
router.get('/my', auth, getMyComments);
router.post('/chapter/:chapterId', auth, validate(createCommentSchema), addComment);
router.put('/:id', auth, validate(updateCommentSchema), updateComment);
router.delete('/:id', auth, validate(commentIdSchema), deleteComment);

export default router;
