/**
 * Follow Controller
 * Handles user follow/unfollow operations
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError, notFound, badRequest, unauthorized } from '../middleware/error.middleware';

/**
 * @swagger
 * /api/follows/{userId}:
 *   post:
 *     summary: Follow a user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully followed user
 */
export const followUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const { userId } = req.params;
    const followerId = req.user.id;

    // Cannot follow self
    if (userId === followerId) {
      throw badRequest('Cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      throw notFound('User');
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      throw badRequest('Already following this user');
    }

    // Create follow
    await prisma.follow.create({
      data: {
        followerId,
        followingId: userId,
      },
    });

    // Create notification for the followed user
    await prisma.notification.create({
      data: {
        userId,
        type: 'follow',
        title: 'New Follower',
        message: `${req.user.username} started following you`,
        data: { followerId },
      },
    });

    // Send real-time notification if connected
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const socketId = connectedUsers?.get(userId);

    if (io && socketId) {
      io.to(`user:${userId}`).emit('notification', {
        type: 'follow',
        title: 'New Follower',
        message: `${req.user.username} started following you`,
      });
    }

    res.json({
      success: true,
      message: 'Successfully followed user',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/follows/{userId}:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
export const unfollowUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const { userId } = req.params;
    const followerId = req.user.id;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    if (!follow) {
      throw badRequest('Not following this user');
    }

    await prisma.follow.delete({
      where: { id: follow.id },
    });

    res.json({
      success: true,
      message: 'Successfully unfollowed user',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/follows/followers/{userId}:
 *   get:
 *     summary: Get user's followers
 *     tags: [Follows]
 */
export const getFollowers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    res.json({
      success: true,
      data: followers.map((f) => ({
        ...f.follower,
        followedAt: f.createdAt,
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
 * /api/follows/following/{userId}:
 *   get:
 *     summary: Get users that a user is following
 *     tags: [Follows]
 */
export const getFollowing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      success: true,
      data: following.map((f) => ({
        ...f.following,
        followedAt: f.createdAt,
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
 * /api/follows/status/{userId}:
 *   get:
 *     summary: Check if current user is following another user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 */
export const getFollowStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    let isFollowing = false;

    if (currentUserId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      success: true,
      data: {
        isFollowing,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
