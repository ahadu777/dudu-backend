import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// JWT Payload 类型定义
export interface UserTokenPayload {
  id: number;
  email: string;
}

export interface OperatorTokenPayload {
  sub: number;
  username: string;
  roles: string[];
  partner_id?: string;
  operator_type?: 'INTERNAL' | 'OTA';
}

// 扩展 Express Request 类型以包含 user 和 operator
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
      operator?: {
        operator_id: number;
        username: string;
        roles: string[];
        partner_id?: string;
        operator_type?: 'INTERNAL' | 'OTA';
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
 * Operator JWT 认证中间件
 * 验证 Authorization header 中的 operator Bearer token
 */
export const authenticateOperator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No operator token provided', 401);
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证 operator token (cast through unknown for type safety)
    const decoded = jwt.verify(token, String(env.JWT_SECRET)) as unknown as OperatorTokenPayload;

    // 将 operator 信息添加到请求对象
    req.operator = {
      operator_id: decoded.sub,
      username: decoded.username,
      roles: decoded.roles,
      partner_id: decoded.partner_id,
      operator_type: decoded.operator_type
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid operator token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Operator token expired', 401));
    } else {
      next(error);
    }
  }
};

/**
 * 可选 Operator JWT 认证中间件
 * 如果提供了 token 则验证，否则继续
 * 用于需要识别 operator 身份但不强制要求的端点（如 /qr/decrypt）
 */
export const optionalAuthenticateOperator = (
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
    const decoded = jwt.verify(token, String(env.JWT_SECRET)) as unknown as OperatorTokenPayload;
    req.operator = {
      operator_id: decoded.sub,
      username: decoded.username,
      roles: decoded.roles,
      partner_id: decoded.partner_id,
      operator_type: decoded.operator_type
    };
  } catch (error) {
    // 忽略错误，继续执行（token 无效时不设置 req.operator）
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

