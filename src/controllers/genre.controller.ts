import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta, generateSlug, sanitizeString } from '../utils/helpers';

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Get all genres
 *     tags: [Genres]
 */
export const getGenres: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query as any;
    const skip = (page - 1) * limit;

    const [genres, total] = await Promise.all([
      prisma.genre.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { novels: true },
          },
        },
      }),
      prisma.genre.count(),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: genres,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/genres/{id}:
 *   get:
 *     summary: Get genre by ID
 *     tags: [Genres]
 */
export const getGenreById: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        _count: {
          select: { novels: true },
        },
      },
    });

    if (!genre) {
      res.status(404).json({
        success: false,
        error: 'Genre not found',
      });
      return;
    }

    res.json({
      success: true,
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/genres:
 *   post:
 *     summary: Create a new genre (Admin only)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 */
export const createGenre: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;

    const slug = generateSlug(name);

    // Check if slug already exists
    const existingGenre = await prisma.genre.findUnique({
      where: { slug },
    });

    if (existingGenre) {
      res.status(409).json({
        success: false,
        error: 'Genre already exists',
      });
      return;
    }

    const genre = await prisma.genre.create({
      data: {
        name: sanitizeString(name),
        slug,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Genre created successfully',
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/genres/{id}:
 *   put:
 *     summary: Update a genre (Admin only)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 */
export const updateGenre: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const existingGenre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existingGenre) {
      res.status(404).json({
        success: false,
        error: 'Genre not found',
      });
      return;
    }

    let slug = existingGenre.slug;
    if (name && name !== existingGenre.name) {
      slug = generateSlug(name);
      
      // Check if new slug conflicts
      const conflictGenre = await prisma.genre.findFirst({
        where: { slug, NOT: { id } },
      });

      if (conflictGenre) {
        res.status(409).json({
          success: false,
          error: 'Genre name already exists',
        });
        return;
      }
    }

    const genre = await prisma.genre.update({
      where: { id },
      data: {
        name: name ? sanitizeString(name) : undefined,
        slug,
      },
    });

    res.json({
      success: true,
      message: 'Genre updated successfully',
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/genres/{id}:
 *   delete:
 *     summary: Delete a genre (Admin only)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 */
export const deleteGenre: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const genre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      res.status(404).json({
        success: false,
        error: 'Genre not found',
      });
      return;
    }

    await prisma.genre.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Genre deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
