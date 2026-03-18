import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { 
  buildPaginationMeta, 
  generateSlug, 
  sanitizeString, 
  sanitizeHtmlContent 
} from '../utils/helpers';
import { NovelStatus } from '@prisma/client';

/**
 * Calculate trending score for a novel
 * Based on: views, ratings, bookmarks, recent activity
 */
export const calculateTrendingScore = async (novelId: string): Promise<number> => {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      _count: {
        select: { bookmarks: true, ratings: true },
      },
      ratings: {
        select: { score: true },
      },
    },
  });

  if (!novel) return 0;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get recent views (last 7 days)
  const recentChapters = await prisma.chapter.aggregate({
    where: {
      novelId,
      createdAt: { gte: weekAgo },
    },
    _sum: { viewsCount: true },
  });

  // Calculate trending score
  const viewScore = (novel.viewsCount / 1000) * 0.3;
  const ratingScore = novel.averageRating * 10 * 0.25;
  const bookmarkScore = novel._count.bookmarks * 0.2;
  const activityScore = (recentChapters._sum.viewsCount || 0) / 100 * 0.15;
  const recencyScore = novel.updatedAt > weekAgo ? 5 : 0;

  return Math.round((viewScore + ratingScore + bookmarkScore + activityScore + recencyScore) * 100) / 100;
};

/**
 * @swagger
 * /api/novels/trending:
 *   get:
 *     summary: Get trending novels (based on views, ratings, recent activity)
 *     tags: [Novels]
 */
export const getTrendingNovels: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = 10, page = 1 } = req.query as any;
    const skip = (page - 1) * limit;

    const novels = await prisma.novel.findMany({
      where: {// Only include published novels
        publishedAt: { not: null },
      },
      skip,
      take: limit,
      orderBy: [
        { trendingScore: 'desc' },
        { viewsCount: 'desc' },
      ],
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: {
          select: { chapters: true, bookmarks: true, ratings: true },
        },
      },
    });

    res.json({
      success: true,
      data: novels,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels:
 *   get:
 *     summary: Get all novels with pagination, filtering, and sorting
 *     tags: [Novels]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, title, averageRating, viewsCount, totalChapters, trendingScore]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ONGOING, COMPLETED, HIATUS]
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Genre slug to filter by
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title
 */
export const getNovels: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc',
      status,
      genre,
      search,
      authorId,
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status as NovelStatus;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (genre) {
      where.genres = {
        some: {
          genre: { slug: genre },
        },
      };
    }

    // Get novels with count
    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort as string]: order },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: {
            select: { chapters: true, bookmarks: true, ratings: true },
          },
        },
      }),
      prisma.novel.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: novels,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{id}:
 *   get:
 *     summary: Get novel by ID
 *     tags: [Novels]
 */
export const getNovelById: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
        chapters: {
          select: { id: true, title: true, chapterNum: true, viewsCount: true, publishedAt: true },
          orderBy: { chapterNum: 'asc' },
        },
        _count: {
          select: { bookmarks: true, ratings: true, chapters: true },
        },
      },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    // Increment view count
    await prisma.novel.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: novel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/slug/{slug}:
 *   get:
 *     summary: Get novel by slug
 *     tags: [Novels]
 */
export const getNovelBySlug: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const novel = await prisma.novel.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
        chapters: {
          select: { id: true, title: true, chapterNum: true, viewsCount: true, publishedAt: true },
          orderBy: { chapterNum: 'asc' },
        },
        _count: {
          select: { bookmarks: true, ratings: true, chapters: true },
        },
      },
    });

    if (!novel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    // Increment view count
    await prisma.novel.update({
      where: { slug },
      data: { viewsCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: novel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels:
 *   post:
 *     summary: Create a new novel
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               synopsis:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ONGOING, COMPLETED, HIATUS]
 *               cover:
 *                 type: string
 *                 format: binary
 *               genreIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
export const createNovel: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { title, synopsis, status = 'ONGOING', genreIds } = req.body;
    const cover = req.file;

    // Generate unique slug
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.novel.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get cover URL if uploaded
    const coverUrl = cover ? `/uploads/covers/${cover.filename}` : null;

    // Create novel
    const novel = await prisma.novel.create({
      data: {
        title: sanitizeString(title),
        slug,
        synopsis: synopsis ? sanitizeHtmlContent(synopsis) : null,
        coverUrl,
        status: status as NovelStatus,
        authorId: req.user.id,
        publishedAt: new Date(),
        genres: genreIds ? {
          create: (Array.isArray(genreIds) ? genreIds : [genreIds]).map((genreId: string) => ({
            genreId,
          })),
        } : undefined,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Novel created successfully',
      data: novel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{id}:
 *   put:
 *     summary: Update a novel
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 */
export const updateNovel: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const { title, synopsis, status, genreIds } = req.body;
    const cover = req.file;

    // Check if novel exists and user owns it
    const existingNovel = await prisma.novel.findUnique({
      where: { id },
    });

    if (!existingNovel) {
      res.status(404).json({
        success: false,
        error: 'Novel not found',
      });
      return;
    }

    if (existingNovel.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only edit your own novels',
      });
      return;
    }

    // Generate new slug if title changed
    let slug = existingNovel.slug;
    if (title && title !== existingNovel.title) {
      const baseSlug = generateSlug(title);
      slug = baseSlug;
      let counter = 1;
      
      while (await prisma.novel.findFirst({ where: { slug, NOT: { id } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Update novel
    const updateData: any = {};
    if (title) updateData.title = sanitizeString(title);
    if (slug !== existingNovel.slug) updateData.slug = slug;
    if (synopsis !== undefined) updateData.synopsis = synopsis ? sanitizeHtmlContent(synopsis) : null;
    if (status) updateData.status = status as NovelStatus;
    if (cover) updateData.coverUrl = `/uploads/covers/${cover.filename}`;

    const novel = await prisma.novel.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // Update genres if provided
    if (genreIds) {
      await prisma.novelGenre.deleteMany({ where: { novelId: id } });
      await prisma.novelGenre.createMany({
        data: (Array.isArray(genreIds) ? genreIds : [genreIds]).map((genreId: string) => ({
          novelId: id,
          genreId,
        })),
      });
    }

    res.json({
      success: true,
      message: 'Novel updated successfully',
      data: novel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{id}:
 *   delete:
 *     summary: Delete a novel
 *     tags: [Novels]
 *     security:
 *       - bearerAuth: []
 */
export const deleteNovel: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const novel = await prisma.novel.findUnique({
      where: { id },
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
        error: 'You can only delete your own novels',
      });
      return;
    }

    await prisma.novel.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Novel deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/popular:
 *   get:
 *     summary: Get popular novels
 *     tags: [Novels]
 */
export const getPopularNovels: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const novels = await prisma.novel.findMany({
      where: { status: 'ONGOING' },
      take: limit,
      orderBy: [
        { viewsCount: 'desc' },
        { averageRating: 'desc' },
      ],
      include: {
        author: {
          select: { id: true, username: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: novels,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/latest:
 *   get:
 *     summary: Get latest novels
 *     tags: [Novels]
 */
export const getLatestNovels: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const novels = await prisma.novel.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true },
        },
        genres: {
          include: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: novels,
    });
  } catch (error) {
    next(error);
  }
};
