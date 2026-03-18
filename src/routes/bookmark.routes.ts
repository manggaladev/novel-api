import { Router } from 'express';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  checkBookmark,
} from '../controllers/bookmark.controller';
import { validate } from '../middleware/validate.middleware';
import { auth } from '../middleware/auth.middleware';
import { bookmarkQuerySchema, bookmarkParamsSchema } from '../validation/user.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookmarks
 *   description: User bookmarks
 */

// All bookmark routes require authentication
router.get('/', auth, validate(bookmarkQuerySchema), getBookmarks);
router.post('/:novelId', auth, validate(bookmarkParamsSchema), addBookmark);
router.delete('/:novelId', auth, validate(bookmarkParamsSchema), removeBookmark);
router.get('/:novelId/check', auth, validate(bookmarkParamsSchema), checkBookmark);

export default router;
