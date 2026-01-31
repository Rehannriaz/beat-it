import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Log full error details
  console.error('=== Unexpected Error ===');
  console.error('Path:', req.method, req.path);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('========================');

  // In development, return actual error message for debugging
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    status: 'error',
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};
