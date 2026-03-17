import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { ReportType, ReportStatus } from '@prisma/client';
import { buildPaginationMeta } from '../utils/helpers';

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Report a novel, chapter, or comment
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
export const createReport: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { type, targetId, reason, description } = req.body;

    // Validate target exists based on type
    let targetExists = false;
    
    switch (type) {
      case 'NOVEL':
        targetExists = !!(await prisma.novel.findUnique({ where: { id: targetId } }));
        break;
      case 'CHAPTER':
        targetExists = !!(await prisma.chapter.findUnique({ where: { id: targetId } }));
        break;
      case 'COMMENT':
        targetExists = !!(await prisma.comment.findUnique({ where: { id: targetId } }));
        break;
      case 'USER':
        targetExists = !!(await prisma.user.findUnique({ where: { id: targetId } }));
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
        return;
    }

    if (!targetExists) {
      res.status(404).json({
        success: false,
        error: 'Target not found',
      });
      return;
    }

    // Check if user already reported this target
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: req.user.id,
        type: type as ReportType,
        targetId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (existingReport) {
      res.status(400).json({
        success: false,
        error: 'You have already reported this content',
      });
      return;
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        type: type as ReportType,
        targetId,
        reason,
        description,
      },
      include: {
        reporter: {
          select: { id: true, username: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
export const getReports: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      type,
      sort = 'createdAt',
      order = 'desc',
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status as ReportStatus;
    }
    if (type) {
      where.type = type as ReportType;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          reporter: {
            select: { id: true, username: true, email: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    res.json({
      success: true,
      data: reports,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reports/{id}/resolve:
 *   put:
 *     summary: Resolve a report (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
export const resolveReport: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const id = req.params.id as string;
    const { status, action } = req.body;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    // Update report status
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: status as ReportStatus,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, username: true },
        },
      },
    });

    // Log admin activity
    await prisma.adminActivity.create({
      data: {
        action: `REPORT_${status}`,
        userId: req.user.id,
        details: {
          reportId: id,
          targetType: report.type,
          targetId: report.targetId,
          action,
        },
      },
    });

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get report details (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
export const getReportById: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const id = req.params.id as string;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
