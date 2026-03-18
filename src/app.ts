/**
 * Express Application Setup
 * Main application with middleware and routes for Novel API
 * Includes WebSocket support for real-time notifications
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth.routes';
import novelRoutes from './routes/novel.routes';
import chapterRoutes from './routes/chapter.routes';
import genreRoutes from './routes/genre.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import commentRoutes from './routes/comment.routes';
import ratingRoutes from './routes/rating.routes';
import historyRoutes from './routes/history.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';
import followRoutes from './routes/follow.routes';
import readingListRoutes from './routes/readingList.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import progressRoutes from './routes/progress.routes';
import recommendationRoutes from './routes/recommendation.routes';
import reportRoutes from './routes/report.routes';

import { errorHandler, notFound } from './middleware/error.middleware';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './config/rateLimit';
import { getCorsOptions } from './config/cors';
import { verifyToken } from './utils/jwt';

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Authenticate user
  socket.on('authenticate', (token: string) => {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        connectedUsers.set(decoded.id, socket.id);
        socket.data.userId = decoded.id;
        socket.join(`user:${decoded.id}`);
        socket.emit('authenticated', { message: 'Successfully authenticated' });
        console.log(`[Socket] User authenticated: ${decoded.id}`);
      }
    } catch (error) {
      socket.emit('authentication_error', { message: 'Invalid token' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.data.userId) {
      connectedUsers.delete(socket.data.userId);
      console.log(`[Socket] User disconnected: ${socket.data.userId}`);
    }
  });
});

// Make io available to controllers
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(getCorsOptions()));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Rate limiting
app.use('/api/', apiLimiter);

// API Documentation
// @ts-expect-error - swagger-ui-express type mismatch with express 5 types
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Novel API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '📚 Novel API is running!',
    version: '3.0.0',
    documentation: '/api-docs',
    websocket: '/socket.io',
    endpoints: {
      auth: '/api/auth',
      novels: '/api/novels',
      chapters: '/api/chapters',
      genres: '/api/genres',
      bookmarks: '/api/bookmarks',
      comments: '/api/comments',
      ratings: '/api/ratings',
      history: '/api/history',
      upload: '/api/upload',
      users: '/api/users',
      follows: '/api/follows',
      readingLists: '/api/reading-lists',
      notifications: '/api/notifications',
      admin: '/api/admin',
      progress: '/api/progress',
      recommendations: '/api/recommendations',
      reports: '/api/reports',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/reading-lists', readingListRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/reports', reportRoutes);

// 404 Handler
app.use(notFound);

// Error Handler
app.use(errorHandler);

export { server, io, connectedUsers };
export default app;
