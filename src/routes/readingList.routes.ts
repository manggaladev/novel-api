import { Router } from 'express';
import {
  getMyReadingLists,
  getReadingList,
  createReadingList,
  updateReadingList,
  deleteReadingList,
  addNovelToList,
  removeNovelFromList,
} from '../controllers/readingList.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reading Lists
 *   description: Reading list management
 */

// My reading lists
router.get('/', authenticate, getMyReadingLists);
router.post('/', authenticate, createReadingList);

// Single reading list
router.get('/:id', getReadingList);
router.put('/:id', authenticate, updateReadingList);
router.delete('/:id', authenticate, deleteReadingList);

// Add/remove novels
router.post('/:id/novels/:novelId', authenticate, addNovelToList);
router.delete('/:id/novels/:novelId', authenticate, removeNovelFromList);

export default router;
