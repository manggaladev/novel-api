import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Novel API',
      version: '1.0.0',
      description: 'REST API for Online Novel Platform - Manage novels, chapters, genres, bookmarks, ratings, and comments',
      contact: {
        name: 'Mavorynix',
        url: 'https://github.com/Mavorynix',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Novel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            slug: { type: 'string' },
            synopsis: { type: 'string' },
            coverUrl: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['ONGOING', 'COMPLETED', 'HIATUS'] },
            averageRating: { type: 'number' },
            totalChapters: { type: 'integer' },
            viewsCount: { type: 'integer' },
            authorId: { type: 'string' },
            publishedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Chapter: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            chapterNum: { type: 'integer' },
            content: { type: 'string' },
            novelId: { type: 'string' },
            viewsCount: { type: 'integer' },
            wordCount: { type: 'integer' },
            publishedAt: { type: 'string', format: 'date-time' },
          },
        },
        Genre: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'USER'] },
            avatar: { type: 'string', nullable: true },
            isVerified: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Novels', description: 'Novel management' },
      { name: 'Chapters', description: 'Chapter management' },
      { name: 'Genres', description: 'Genre management' },
      { name: 'Bookmarks', description: 'User bookmarks' },
      { name: 'Comments', description: 'Chapter comments' },
      { name: 'Ratings', description: 'Novel ratings' },
      { name: 'Reading History', description: 'User reading history' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);
