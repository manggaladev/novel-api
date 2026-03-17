import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

interface AppError extends Error {
  statusCode?: number;
  status?: string;
  code?: string;
}

export const unauthorized = (message: string = 'Unauthorized'): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 401;
  error.status = 'fail';
  return error;
};

export const forbidden = (message: string = 'Forbidden'): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 403;
  error.status = 'fail';
  return error;
};

export const badRequest = (message: string = 'Bad Request'): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.status = 'fail';
  return error;
};

export const notFoundError = (message: string = 'Not Found'): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 404;
  error.status = 'fail';
  return error;
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        const field = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          success: false,
          error: `Duplicate value for ${field}`,
        });
        return;
      case 'P2025':
        res.status(404).json({
          success: false,
          error: 'Record not found',
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          error: 'Invalid reference to related record',
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
    });
    return;
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: 'File too large',
    });
    return;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: 'Unexpected file field',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
    });
    return;
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : message,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};
