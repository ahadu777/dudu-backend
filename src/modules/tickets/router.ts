import { Router } from 'express';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import { authenticate } from '../../middlewares/auth';
import { Ticket, TicketCancellationRequest, TicketCancellationResponse, TicketStatus } from '../../types/domain';

const router = Router();

// Using standard JWT authentication middleware

// Simple metrics
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  }
};

// GET /my/orders - List user's orders
router.get('/orders', authenticate, (req: any, res) => {
  const startTime = Date.now();
  const userId = req.user.id;

  try {
    // Get orders for authenticated user from mock store
    const userOrders = mockStore.getOrdersByUserId(userId);

    logger.info('orders.list', {
      user_id: userId,
      count: userOrders.length
    });
    metrics.increment('orders.list.count');

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

// GET /my/tickets - List user's tickets with entitlements
router.get('/tickets', authenticate, (req: any, res) => {
  const startTime = Date.now();
  const userId = req.user.id;

  try {
    // Get tickets for authenticated user from mock store
    const userTickets = mockStore.getTicketsByUserId(userId);

    // Sort by ticket_code DESC for stable ordering
    const sortedTickets = userTickets.sort((a, b) =>
      b.ticket_code.localeCompare(a.ticket_code)
    );

    logger.info('tickets.list', {
      user_id: userId,
      count: sortedTickets.length
    });
    metrics.increment('tickets.list.count');

    // Return tickets using domain.ts Ticket type
    res.json({
      tickets: sortedTickets
    });

  } catch (error) {
    logger.error('tickets.list.error', {
      user_id: userId,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch tickets'
    });
  }
});

// POST /tickets/{code}/cancel - Cancel ticket and initiate refund
router.post('/:code/cancel', authenticate, (req: any, res) => {
  const { code } = req.params;
  const userId = req.user.id;
  const requestBody: TicketCancellationRequest = req.body || {};

  try {
    // Get ticket and verify ownership
    const ticket = mockStore.getTicket(code);
    if (!ticket) {
      logger.info('ticket.cancellation.not_found', { ticket_code: code, user_id: userId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Ticket not found or not owned by user'
      });
    }

    if (ticket.user_id !== userId) {
      logger.info('ticket.cancellation.not_owned', { ticket_code: code, user_id: userId, owner_id: ticket.user_id });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Ticket not found or not owned by user'
      });
    }

    // Check if already cancelled (idempotent)
    if (ticket.status === TicketStatus.VOID) {
      logger.info('ticket.cancellation.already_cancelled', { ticket_code: code, user_id: userId });
      const response: TicketCancellationResponse = {
        ticket_status: ticket.status,
        refund_amount: 0, // Already processed
        refund_id: 'ALREADY_CANCELLED',
        cancelled_at: ticket.cancelled_at || new Date().toISOString()
      };
      return res.json(response);
    }

    // Check if ticket can be cancelled
    if (ticket.status === TicketStatus.REDEEMED || ticket.status === TicketStatus.EXPIRED) {
      logger.info('ticket.cancellation.cannot_cancel', {
        ticket_code: code,
        user_id: userId,
        status: ticket.status
      });
      return res.status(409).json({
        code: 'CANCELLATION_NOT_ALLOWED',
        message: `Cannot cancel ${ticket.status} ticket`
      });
    }

    logger.info('ticket.cancellation.requested', {
      ticket_code: code,
      user_id: userId,
      reason: requestBody.reason
    });

    // Calculate refund amount before cancellation
    const refundAmount = mockStore.calculateRefundAmount(code);

    // Cancel the ticket
    const cancelled = mockStore.cancelTicket(code, requestBody.reason);
    if (!cancelled) {
      logger.info('ticket.cancellation.failed', { ticket_code: code, user_id: userId });
      return res.status(500).json({
        code: 'CANCELLATION_FAILED',
        message: 'Failed to cancel ticket'
      });
    }

    // Create refund record if refund amount > 0
    let refundId = 'NO_REFUND';
    if (refundAmount > 0) {
      const refund = mockStore.createRefund(
        ticket.order_id,
        refundAmount,
        'ticket_cancellation',
        parseInt(ticket.ticket_code.split('-')[1]) // Extract ticket ID from code
      );
      refundId = refund.refund_id;

      // Simulate payment gateway call (mock success)
      setTimeout(() => {
        mockStore.updateRefundStatus(refundId, 'success', { gateway_ref: 'MOCK_SUCCESS' });
        mockStore.updateOrderRefundStatus(ticket.order_id, refundAmount);
        logger.info('refund.gateway.success', { refund_id: refundId, amount: refundAmount });
      }, 100);

      logger.info('refund.initiated', {
        refund_id: refundId,
        order_id: ticket.order_id,
        amount: refundAmount
      });
    }

    const response: TicketCancellationResponse = {
      ticket_status: TicketStatus.VOID,
      refund_amount: refundAmount,
      refund_id: refundId,
      cancelled_at: ticket.cancelled_at || new Date().toISOString()
    };

    logger.info('ticket.cancellation.success', {
      ticket_code: code,
      user_id: userId,
      refund_amount: refundAmount,
      refund_id: refundId
    });
    metrics.increment('ticket.cancellations.count');

    res.json(response);

  } catch (error) {
    logger.error('ticket.cancellation.error', {
      ticket_code: code,
      user_id: userId,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to process cancellation'
    });
  }
});

export default router;