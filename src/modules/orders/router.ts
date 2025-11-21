import { Router } from 'express';
import { OrderController } from './controller';
import { authenticate } from '../../middlewares/auth';
import { AppDataSource } from '../../config/database';
import { dataSourceConfig } from '../../config/data-source';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';

const router = Router();
const orderController = new OrderController();

// POST /orders - Create order with idempotency (requires authentication)
router.post('/', authenticate, orderController.createOrder);

// GET /orders - List user's orders (requires authentication)
router.get('/', authenticate, async (req: any, res) => {
  const startTime = Date.now();
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