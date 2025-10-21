import { Router } from 'express';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import { RefundProcessingRequest, RefundProcessingResponse, RefundListResponse, RefundStatus } from '../../types/domain';

const router = Router();

// Simple auth middleware (mock for prototype)
const mockAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Bearer token required'
    });
  }

  // Mock: extract user_id from token (in production, decode JWT)
  const token = authHeader.split(' ')[1];
  if (token === 'user123') {
    req.user = { user_id: 123 };
  } else if (token === 'user456') {
    req.user = { user_id: 456 };
  } else {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    });
  }

  next();
};

// Simple metrics
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  }
};

// POST /payments/refund - Internal refund processing endpoint
router.post('/refund', (req, res) => {
  const requestBody: RefundProcessingRequest = req.body;

  try {
    // Validate request
    if (!requestBody.order_id || !requestBody.amount || !requestBody.reason) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: order_id, amount, reason'
      });
    }

    logger.info('refund.initiated', {
      order_id: requestBody.order_id,
      amount: requestBody.amount,
      reason: requestBody.reason,
      ticket_id: requestBody.ticket_id
    });

    // Get order and validate
    const order = mockStore.getOrderById(requestBody.order_id);
    if (!order) {
      logger.info('refund.order_not_found', { order_id: requestBody.order_id });
      return res.status(404).json({
        code: 'ORDER_NOT_FOUND',
        message: `Order ${requestBody.order_id} not found`
      });
    }

    if (order.status !== 'PAID') {
      logger.info('refund.order_not_paid', {
        order_id: requestBody.order_id,
        status: order.status
      });
      return res.status(422).json({
        code: 'ORDER_NOT_REFUNDABLE',
        message: `Order ${requestBody.order_id} is not in PAID status`
      });
    }

    // Check refund amount doesn't exceed remaining refundable amount
    const currentRefundAmount = order.refund_amount || 0;
    const totalOrderAmount = order.amounts?.total || 0;
    const remainingRefundable = totalOrderAmount - currentRefundAmount;

    if (requestBody.amount > remainingRefundable) {
      logger.info('refund.amount_exceeds_limit', {
        order_id: requestBody.order_id,
        requested_amount: requestBody.amount,
        remaining_refundable: remainingRefundable
      });
      return res.status(422).json({
        code: 'REFUND_AMOUNT_EXCEEDS_LIMIT',
        message: `Refund amount ${requestBody.amount} exceeds remaining refundable amount ${remainingRefundable}`
      });
    }

    // Create refund record
    const refund = mockStore.createRefund(
      requestBody.order_id,
      requestBody.amount,
      requestBody.reason,
      requestBody.ticket_id
    );

    // Simulate payment gateway API call
    setTimeout(() => {
      // Mock successful refund processing
      const gatewayResponse = {
        gateway_ref: `MOCK_REF_${Date.now()}`,
        processed_at: new Date().toISOString(),
        status: 'success'
      };

      mockStore.updateRefundStatus(refund.refund_id, 'success', gatewayResponse);
      mockStore.updateOrderRefundStatus(requestBody.order_id, requestBody.amount);

      logger.info('refund.gateway.success', {
        refund_id: refund.refund_id,
        gateway_ref: gatewayResponse.gateway_ref,
        amount: requestBody.amount
      });

      metrics.increment('refunds.completed.count');
    }, 500); // 500ms delay to simulate processing

    const response: RefundProcessingResponse = {
      refund_id: refund.refund_id,
      status: RefundStatus.PENDING,
      amount: requestBody.amount
    };

    logger.info('refund.processing.initiated', {
      refund_id: refund.refund_id,
      order_id: requestBody.order_id,
      amount: requestBody.amount
    });
    metrics.increment('refunds.initiated.count');

    res.json(response);

  } catch (error) {
    logger.error('refund.processing.error', {
      order_id: requestBody.order_id,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to process refund'
    });
  }
});

// GET /my/refunds - List user's refunds
router.get('/my/refunds', mockAuth, (req: any, res) => {
  const userId = req.user.user_id;

  try {
    // Get refunds for authenticated user
    const userRefunds = mockStore.getRefundsByUserId(userId);

    // Sort by created_at DESC for most recent first
    const sortedRefunds = userRefunds.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    logger.info('refunds.list', {
      user_id: userId,
      count: sortedRefunds.length
    });
    metrics.increment('refunds.list.count');

    const response: RefundListResponse = {
      refunds: sortedRefunds
    };

    res.json(response);

  } catch (error) {
    logger.error('refunds.list.error', {
      user_id: userId,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch refunds'
    });
  }
});

export default router;