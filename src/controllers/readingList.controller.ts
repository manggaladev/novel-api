/**
 * Reading List Controller
 * Handles reading list CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { notFound, notFoundError, badRequest, unauthorized, forbidden } from '../middleware/error.middleware';

/**
 * @swagger
 * /api/reading-lists:
 *   get:
 *     summary: Get current user's reading lists
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const getMyReadingLists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const lists = await prisma.readingList.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { novels: true },
        },
        novels: {
          take: 4,
          include: {
            novel: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: lists.map((list) => ({
        ...list,
        novelCount: list._count.novels,
        previewNovels: list.novels.map((n) => n.novel),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists/{id}:
 *   get:
 *     summary: Get a specific reading list
 *     tags: [Reading Lists]
 */
export const getReadingList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const list = await prisma.readingList.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        novels: {
          skip,
          take: limit,
          orderBy: { addedAt: 'desc' },
          include: {
            novel: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                genres: {
                  include: {
                    genre: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { novels: true },
        },
      },
    });

    if (!list) {
      throw notFoundError('Reading list');
    }

    // Check if list is public or owned by user
    if (!list.isPublic && list.userId !== req.user?.id) {
      throw forbidden('This reading list is private');
    }

    const total = list._count.novels;

    res.json({
      success: true,
      data: {
        ...list,
        novels: list.novels.map((n) => ({
          ...n.novel,
          addedAt: n.addedAt,
          genres: n.novel.genres.map((g) => g.genre),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists:
 *   post:
 *     summary: Create a new reading list
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const createReadingList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const { name, description, isPublic } = req.body;

    if (!name || name.trim().length === 0) {
      throw badRequest('Reading list name is required');
    }

    // Check if user already has a list with this name
    const existingList = await prisma.readingList.findFirst({
      where: {
        userId: req.user.id,
        name: name.trim(),
      },
    });

    if (existingList) {
      throw badRequest('You already have a reading list with this name');
    }

    const list = await prisma.readingList.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        description,
        isPublic: isPublic ?? false,
      },
    });

    res.status(201).json({
      success: true,
      data: list,
      message: 'Reading list created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists/{id}:
 *   put:
 *     summary: Update a reading list
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const updateReadingList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const id = req.params.id as string;
    const { name, description, isPublic } = req.body;

    const list = await prisma.readingList.findUnique({
      where: { id },
    });

    if (!list) {
      throw notFoundError('Reading list');
    }

    if (list.userId !== req.user.id) {
      throw forbidden('You can only update your own reading lists');
    }

    const updatedList = await prisma.readingList.update({
      where: { id },
      data: {
        name: name?.trim(),
        description,
        isPublic,
      },
    });

    res.json({
      success: true,
      data: updatedList,
      message: 'Reading list updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists/{id}:
 *   delete:
 *     summary: Delete a reading list
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const deleteReadingList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const id = req.params.id as string;

    const list = await prisma.readingList.findUnique({
      where: { id },
    });

    if (!list) {
      throw notFoundError('Reading list');
    }

    if (list.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw forbidden('You can only delete your own reading lists');
    }

    await prisma.readingList.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Reading list deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists/{id}/novels/{novelId}:
 *   post:
 *     summary: Add a novel to reading list
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const addNovelToList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const id = req.params.id as string;
    const novelId = req.params.novelId as string;

    // Check if list exists and belongs to user
    const list = await prisma.readingList.findUnique({
      where: { id },
    });

    if (!list) {
      throw notFoundError('Reading list');
    }

    if (list.userId !== req.user.id) {
      throw forbidden('You can only add novels to your own reading lists');
    }

    // Check if novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
    });

    if (!novel) {
      throw notFoundError('Novel');
    }

    // Check if novel already in list
    const existingEntry = await prisma.readingListNovel.findUnique({
      where: {
        readingListId_novelId: {
          readingListId: id,
          novelId,
        },
      },
    });

    if (existingEntry) {
      throw badRequest('Novel already in reading list');
    }

    // Add novel to list
    await prisma.$transaction([
      prisma.readingListNovel.create({
        data: {
          readingListId: id,
          novelId,
        },
      }),
      prisma.readingList.update({
        where: { id },
        data: { novelCount: { increment: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Novel added to reading list',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reading-lists/{id}/novels/{novelId}:
 *   delete:
 *     summary: Remove a novel from reading list
 *     tags: [Reading Lists]
 *     security:
 *       - bearerAuth: []
 */
export const removeNovelFromList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized('Unauthorized');
    }

    const id = req.params.id as string;
    const novelId = req.params.novelId as string;

    const list = await prisma.readingList.findUnique({
      where: { id },
    });

    if (!list) {
      throw notFoundError('Reading list');
    }

    if (list.userId !== req.user.id) {
      throw forbidden('You can only remove novels from your own reading lists');
    }

    const entry = await prisma.readingListNovel.findUnique({
      where: {
        readingListId_novelId: {
          readingListId: id,
          novelId,
        },
      },
    });

    if (!entry) {
      throw badRequest('Novel not in reading list');
    }

    await prisma.$transaction([
      prisma.readingListNovel.delete({
        where: {
          readingListId_novelId: {
            readingListId: id,
            novelId,
          },
        },
      }),
      prisma.readingList.update({
        where: { id },
        data: { novelCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Novel removed from reading list',
    });
  } catch (error) {
    next(error);
  }
};
