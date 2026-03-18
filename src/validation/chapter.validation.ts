import { z } from 'zod';

export const createChapterSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Chapter title is required')
      .max(200, 'Chapter title must be at most 200 characters'),
    chapterNum: z.number()
      .int('Chapter number must be an integer')
      .positive('Chapter number must be positive'),
    content: z.string()
      .min(1, 'Chapter content is required'),
  }),
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
});

export const updateChapterSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Chapter title is required')
      .max(200, 'Chapter title must be at most 200 characters')
      .optional(),
    content: z.string()
      .min(1, 'Chapter content is required')
      .optional(),
  }),
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
    chapterNum: z.string().transform(Number),
  }),
});

export const chapterQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    sort: z.enum(['chapterNum', 'createdAt', 'viewsCount']).default('chapterNum'),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
});

export const chapterIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid chapter ID'),
  }),
});

export const chapterByNovelSchema = z.object({
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
    chapterNum: z.string().transform(Number),
  }),
});
