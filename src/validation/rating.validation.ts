import { z } from 'zod';

export const createRatingSchema = z.object({
  body: z.object({
    score: z.number()
      .int('Score must be an integer')
      .min(1, 'Score must be between 1 and 5')
      .max(5, 'Score must be between 1 and 5'),
  }),
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
});

export const ratingQuerySchema = z.object({
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
});
