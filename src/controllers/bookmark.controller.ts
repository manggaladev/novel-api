import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta } from '../utils/helpers';

/**
 * @swagger
 * /api/bookmarks:
 *   get:
 *     summary: Get user's bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 */
export const getBookmarks: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: req.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          novel: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverUrl: true,
              status: true,
              averageRating: true,
              totalChapters: true,
              author: {
                select: { id: true, username: true },
              },
            },
          },
        },
      }),
      prisma.bookmark.count({ where: { userId: req.user.id } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: bookmarks,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/bookmark:
 *   post:
 *     summary: Add novel to bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 */
export const addBookmark: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;

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

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    if (existingBookmark) {
      res.status(409).json({
        success: false,
        error: 'Novel already bookmarked',
      });
      return;
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: req.user.id,
        novelId,
      },
      include: {
        novel: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Novel added to bookmarks',
      data: bookmark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/bookmark:
 *   delete:
 *     summary: Remove novel from bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 */
export const removeBookmark: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    if (!bookmark) {
      res.status(404).json({
        success: false,
        error: 'Bookmark not found',
      });
      return;
    }

    await prisma.bookmark.delete({
      where: { id: bookmark.id },
    });

    res.json({
      success: true,
      message: 'Bookmark removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/bookmark:
 *   get:
 *     summary: Check if novel is bookmarked
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 */
export const checkBookmark: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        data: { isBookmarked: false },
      });
      return;
    }

    const novelId = req.params.novelId as string;

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
    });

    res.json({
      success: true,
      data: { isBookmarked: !!bookmark },
    });
  } catch (error) {
    next(error);
  }
};
