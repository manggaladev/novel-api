import { z } from 'zod';

export const createNovelSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters'),
    synopsis: z.string()
      .max(5000, 'Synopsis must be at most 5000 characters')
      .optional(),
    status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).default('ONGOING'),
    genreIds: z.array(z.string().uuid()).optional(),
  }),
});

export const updateNovelSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters')
      .optional(),
    synopsis: z.string()
      .max(5000, 'Synopsis must be at most 5000 characters')
      .optional(),
    status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
    genreIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid novel ID'),
  }),
});

export const novelQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    sort: z.enum(['createdAt', 'title', 'averageRating', 'viewsCount', 'totalChapters']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
    genre: z.string().optional(), // genre slug
    search: z.string().optional(),
    authorId: z.string().uuid().optional(),
  }),
});

export const novelIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid novel ID'),
  }),
});

export const novelSlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Novel slug is required'),
  }),
});
