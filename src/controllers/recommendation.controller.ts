import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized recommendations based on reading history and genres
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 */
export const getRecommendations: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { limit = 10 } = req.query as any;

    // Get user's reading history to understand preferences
    const readingHistory = await prisma.readingHistory.findMany({
      where: { userId: req.user.id },
      include: {
        chapter: {
          include: {
            novel: {
              include: {
                genres: {
                  include: { genre: true },
                },
              },
            },
          },
        },
      },
      take: 50,
      orderBy: { lastReadAt: 'desc' },
    });

    // Get user's bookmarks
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      include: {
        novel: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
      },
    });

    // Get user's ratings (highly rated novels indicate preference)
    const ratings = await prisma.rating.findMany({
      where: { 
        userId: req.user.id,
        score: { gte: 4 }, // Only consider high ratings
      },
      include: {
        novel: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
      },
    });

    // Extract genre preferences
    const genreCounts: Record<string, number> = {};
    
    [...readingHistory, ...bookmarks, ...ratings].forEach((item: any) => {
      const novel = item.chapter?.novel || item.novel;
      if (novel?.genres) {
        novel.genres.forEach((g: any) => {
          genreCounts[g.genreId] = (genreCounts[g.genreId] || 0) + 1;
        });
      }
    });

    // Sort genres by preference
    const preferredGenreIds = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    // Get novels the user has already interacted with
    const interactedNovelIds = new Set([
      ...readingHistory.map((h: any) => h.chapter?.novelId).filter(Boolean),
      ...bookmarks.map((b: any) => b.novelId),
      ...ratings.map((r: any) => r.novelId),
    ]);

    // Build recommendation query
    let recommendations: any[] = [];

    if (preferredGenreIds.length > 0) {
      // Find novels with preferred genres
      recommendations = await prisma.novel.findMany({
        where: {
          id: { notIn: [...interactedNovelIds] },
          genres: {
            some: {
              genreId: { in: preferredGenreIds },
            },
          },
        },
        take: limit,
        orderBy: [
          { trendingScore: 'desc' },
          { averageRating: 'desc' },
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
    }

    // If not enough recommendations, fill with trending novels
    if (recommendations.length < limit) {
      const trendingNovels = await prisma.novel.findMany({
        where: {
          id: { notIn: [...interactedNovelIds, ...recommendations.map((n: any) => n.id)] },
        },
        take: limit - recommendations.length,
        orderBy: { trendingScore: 'desc' },
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

      recommendations = [...recommendations, ...trendingNovels];
    }

    res.json({
      success: true,
      data: recommendations,
      meta: {
        preferredGenres: preferredGenreIds.length > 0,
        basedOnHistory: readingHistory.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/novels/{id}/similar:
 *   get:
 *     summary: Get similar novels based on genres and author
 *     tags: [Recommendations]
 */
export const getSimilarNovels: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { limit = 10 } = req.query as any;

    // Get the novel with its genres and author
    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        genres: {
          select: { genreId: true },
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

    const genreIds = novel.genres.map((g) => g.genreId);

    // Find similar novels based on:
    // 1. Same genres (higher weight)
    // 2. Same author
    // 3. Similar rating/view patterns
    const similarNovels = await prisma.novel.findMany({
      where: {
        id: { not: id },
        OR: [
          { authorId: novel.authorId },
          { genres: { some: { genreId: { in: genreIds } } } },
        ],
      },
      take: limit,
      orderBy: [
        { trendingScore: 'desc' },
        { averageRating: 'desc' },
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

    // Sort by similarity score (novels with more matching genres first)
    const scoredNovels = similarNovels.map((n) => {
      const matchingGenres = n.genres.filter((g) => genreIds.includes(g.genreId)).length;
      const sameAuthor = n.author.id === novel.authorId ? 1 : 0;
      const score = matchingGenres * 2 + sameAuthor * 3;
      return { ...n, _similarityScore: score };
    });

    scoredNovels.sort((a, b) => b._similarityScore - a._similarityScore);

    res.json({
      success: true,
      data: scoredNovels.map(({ _similarityScore, ...novel }) => novel),
    });
  } catch (error) {
    next(error);
  }
};
