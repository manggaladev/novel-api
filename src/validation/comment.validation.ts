import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(2000, 'Comment must be at most 2000 characters'),
  }),
  params: z.object({
    chapterId: z.string().uuid('Invalid chapter ID'),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Comment content is required')
      .max(2000, 'Comment must be at most 2000 characters'),
  }),
  params: z.object({
    id: z.string().uuid('Invalid comment ID'),
  }),
});

export const commentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID'),
  }),
});

export const commentQuerySchema = z.object({
  params: z.object({
    chapterId: z.string().uuid('Invalid chapter ID'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),
});
