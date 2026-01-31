import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];

    // TODO: Verify token and attach user to request
    // const decoded = verifyToken(token);
    // req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
