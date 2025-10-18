import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// 扩展 Express Request 类型以包含 user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

/**
 * JWT 认证中间件
 * 验证 Authorization header 中的 Bearer token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证 token
    const decoded = jwt.verify(token, String(env.JWT_SECRET)) as { id: number; email: string };

    // 将用户信息添加到请求对象
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，否则继续
 */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, String(env.JWT_SECRET)) as { id: number; email: string };
    req.user = decoded;
  } catch (error) {
    // 忽略错误，继续执行
  }

  next();
};

/**
 * 生成 JWT token
 */
export const generateToken = (payload: { id: number; email: string }): string => {
  return jwt.sign(payload, String(env.JWT_SECRET), {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
};

