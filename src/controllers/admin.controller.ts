/**
 * Admin Controller
 * Handles admin-only operations and statistics
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { unauthorized, forbidden } from '../middleware/error.middleware';

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'AUTHOR') {
      throw forbidden('Admin access required');
    }

    // Get various counts
    const [
      totalUsers,
      totalNovels,
      totalChapters,
      totalGenres,
      totalComments,
      totalRatings,
      totalBookmarks,
      totalReadingLists,
      newUsersToday,
      newNovelsToday,
      newChaptersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.novel.count(),
      prisma.chapter.count(),
      prisma.genre.count(),
      prisma.comment.count(),
      prisma.rating.count(),
      prisma.bookmark.count(),
      prisma.readingList.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.novel.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.chapter.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Get popular novels
    const popularNovels = await prisma.novel.findMany({
      take: 5,
      orderBy: { viewsCount: 'desc' },
      select: {
        id: true,
        title: true,
        viewsCount: true,
        averageRating: true,
        author: {
          select: { username: true },
        },
      },
    });

    // Get most active users
    const activeUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        novels: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        _count: {
          select: { novels: true },
        },
      },
    });

    // Get recent activity
    const recentActivity = await prisma.comment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { username: true },
        },
        chapter: {
          select: {
            title: true,
            novel: {
              select: { title: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        counts: {
          users: totalUsers,
          novels: totalNovels,
          chapters: totalChapters,
          genres: totalGenres,
          comments: totalComments,
          ratings: totalRatings,
          bookmarks: totalBookmarks,
          readingLists: totalReadingLists,
        },
        today: {
          newUsers: newUsersToday,
          newNovels: newNovelsToday,
          newChapters: newChaptersToday,
        },
        popularNovels,
        activeUsers: activeUsers.map((u) => ({
          ...u,
          novelCount: u._count.novels,
        })),
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    if (req.user.role !== 'ADMIN') {
      throw forbidden('Admin access required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const where = {
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role: role as any }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatar: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              novels: true,
              bookmarks: true,
              comments: true,
              ratings: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        novelCount: u._count.novels,
        bookmarkCount: u._count.bookmarks,
        commentCount: u._count.comments,
        ratingCount: u._count.ratings,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    if (req.user.role !== 'ADMIN') {
      throw forbidden('Admin access required');
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'AUTHOR', 'ADMIN'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role',
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'User role updated',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/admin/novels:
 *   get:
 *     summary: Get all novels (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
export const getAllNovels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    if (req.user.role !== 'ADMIN') {
      throw forbidden('Admin access required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where = status ? { status: status as any } : {};

    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, email: true },
          },
          _count: {
            select: { chapters: true, bookmarks: true, ratings: true },
          },
        },
      }),
      prisma.novel.count({ where }),
    ]);

    res.json({
      success: true,
      data: novels.map((n) => ({
        ...n,
        chapterCount: n._count.chapters,
        bookmarkCount: n._count.bookmarks,
        ratingCount: n._count.ratings,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/admin/activity:
 *   get:
 *     summary: Get recent admin activity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
export const getActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    if (req.user.role !== 'ADMIN') {
      throw forbidden('Admin access required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const [activity, total] = await Promise.all([
      prisma.adminActivity.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminActivity.count(),
    ]);

    res.json({
      success: true,
      data: activity,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
