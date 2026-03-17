import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { buildPaginationMeta, sanitizeHtmlContent } from '../utils/helpers';

/**
 * @swagger
 * /api/chapters/{chapterId}/comments:
 *   get:
 *     summary: Get comments for a chapter (with nested replies)
 *     tags: [Comments]
 */
export const getComments: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chapterId = req.params.chapterId as string;
    const { page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    // Get only top-level comments (no parentId)
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { chapterId, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          likes: {
            select: { userId: true },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.comment.count({ where: { chapterId, parentId: null } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: comments.map((c) => ({
        ...c,
        likesCount: c.likes.length,
        isLiked: req.user ? c.likes.some((l) => l.userId === req.user.id) : false,
        repliesCount: c._count.replies,
        likes: undefined,
      })),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/{id}/replies:
 *   get:
 *     summary: Get replies to a comment
 *     tags: [Comments]
 */
export const getReplies: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          likes: {
            select: { userId: true },
          },
        },
      }),
      prisma.comment.count({ where: { parentId: id } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: replies.map((r) => ({
        ...r,
        likesCount: r.likes.length,
        isLiked: req.user ? r.likes.some((l) => l.userId === req.user.id) : false,
        likes: undefined,
      })),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/chapters/{chapterId}/comments:
 *   post:
 *     summary: Add a comment to a chapter
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const addComment: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const chapterId = req.params.chapterId as string;
    const { content, parentId } = req.body;

    // Check if chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, title: true, novelId: true },
    });

    if (!chapter) {
      res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
      return;
    }

    // If replying to a comment, check if parent exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        res.status(404).json({
          success: false,
          error: 'Parent comment not found',
        });
        return;
      }

      // Ensure parent belongs to same chapter
      if (parentComment.chapterId !== chapterId) {
        res.status(400).json({
          success: false,
          error: 'Parent comment does not belong to this chapter',
        });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitizeHtmlContent(content),
        userId: req.user.id,
        chapterId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Update chapter comment count
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { commentsCount: { increment: 1 } },
    });

    // Create notification if replying
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'comment',
            title: 'New Reply',
            message: `${req.user.username} replied to your comment`,
            data: { chapterId, commentId: comment.id },
          },
        });

        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${parentComment.userId}`).emit('notification', {
            type: 'comment',
            title: 'New Reply',
            message: `${req.user.username} replied to your comment`,
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        ...comment,
        likesCount: 0,
        isLiked: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const updateComment: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
      return;
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only edit your own comments',
      });
      return;
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content: sanitizeHtmlContent(content) },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        ...updatedComment,
        likesCount: updatedComment._count.likes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const deleteComment: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
      return;
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own comments',
      });
      return;
    }

    // Delete all replies first
    await prisma.comment.deleteMany({
      where: { parentId: id },
    });

    // Delete comment likes
    await prisma.commentLike.deleteMany({
      where: { commentId: id },
    });

    // Delete the comment
    await prisma.comment.delete({
      where: { id },
    });

    // Update chapter comment count
    await prisma.chapter.update({
      where: { id: comment.chapterId },
      data: { commentsCount: { decrement: 1 } },
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: Like a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const likeComment: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
      return;
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: req.user.id,
          commentId: id,
        },
      },
    });

    if (existingLike) {
      res.status(400).json({
        success: false,
        error: 'Already liked this comment',
      });
      return;
    }

    await prisma.commentLike.create({
      data: {
        userId: req.user.id,
        commentId: id,
      },
    });

    // Update comment likes count
    await prisma.comment.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });

    // Create notification
    if (comment.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: comment.userId,
          type: 'like',
          title: 'New Like',
          message: `${req.user.username} liked your comment`,
          data: { commentId: id },
        },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${comment.userId}`).emit('notification', {
          type: 'like',
          title: 'New Like',
          message: `${req.user.username} liked your comment`,
        });
      }
    }

    res.json({
      success: true,
      message: 'Comment liked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/{id}/like:
 *   delete:
 *     summary: Unlike a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const unlikeComment: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const like = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: req.user.id,
          commentId: id,
        },
      },
    });

    if (!like) {
      res.status(400).json({
        success: false,
        error: 'Not liked this comment',
      });
      return;
    }

    await prisma.commentLike.delete({
      where: { id: like.id },
    });

    // Update comment likes count
    await prisma.comment.update({
      where: { id },
      data: { likesCount: { decrement: 1 } },
    });

    res.json({
      success: true,
      message: 'Comment unliked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/comments/my:
 *   get:
 *     summary: Get user's comments
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 */
export const getMyComments: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 20 } = req.query as any;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { userId: req.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              chapterNum: true,
              novel: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
          _count: {
            select: { likes: true },
          },
        },
      }),
      prisma.comment.count({ where: { userId: req.user.id } }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: comments.map((c) => ({
        ...c,
        likesCount: c._count.likes,
      })),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};
