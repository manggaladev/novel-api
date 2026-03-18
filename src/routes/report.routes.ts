import { Router } from 'express';
import {
  createReport,
  getReports,
  getReportById,
  resolveReport,
} from '../controllers/report.controller';
import { auth, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Content reporting system
 */

// Validation schemas
const createReportSchema = z.object({
  body: z.object({
    type: z.enum(['NOVEL', 'CHAPTER', 'COMMENT', 'USER']),
    targetId: z.string().uuid('Invalid target ID'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
    description: z.string().max(2000).optional(),
  }),
});

const resolveReportSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid report ID'),
  }),
  body: z.object({
    status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
    action: z.string().optional(),
  }),
});

const reportQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(),
    type: z.enum(['NOVEL', 'CHAPTER', 'COMMENT', 'USER']).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

// All routes require authentication
router.post('/', auth, validate(createReportSchema), createReport);
router.get('/', auth, isAdmin, validate(reportQuerySchema), getReports);
router.get('/:id', auth, isAdmin, getReportById);
router.put('/:id/resolve', auth, isAdmin, validate(resolveReportSchema), resolveReport);

export default router;
