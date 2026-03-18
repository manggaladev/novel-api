/**
 * Novel API Entry Point
 * Starts the Express server with WebSocket support
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './config/database';

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, async () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   📚 Novel API Server                                      ║
  ║   ────────────────────────────────────────────────────     ║
  ║   Server running on: http://localhost:${PORT}                 ║
  ║   API Docs: http://localhost:${PORT}/api-docs                 ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
