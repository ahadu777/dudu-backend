import { Router } from 'express';
import { OrderController } from './controller';
import { authenticate } from '../../middlewares/auth';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';

const router = Router();
const orderController = new OrderController();

// POST /orders - Create order with idempotency
router.post('/', orderController.createOrder);

// GET /orders - List user's orders (requires authentication)
router.get('/', authenticate, (req: any, res) => {
  const startTime = Date.now();
  const userId = req.user.id;

  try {
    // Get orders for authenticated user from mock store
    const userOrders = mockStore.getOrdersByUserId(userId);

    logger.info('orders.list', {
      user_id: userId,
      count: userOrders.length
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