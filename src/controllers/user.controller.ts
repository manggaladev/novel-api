/**
 * User Controller
 * Handles user profile operations
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { notFound, notFoundError, unauthorized } from '../middleware/error.middleware';

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 */
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            novels: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw notFoundError('User');
    }

    res.json({
      success: true,
      data: {
        ...user,
        novelCount: user._count.novels,
        followerCount: user._count.followers,
        followingCount: user._count.following,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/users/{id}/novels:
 *   get:
 *     summary: Get user's novels
 *     tags: [Users]
 */
export const getUserNovels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where: { authorId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          genres: {
            include: { genre: true },
          },
          _count: {
            select: { chapters: true, bookmarks: true },
          },
        },
      }),
      prisma.novel.count({ where: { authorId: id } }),
    ]);

    res.json({
      success: true,
      data: novels.map((n) => ({
        ...n,
        genres: n.genres.map((g) => g.genre),
        chapterCount: n._count.chapters,
        bookmarkCount: n._count.bookmarks,
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
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const { username, bio, avatar } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
