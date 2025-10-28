import { Router } from 'express';
import { randomBytes } from 'crypto';
import { mockDataStore } from '../../core/mock/data';
import { ticketService } from '../tickets/service';

const router = Router();

const logger = {
  info: (event: string, data?: any) => {
    console.log(JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }
};

const metrics = {
  increment: (metric: string) => {
    console.log(`[METRIC] ${metric} +1`);
  }
};

interface PaymentNotification {
  order_id: number;
  payment_status: 'SUCCESS' | 'FAILED';
  paid_at: string;
  signature: string;
}

// Mock signature validation
function validateSignature(signature: string): boolean {
  // In production, would verify with payment provider's secret
  return !!(signature && signature.length > 0);
}

router.post('/wechat/session', (req, res) => {
  const { orderId, amount, currency, reservationId, description } = req.body ?? {};

  if (!orderId || typeof orderId !== 'number') {
    return res.status(422).json({
      code: 'WECHAT_SESSION_INVALID_ORDER_ID',
      message: 'orderId (number) is required'
    });
  }

  if (amount === undefined || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(422).json({
      code: 'WECHAT_SESSION_INVALID_AMOUNT',
      message: 'amount must be a positive number'
    });
  }

  if (!currency || typeof currency !== 'string') {
    return res.status(422).json({
      code: 'WECHAT_SESSION_INVALID_CURRENCY',
      message: 'currency is required'
    });
  }

  const order = mockDataStore.getOrderById(orderId);
  if (!order) {
    return res.status(404).json({
      code: 'WECHAT_SESSION_ORDER_NOT_FOUND',
      message: 'Order not found'
    });
  }

  const prepayId = `wx_${randomBytes(12).toString('hex')}`;
  const nonceStr = randomBytes(16).toString('hex');
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const packageValue = `prepay_id=${prepayId}`;
  const paySign = randomBytes(16).toString('hex');

  return res.status(200).json({
    order_id: orderId,
    reservation_id: reservationId ?? null,
    amount: Number(amount),
    currency,
    description: description ?? '',
    prepay_id: prepayId,
    nonce_str: nonceStr,
    time_stamp: timeStamp,
    sign_type: 'HMAC-SHA256',
    package: packageValue,
    pay_sign: paySign,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  });
});

// POST /payments/notify - Payment webhook handler
router.post('/notify', async (req, res) => {
  try {
    const notification: PaymentNotification = req.body;
    logger.info('payment.webhook.received', { order_id: notification.order_id });

    // Validate signature
    if (!validateSignature(notification.signature)) {
      logger.info('payment.webhook.invalid_signature', { order_id: notification.order_id });
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    // Find order
    const order = mockDataStore.getOrderById(notification.order_id);

    if (!order) {
      logger.info('payment.webhook.order_not_found', { order_id: notification.order_id });
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Check if already paid (idempotency)
    if (order.status === 'PAID') {
      logger.info('payment.webhook.already_paid', { order_id: notification.order_id });
      metrics.increment('payment.webhook.count');
      return res.status(200).json({
        message: 'Order already paid',
        order_id: notification.order_id
      });
    }

    // Only process SUCCESS payments
    if (notification.payment_status !== 'SUCCESS') {
      logger.info('payment.webhook.payment_failed', { order_id: notification.order_id });
      return res.status(400).json({
        error: 'Payment failed'
      });
    }

    // Check order is PENDING
    if (order.status !== 'PENDING_PAYMENT') {
      logger.info('payment.webhook.invalid_order_status', {
        order_id: notification.order_id,
        status: order.status
      });
      return res.status(400).json({
        error: 'Order not in pending status'
      });
    }

    // Update order to PAID
    const updatedOrder = mockDataStore.updateOrderStatus(
      notification.order_id,
      'PAID',
      new Date(notification.paid_at)
    );

    if (!updatedOrder) {
      logger.info('payment.webhook.update_failed', { order_id: notification.order_id });
      return res.status(500).json({
        error: 'Failed to update order status'
      });
    }

    // Commit inventory (reserved -> sold)
    for (const item of order.items) {
      const committed = mockDataStore.commitInventory(item.product_id, item.qty);
      if (!committed) {
        // Rollback order status if inventory commit fails
        mockDataStore.updateOrderStatus(notification.order_id, 'PENDING_PAYMENT');
        logger.info('payment.webhook.inventory_commit_failed', {
          order_id: notification.order_id,
          product_id: item.product_id
        });
        return res.status(500).json({
          error: 'Failed to commit inventory'
        });
      }
    }

    // Synchronously call ticket issuance
    try {
      const tickets = await ticketService.issueTicketsForPaidOrder(notification.order_id);
      logger.info('payment.webhook.tickets_issued', {
        order_id: notification.order_id,
        ticket_count: tickets.length
      });
    } catch (ticketError: any) {
      // Rollback order status if ticket issuance fails
      mockDataStore.updateOrderStatus(notification.order_id, 'PENDING_PAYMENT');

      // Release committed inventory
      for (const item of order.items) {
        mockDataStore.releaseInventory(item.product_id, item.qty);
      }

      logger.info('payment.webhook.ticket_issuance_failed', {
        order_id: notification.order_id,
        error: ticketError.message
      });

      return res.status(500).json({
        error: 'Ticket issuance failed',
        message: ticketError.message
      });
    }

    logger.info('payment.webhook.success', { order_id: notification.order_id });
    metrics.increment('payment.webhook.count');

    res.status(200).json({
      message: 'Payment processed successfully',
      order_id: notification.order_id
    });

  } catch (error: any) {
    logger.info('payment.webhook.error', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
