/**
 * Pagination Middleware Usage Examples
 *
 * This file demonstrates how to use the pagination middleware
 * in different scenarios across the project.
 *
 * See also: docs/reference/PAGINATION-MIDDLEWARE-MIGRATION.md
 */

import { Router, Request, Response } from 'express';
import { paginationMiddleware, formatPaginatedResponse } from '../src/middlewares/pagination.js';

const router = Router();

// ============================================
// Example 1: Default Configuration (Page-Based)
// ============================================
// URL: GET /api/tickets?page=2&limit=20
// Parsed: req.pagination = { page: 2, limit: 20, offset: 20 }

router.get('/tickets',
  paginationMiddleware(), // Default: page-based, limit=20, max=100
  async (req: Request, res: Response) => {
    const { page, limit } = req.pagination;

    // Use in service/repository
    const tickets = await ticketService.getAll({
      page: page!,
      limit
    });

    const total = await ticketService.count();

    // Format response
    const result = formatPaginatedResponse(tickets, total, req.pagination);
    res.json(result);
  }
);

// ============================================
// Example 2: Custom Configuration
// ============================================
// URL: GET /api/orders?page=1&limit=50
// Parsed: req.pagination = { page: 1, limit: 50, offset: 0 }

router.get('/orders',
  paginationMiddleware({
    defaultLimit: 50,   // Start with 50 items per page
    maxLimit: 200       // Allow up to 200 items per page
  }),
  async (req: Request, res: Response) => {
    const { page, limit, offset } = req.pagination;

    // Can use either page or offset for database queries
    const orders = await orderRepository.find({
      skip: offset,   // TypeORM uses skip/take
      take: limit
    });

    const total = await orderRepository.count();

    res.json(formatPaginatedResponse(orders, total, req.pagination));
  }
);

// ============================================
// Example 3: Offset-Based Pagination
// ============================================
// URL: GET /api/transactions?offset=100&limit=20
// Parsed: req.pagination = { offset: 100, limit: 20 }

router.get('/transactions',
  paginationMiddleware({
    style: 'offset',
    defaultLimit: 20,
    maxLimit: 100
  }),
  async (req: Request, res: Response) => {
    const { offset, limit } = req.pagination;

    const transactions = await db.query(
      'SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [{ total }] = await db.query('SELECT COUNT(*) as total FROM transactions');

    res.json(formatPaginatedResponse(transactions, total, req.pagination));
  }
);

// ============================================
// Example 4: Migration from Existing Code (OTA)
// ============================================

// ❌ BEFORE: Manual validation in each endpoint
router.get('/ota/tickets-old', async (req: Request, res: Response) => {
  const { page, limit } = req.query;

  // 🔴 Repeated validation code
  let pageNum = 1;
  if (page) {
    pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(422).json({
        error: 'INVALID_PARAMETER',
        message: 'page must be a positive integer'
      });
    }
  }

  let limitNum = 100;
  if (limit) {
    limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(422).json({
        error: 'INVALID_PARAMETER',
        message: 'limit must be a positive integer'
      });
    }
  }

  // ... business logic
});

// ✅ AFTER: Using middleware
router.get('/ota/tickets-new',
  paginationMiddleware({ maxLimit: 1000 }), // OTA needs higher limit
  async (req: Request, res: Response) => {
    // req.pagination is already validated and parsed
    const { page, limit } = req.pagination;

    // ... business logic (cleaner code)
  }
);

// ============================================
// Example 5: Complex Filters + Pagination
// ============================================
// URL: GET /api/ota/batches?status=active&partner_id=123&page=1&limit=50

router.get('/ota/batches',
  paginationMiddleware({ defaultLimit: 50, maxLimit: 200 }),
  async (req: Request, res: Response) => {
    // Pagination is handled by middleware
    const { page, limit } = req.pagination;

    // Focus on business filters only
    const { status, partner_id, date_range } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (partner_id) filters.partner_id = partner_id;
    if (date_range) filters.date_range = date_range;

    // Clean service call
    const batches = await otaService.getBatches({
      ...filters,
      page: page!,
      limit
    });

    const total = await otaService.countBatches(filters);

    res.json(formatPaginatedResponse(batches, total, req.pagination));
  }
);

// ============================================
// Example 6: Mock Data with Pagination
// ============================================

router.get('/products',
  paginationMiddleware(),
  async (req: Request, res: Response) => {
    const { page, limit, offset } = req.pagination;

    // Mock data array
    const allProducts = mockStore.products; // Assume 100+ products

    // Apply pagination to mock data
    const paginatedProducts = allProducts.slice(offset, offset! + limit);
    const total = allProducts.length;

    res.json(formatPaginatedResponse(paginatedProducts, total, req.pagination));
  }
);

// ============================================
// Error Handling Examples
// ============================================

// Invalid page number
// GET /api/tickets?page=-1
// Response: 422 { error: 'INVALID_PARAMETER', message: 'page must be a positive integer' }

// Invalid limit
// GET /api/tickets?limit=abc
// Response: 422 { error: 'INVALID_PARAMETER', message: 'limit must be a positive integer' }

// Exceeding max limit
// GET /api/tickets?limit=1000 (when max=100)
// Response: 200 { items: [...], page_size: 100 } (auto-capped to max)
// Warning logged: 'pagination.limit_exceeded'

// ============================================
// Response Format Examples
// ============================================

/**
 * Page-based response:
 * {
 *   "items": [...],
 *   "total": 250,
 *   "page": 2,
 *   "page_size": 20,
 *   "has_more": true
 * }
 *
 * Offset-based response:
 * {
 *   "items": [...],
 *   "total": 250,
 *   "offset": 40,
 *   "page_size": 20,
 *   "has_more": true
 * }
 */

export default router;
