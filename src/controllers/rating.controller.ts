import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta, calculateAverageRating } from '../utils/helpers';

/**
 * @swagger
 * /api/novels/{novelId}/ratings:
 *   get:
 *     summary: Get ratings for a novel
 *     tags: [Ratings]
 */
export const getRatings: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const novelId = req.params.novelId as string;
    const { page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where: { novelId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
      prisma.rating.count({ where: { novelId } }),
    ]);

    // Get rating statistics
    const allRatings = await prisma.rating.findMany({
      where: { novelId },
      select: { score: true },
    });

    const stats = {
      average: calculateAverageRating(allRatings),
      total: allRatings.length,
      distribution: {
        5: allRatings.filter(r => r.score === 5).length,
        4: allRatings.filter(r => r.score === 4).length,
        3: allRatings.filter(r => r.score === 3).length,
        2: allRatings.filter(r => r.score === 2).length,
        1: allRatings.filter(r => r.score === 1).length,
      },
    };

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: { ratings, stats },
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/ratings:
 *   post:
 *     summary: Rate a novel
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
export const rateNovel: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;
    const { score } = req.body;

    // Check if novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    // Check if already rated
    const existingRating = await prisma.rating.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    let rating;

    if (existingRating) {
      // Update existing rating
      rating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { score },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });
    } else {
      // Create new rating
      rating = await prisma.rating.create({
        data: {
          userId: req.user.id,
          novelId,
          score,
        },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });
    }

    // Update novel's average rating
    const allRatings = await prisma.rating.findMany({
      where: { novelId },
      select: { score: true },
    });

    const averageRating = calculateAverageRating(allRatings);

    await prisma.novel.update({
      where: { id: novelId },
      data: { averageRating },
    });

    res.json({
      success: true,
      message: existingRating ? 'Rating updated successfully' : 'Novel rated successfully',
      data: rating,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/ratings/me:
 *   get:
 *     summary: Get user's rating for a novel
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
export const getMyRating: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        data: { rating: null },
      });
      return;
    }

    const novelId = req.params.novelId as string;

    const rating = await prisma.rating.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    res.json({
      success: true,
      data: { rating },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/ratings:
 *   delete:
 *     summary: Remove rating from a novel
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 */
export const removeRating: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;

    const rating = await prisma.rating.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    if (!rating) {
      res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
      return;
    }

    await prisma.rating.delete({
      where: { id: rating.id },
    });

    // Update novel's average rating
    const allRatings = await prisma.rating.findMany({
      where: { novelId },
      select: { score: true },
    });

    const averageRating = allRatings.length > 0 ? calculateAverageRating(allRatings) : 0;

    await prisma.novel.update({
      where: { id: novelId },
      data: { averageRating },
    });

    res.json({
      success: true,
      message: 'Rating removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
