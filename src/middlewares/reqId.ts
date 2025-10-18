import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      reqId: string;
    }
  }
}

export function reqIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.reqId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  next();
}