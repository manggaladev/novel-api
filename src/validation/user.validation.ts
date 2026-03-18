import { z } from 'zod';

export const bookmarkQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
});

export const bookmarkParamsSchema = z.object({
  params: z.object({
    novelId: z.string().uuid('Invalid novel ID'),
  }),
});

export const historyQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),
});
