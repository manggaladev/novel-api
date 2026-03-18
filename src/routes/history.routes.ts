import { Router } from 'express';
import {
  getReadingHistory,
  deleteHistoryEntry,
  clearHistory,
  getContinueReading,
} from '../controllers/readingHistory.controller';
import { validate } from '../middleware/validate.middleware';
import { auth } from '../middleware/auth.middleware';
import { historyQuerySchema } from '../validation/user.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reading History
 *   description: User reading history
 */

// All reading history routes require authentication
router.get('/', auth, validate(historyQuerySchema), getReadingHistory);
router.delete('/', auth, clearHistory);
router.delete('/:id', auth, deleteHistoryEntry);
router.get('/continue/:novelId', auth, getContinueReading);

export default router;
