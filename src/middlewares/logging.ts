import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request
  logger.http(`Incoming ${req.method} ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

