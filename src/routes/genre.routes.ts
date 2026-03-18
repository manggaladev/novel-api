import { Router } from 'express';
import {
  getGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
} from '../controllers/genre.controller';
import { validate } from '../middleware/validate.middleware';
import { auth, isAdmin } from '../middleware/auth.middleware';
import {
  genreQuerySchema,
  genreIdSchema,
  createGenreSchema,
  updateGenreSchema,
} from '../validation/genre.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Genres
 *   description: Genre management
 */

// Public routes
router.get('/', validate(genreQuerySchema), getGenres);
router.get('/:id', validate(genreIdSchema), getGenreById);

// Admin only routes
router.post('/', auth, isAdmin, validate(createGenreSchema), createGenre);
router.put('/:id', auth, isAdmin, validate(updateGenreSchema), updateGenre);
router.delete('/:id', auth, isAdmin, validate(genreIdSchema), deleteGenre);

export default router;
