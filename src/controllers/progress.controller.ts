import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';

/**
 * @swagger
 * /api/progress/{novelId}:
 *   get:
 *     summary: Get reading progress for a novel
 *     tags: [Reading Progress]
 *     security:
 *       - bearerAuth: []
 */
export const getProgress: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            chapterNum: true,
          },
        },
        novel: {
          select: {
            id: true,
            title: true,
            totalChapters: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: progress || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/progress/{novelId}/{chapterId}:
 *   put:
 *     summary: Update reading progress (auto-save position)
 *     tags: [Reading Progress]
 *     security:
 *       - bearerAuth: []
 */
export const updateProgress: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;
    const chapterId = req.params.chapterId as string;
    const { progress: progressPercent = 0 } = req.body;

    // Verify chapter belongs to novel
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found in this novel',
      });
      return;
    }

    // Upsert reading progress
    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_novelId: {
          userId: req.user.id,
          novelId,
        },
      },
      create: {
        userId: req.user.id,
        novelId,
        chapterId,
        progress: Math.min(100, Math.max(0, progressPercent)),
      },
      update: {
        chapterId,
        progress: Math.min(100, Math.max(0, progressPercent)),
        lastReadAt: new Date(),
      },
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
      message: 'Progress saved',
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/progress/recent:
 *   get:
 *     summary: Get recently read novels with progress
 *     tags: [Reading Progress]
 *     security:
 *       - bearerAuth: []
 */
export const getRecentProgress: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { limit = 10 } = req.query as any;

    const recentProgress = await prisma.readingProgress.findMany({
      where: {
        userId: req.user.id,
      },
      take: limit,
      orderBy: {
        lastReadAt: 'desc',
      },
      include: {
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
      data: recentProgress,
    });
  } catch (error) {
    next(error);
  }
};
