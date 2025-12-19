import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { AppDataSource } from '../../config/database';
import { dataSourceConfig } from '../../config/data-source';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import { OrderService } from './service';
import { ERR, ERROR_STATUS_MAP } from '../../core/errors/codes';

const router = Router();
const orderService = new OrderService();

// POST /orders - Create order with idempotency (requires authentication)
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { items, channel_id, out_trade_no, coupon_code } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(422).json({
        code: ERR.VALIDATION_ERROR,
        message: 'Items array is required and cannot be empty'
      });
    }

    if (!channel_id || !out_trade_no) {
      return res.status(422).json({
        code: ERR.VALIDATION_ERROR,
        message: 'channel_id and out_trade_no are required'
      });
    }

    for (const item of items) {
      if (!item.product_id || !item.qty) {
        return res.status(422).json({
          code: ERR.VALIDATION_ERROR,
          message: 'Each item must have product_id and qty'
        });
      }
      if (item.qty < 1) {
        return res.status(422).json({
          code: ERR.VALIDATION_ERROR,
          message: 'Quantity must be at least 1'
        });
      }
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: ERR.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    const response = await orderService.createOrder(userId, {
      items,
      channel_id,
      out_trade_no,
      coupon_code
    });

    res.status(200).json(response);
  } catch (error: any) {
    if (error.code) {
      const status = ERROR_STATUS_MAP[error.code as keyof typeof ERROR_STATUS_MAP] || 500;
      return res.status(status).json({
        code: error.code,
        message: error.message
      });
    }

    logger.error('orders.create.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
});

// GET /orders - List user's orders (requires authentication)
router.get('/', authenticate, async (req: any, res) => {
  const userId = req.user.id;

  try {
    let userOrders: any[] = [];

    // Use database if available, otherwise fall back to mock store
    if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
      // Query from database
      const orders = await AppDataSource.query(
        `SELECT 
          o.id as order_id,
          o.user_id,
          o.status,
          o.channel_id,
          o.out_trade_no,
          o.subtotal,
          o.discount,
          o.total,
          o.created_at,
          o.paid_at,
          COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'product_id', oi.product_id,
                'qty', oi.qty,
                'unit_price', oi.unit_price
              )
            ),
            JSON_ARRAY()
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.id, o.user_id, o.status, o.channel_id, o.out_trade_no, o.subtotal, o.discount, o.total, o.created_at, o.paid_at
        ORDER BY o.created_at DESC`,
        [userId]
      );

      userOrders = orders.map((order: any) => {
        let items = [];
        try {
          if (order.items) {
            const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            items = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          logger.error('orders.list.parse_items_error', { error: String(e), order_id: order.order_id });
          items = [];
        }

        return {
          order_id: order.order_id,
          user_id: order.user_id,
          status: order.status,
          channel_id: order.channel_id,
          out_trade_no: order.out_trade_no,
          amounts: {
            subtotal: Number(order.subtotal),
            discount: Number(order.discount),
            total: Number(order.total)
          },
          items: items,
          created_at: order.created_at.toISOString(),
          paid_at: order.paid_at ? order.paid_at.toISOString() : null
        };
      });
    } else {
      // Fall back to mock store
      userOrders = mockStore.getOrdersByUserId(userId);
    }

    logger.info('orders.list', {
      user_id: userId,
      count: userOrders.length,
      source: dataSourceConfig.useDatabase && AppDataSource.isInitialized ? 'database' : 'mock'
    });

    // Return orders
    res.json({
      orders: userOrders,
      total_count: userOrders.length
    });

  } catch (error) {
    logger.error('orders.list.error', {
      user_id: userId,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch orders'
    });
  }
});

export default router;