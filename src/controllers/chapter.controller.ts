import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta, countWords, sanitizeString, sanitizeHtmlContent } from '../utils/helpers';

/**
 * @swagger
 * /api/chapters/scheduled:
 *   get:
 *     summary: Get scheduled chapters (author/admin only)
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 */
export const getScheduledChapters: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    // Build where clause - admins see all, authors see their own
    const where: any = {
      isScheduled: true,
      publishedAt: { gt: new Date() },
    };

    if (req.user.role !== 'ADMIN') {
      where.novel = { authorId: req.user.id };
    }

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'asc' },
        include: {
          novel: {
            select: {
              id: true,
              title: true,
              author: {
                select: { id: true, username: true },
              },
            },
          },
        },
      }),
      prisma.chapter.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: chapters,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/chapters:
 *   get:
 *     summary: Get all chapters of a novel
 *     tags: [Chapters]
 */
export const getChapters: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const novelId = req.params.novelId as string;
    const { page = 1, limit = 20, sort = 'chapterNum', order = 'asc' } = req.query as any;

    const skip = (page - 1) * limit;

    // Check novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true, authorId: true },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where: { 
          novelId,
          // Hide scheduled chapters from regular users
          ...(req.user?.role !== 'ADMIN' && novel.authorId !== req.user?.id ? {
            OR: [
              { isScheduled: false },
              { publishedAt: { lte: new Date() } },
            ],
          } : {}),
        },
        skip,
        take: limit,
        orderBy: { [sort as string]: order },
        select: {
          id: true,
          title: true,
          chapterNum: true,
          viewsCount: true,
          wordCount: true,
          publishedAt: true,
          isScheduled: true,
          // Don't include content in list for performance
        },
      }),
      prisma.chapter.count({ where: { novelId } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: { novel, chapters },
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/chapters/{id}:
 *   get:
 *     summary: Get chapter by ID with content
 *     tags: [Chapters]
 */
export const getChapterById: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
      return;
    }

    // Increment view count
    await prisma.chapter.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    // Increment novel view count
    await prisma.novel.update({
      where: { id: chapter.novelId },
      data: { viewsCount: { increment: 1 } },
    });

    // Record reading history if user is logged in
    if (req.user) {
      await prisma.readingHistory.upsert({
        where: {
          userId_chapterId: {
            userId: req.user.id,
            chapterId: id,
          },
        },
        create: {
          userId: req.user.id,
          chapterId: id,
        },
        update: {
          lastReadAt: new Date(),
        },
      });
    }

    // Get prev/next chapters
    const [prevChapter, nextChapter] = await Promise.all([
      prisma.chapter.findFirst({
        where: { novelId: chapter.novelId, chapterNum: { lt: chapter.chapterNum } },
        orderBy: { chapterNum: 'desc' },
        select: { id: true, chapterNum: true, title: true },
      }),
      prisma.chapter.findFirst({
        where: { novelId: chapter.novelId, chapterNum: { gt: chapter.chapterNum } },
        orderBy: { chapterNum: 'asc' },
        select: { id: true, chapterNum: true, title: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        ...chapter,
        prevChapter,
        nextChapter,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/chapters/{chapterNum}:
 *   get:
 *     summary: Get chapter by novel and chapter number
 *     tags: [Chapters]
 */
export const getChapterByNumber: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { novelId, chapterNum } = req.params as { novelId: string; chapterNum: string };

    const chapter = await prisma.chapter.findFirst({
      where: {
        novelId,
        chapterNum: parseInt(chapterNum as string),
      },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            totalChapters: true,
          },
        },
      },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
      return;
    }

    // Increment view counts
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { viewsCount: { increment: 1 } },
    });

    await prisma.novel.update({
      where: { id: novelId },
      data: { viewsCount: { increment: 1 } },
    });

    // Record reading history
    if (req.user) {
      await prisma.readingHistory.upsert({
        where: {
          userId_chapterId: {
            userId: req.user.id,
            chapterId: chapter.id,
          },
        },
        create: {
          userId: req.user.id,
          chapterId: chapter.id,
        },
        update: {
          lastReadAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{novelId}/chapters:
 *   post:
 *     summary: Create a new chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 */
export const createChapter: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const novelId = req.params.novelId as string;
    const { title, chapterNum, content, publishedAt, isScheduled } = req.body;

    // Check novel exists and user owns it
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    if (novel.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only add chapters to your own novels',
      });
      return;
    }

    // Check if chapter number already exists
    const existingChapter = await prisma.chapter.findFirst({
      where: { novelId, chapterNum },
    });

    if (existingChapter) {
      res.status(409).json({
        success: false,
        error: `Chapter ${chapterNum} already exists`,
      });
      return;
    }

    // Handle scheduled publishing
    const scheduleDate = publishedAt ? new Date(publishedAt) : null;
    const shouldSchedule = isScheduled && scheduleDate && scheduleDate > new Date();

    // Create chapter
    const chapter = await prisma.chapter.create({
      data: {
        title: sanitizeString(title),
        chapterNum,
        content: sanitizeHtmlContent(content),
        novelId,
        wordCount: countWords(content),
        publishedAt: shouldSchedule ? scheduleDate : new Date(),
        isScheduled: shouldSchedule,
      },
    });

    // Update novel total chapters only if not scheduled
    if (!shouldSchedule) {
      await prisma.novel.update({
        where: { id: novelId },
        data: { totalChapters: { increment: 1 } },
      });
    }

    res.status(201).json({
      success: true,
      message: shouldSchedule ? 'Chapter scheduled successfully' : 'Chapter created successfully',
      data: chapter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/chapters/{id}:
 *   put:
 *     summary: Update a chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 */
export const updateChapter: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const { title, content } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { novel: { select: { authorId: true } } },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
      return;
    }

    if (chapter.novel.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only edit chapters of your own novels',
      });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = sanitizeString(title);
    if (content) {
      updateData.content = sanitizeHtmlContent(content);
      updateData.wordCount = countWords(content);
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Chapter updated successfully',
      data: updatedChapter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/chapters/{id}:
 *   delete:
 *     summary: Delete a chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 */
export const deleteChapter: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { novel: { select: { authorId: true } } },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
      return;
    }

    if (chapter.novel.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only delete chapters of your own novels',
      });
      return;
    }

    await prisma.chapter.delete({
      where: { id },
    });

    // Update novel total chapters
    await prisma.novel.update({
      where: { id: chapter.novelId },
      data: { totalChapters: { decrement: 1 } },
    });

    res.json({
      success: true,
      message: 'Chapter deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
