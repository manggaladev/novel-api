import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta } from '../utils/helpers';

/**
 * @swagger
 * /api/reading-history:
 *   get:
 *     summary: Get user's reading history
 *     tags: [Reading History]
 *     security:
 *       - bearerAuth: []
 */
export const getReadingHistory: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.readingHistory.findMany({
        where: { userId: req.user.id },
        skip,
        take: limit,
        orderBy: { lastReadAt: 'desc' },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              chapterNum: true,
              novel: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  coverUrl: true,
                  totalChapters: true,
                  author: {
                    select: { id: true, username: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.readingHistory.count({ where: { userId: req.user.id } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: histories,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-history/{id}:
 *   delete:
 *     summary: Delete a reading history entry
 *     tags: [Reading History]
 *     security:
 *       - bearerAuth: []
 */
export const deleteHistoryEntry: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const history = await prisma.readingHistory.findUnique({
      where: { id },
    });

    if (!history) {
      res.status(404).json({
        success: false,
        error: 'History entry not found',
      });
      return;
    }

    if (history.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own history',
      });
      return;
    }

    await prisma.readingHistory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'History entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-history:
 *   delete:
 *     summary: Clear all reading history
 *     tags: [Reading History]
 *     security:
 *       - bearerAuth: []
 */
export const clearHistory: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await prisma.readingHistory.deleteMany({
      where: { userId: req.user.id },
    });

    res.json({
      success: true,
      message: `Cleared ${result.count} history entries`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/continue-reading:
 *   get:
 *     summary: Get last read chapter for a novel
 *     tags: [Reading History]
 *     security:
 *       - bearerAuth: []
 */
export const getContinueReading: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        data: { lastReadChapter: null },
      });
      return;
    }

    const novelId = req.params.novelId as string;

    const lastHistory = await prisma.readingHistory.findFirst({
      where: {
        userId: req.user.id,
        chapter: { novelId },
      },
      orderBy: { lastReadAt: 'desc' },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            chapterNum: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { lastReadChapter: lastHistory?.chapter || null },
    });
  } catch (error) {
    next(error);
  }
};
