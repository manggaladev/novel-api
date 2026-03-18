import { z } from 'zod';

export const createGenreSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Genre name is required')
      .max(50, 'Genre name must be at most 50 characters'),
  }),
});

export const updateGenreSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Genre name is required')
      .max(50, 'Genre name must be at most 50 characters')
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid genre ID'),
  }),
});

export const genreIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid genre ID'),
  }),
});

export const genreQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  }),
});
