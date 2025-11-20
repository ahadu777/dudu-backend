/**
 * Pagination Middleware
 *
 * Standardizes pagination across all list APIs
 * Supports both page-based and offset-based pagination
 *
 * Usage:
 *   router.get('/items', paginationMiddleware(), controller.list);
 *   router.get('/items', paginationMiddleware({ default: 50, max: 200 }), controller.list);
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface PaginationOptions {
  /** Default page size */
  defaultLimit?: number;
  /** Maximum page size */
  maxLimit?: number;
  /** Pagination style: 'page' (page+limit) or 'offset' (offset+limit) */
  style?: 'page' | 'offset';
}

export interface PaginationParams {
  /** Page number (1-based, only for page-based pagination) */
  page?: number;
  /** Number of items per page */
  limit: number;
  /** Offset for items (only for offset-based pagination) */
  offset?: number;
}

// Extend Express Request to include pagination
declare global {
  namespace Express {
    interface Request {
      pagination: PaginationParams;
    }
  }
}

/**
 * Creates a pagination middleware with configurable options
 *
 * @param options - Pagination configuration
 * @returns Express middleware function
 *
 * @example
 * // Default settings (page-based, limit=20, max=100)
 * router.get('/tickets', paginationMiddleware(), handler);
 *
 * @example
 * // Custom settings
 * router.get('/orders', paginationMiddleware({
 *   defaultLimit: 50,
 *   maxLimit: 200,
 *   style: 'offset'
 * }), handler);
 */
export function paginationMiddleware(options: PaginationOptions = {}) {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    style = 'page'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = req.query;

      // Parse and validate limit
      let parsedLimit = defaultLimit;
      if (limit) {
        parsedLimit = parseInt(limit as string, 10);

        if (isNaN(parsedLimit) || parsedLimit < 1) {
          return res.status(422).json({
            error: 'INVALID_PARAMETER',
            message: 'limit must be a positive integer'
          });
        }

        // Enforce maximum limit
        if (parsedLimit > maxLimit) {
          logger.warn('pagination.limit_exceeded', {
            requested: parsedLimit,
            max: maxLimit,
            path: req.path
          });
          parsedLimit = maxLimit;
        }
      }

      // Initialize pagination object
      req.pagination = {
        limit: parsedLimit
      };

      // Handle page-based pagination
      if (style === 'page') {
        let parsedPage = 1;

        if (page) {
          parsedPage = parseInt(page as string, 10);

          if (isNaN(parsedPage) || parsedPage < 1) {
            return res.status(422).json({
              error: 'INVALID_PARAMETER',
              message: 'page must be a positive integer'
            });
          }
        }

        req.pagination.page = parsedPage;
        // Calculate offset for database queries (optional, for convenience)
        req.pagination.offset = (parsedPage - 1) * parsedLimit;
      }

      // Handle offset-based pagination
      if (style === 'offset') {
        let parsedOffset = 0;

        if (offset) {
          parsedOffset = parseInt(offset as string, 10);

          if (isNaN(parsedOffset) || parsedOffset < 0) {
            return res.status(422).json({
              error: 'INVALID_PARAMETER',
              message: 'offset must be a non-negative integer'
            });
          }
        }

        req.pagination.offset = parsedOffset;
      }

      logger.debug('pagination.parsed', {
        style,
        params: req.pagination,
        path: req.path
      });

      next();
    } catch (error: any) {
      logger.error('pagination.middleware_error', {
        error: error.message,
        path: req.path
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to process pagination parameters'
      });
    }
  };
}

/**
 * Helper function to format paginated response
 *
 * @param items - Array of items for current page
 * @param total - Total count of all items
 * @param pagination - Pagination parameters from request
 * @returns Formatted response object
 *
 * @example
 * const result = formatPaginatedResponse(tickets, totalCount, req.pagination);
 * res.json(result);
 */
export function formatPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: PaginationParams
): {
  items: T[];
  total: number;
  page?: number;
  page_size: number;
  offset?: number;
  has_more: boolean;
} {
  const response: any = {
    items,
    total,
    page_size: pagination.limit,
    has_more: false
  };

  if (pagination.page !== undefined) {
    // Page-based response
    response.page = pagination.page;
    response.has_more = pagination.page * pagination.limit < total;
  } else if (pagination.offset !== undefined) {
    // Offset-based response
    response.offset = pagination.offset;
    response.has_more = pagination.offset + pagination.limit < total;
  }

  return response;
}
