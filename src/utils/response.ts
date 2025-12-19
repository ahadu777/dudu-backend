import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class ResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message: message || 'Success',
      data,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message || 'Created successfully', 201);
  }

  static error(res: Response, message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR'): Response {
    // Standardized error format: { code: string, message: string }
    return res.status(statusCode).json({
      code,
      message,
    });
  }
}

