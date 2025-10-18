import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// 是否启用详细日志（记录请求体和响应体）
const VERBOSE_LOGGING = process.env.LOG_VERBOSE === 'true';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // 记录请求详情（详细模式）
  if (VERBOSE_LOGGING) {
    const requestInfo = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip: req.ip,
    };
    logger.debug(`→ Request: ${JSON.stringify(requestInfo)}`);
  }

  // 拦截响应数据（详细模式）
  if (VERBOSE_LOGGING) {
    const originalSend = res.send;
    res.send = function (data: any) {
      res.locals.responseBody = data;
      return originalSend.call(this, data);
    };
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    // 详细日志：包含请求和响应数据
    if (VERBOSE_LOGGING && res.locals.responseBody) {
      const responsePreview = res.locals.responseBody.substring(0, 200);
      logger.debug(`← Response: ${responsePreview}${res.locals.responseBody.length > 200 ? '...' : ''}`);
    }

    // 简洁日志：只记录关键信息
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

