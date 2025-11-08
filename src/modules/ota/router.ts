import { Router, Request, Response } from 'express';
import { otaAuthMiddleware } from '../../middlewares/otaAuth';
import { otaService } from './service';
import { logger } from '../../utils/logger';

const router = Router();

// Apply OTA authentication to all routes
router.use(otaAuthMiddleware());

interface AuthenticatedRequest extends Request {
  ota_partner?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

// GET /api/ota/inventory - Get real-time package availability
router.get('/inventory', otaAuthMiddleware('inventory:read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productIdsParam = req.query.product_ids as string;
    let productIds: number[] | undefined;

    if (productIdsParam) {
      productIds = productIdsParam.split(',').map(id => {
        const parsed = parseInt(id.trim(), 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid product ID: ${id}`);
        }
        return parsed;
      });
    }

    const inventory = await otaService.getInventory(productIds);

    res.json(inventory);

  } catch (error: any) {
    logger.error('OTA inventory request failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      query: req.query
    });

    if (error.message?.includes('Invalid product ID')) {
      return res.status(422).json({
        error: 'INVALID_PRODUCT_IDS',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve inventory information'
    });
  }
});

// POST /api/ota/reserve - Reserve package inventory
router.post('/reserve', otaAuthMiddleware('reserve:create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, quantity, reservation_expires_at } = req.body;

    // Validate required fields
    if (typeof product_id !== 'number' || typeof quantity !== 'number') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'product_id and quantity are required and must be numbers'
      });
    }

    const reservation = await otaService.createReservation({
      product_id,
      quantity,
      reservation_expires_at
    });

    res.status(201).json(reservation);

  } catch (error: any) {
    logger.error('OTA reservation request failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      request_body: req.body
    });

    const statusCode = error.code === 'PRODUCT_NOT_FOUND' ? 404 :
                      error.code === 'SOLD_OUT' ? 409 :
                      error.code === 'VALIDATION_ERROR' ? 422 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to create reservation'
    });
  }
});

// GET /api/ota/reservations/:id - Get reservation details
router.get('/reservations/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reservationId = req.params.id;
    const reservation = await otaService.getReservation(reservationId);

    res.json(reservation);

  } catch (error: any) {
    logger.error('OTA reservation lookup failed', {
      partner: req.ota_partner?.name,
      reservation_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'RESERVATION_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve reservation'
    });
  }
});

// GET /api/ota/reservations - List active reservations (for debugging/monitoring)
router.get('/reservations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reservations = await otaService.getActiveReservations();

    res.json({
      reservations,
      total_count: reservations.length
    });

  } catch (error: any) {
    logger.error('OTA reservations list failed', {
      partner: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve reservations'
    });
  }
});

// POST /api/ota/reservations/:id/activate - Convert reservation to order
router.post('/reservations/:id/activate', otaAuthMiddleware('reserve:activate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reservationId = req.params.id;
    const { customer_details, payment_reference, special_requests } = req.body;

    // Validate required fields
    if (!customer_details || !payment_reference) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details and payment_reference are required'
      });
    }

    if (!customer_details.name || !customer_details.email || !customer_details.phone) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details must include name, email, and phone'
      });
    }

    const order = await otaService.activateReservation(reservationId, {
      customer_details,
      payment_reference,
      special_requests
    });

    res.status(201).json(order);

  } catch (error: any) {
    logger.error('OTA reservation activation failed', {
      partner: req.ota_partner?.name,
      reservation_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'RESERVATION_NOT_FOUND' ? 404 :
                      error.code === 'VALIDATION_ERROR' ? 409 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to activate reservation'
    });
  }
});

// POST /api/ota/reservations/cleanup - Manually trigger expired reservation cleanup
router.post('/reservations/cleanup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const expiredCount = await otaService.expireOldReservations();

    res.json({
      message: 'Cleanup completed',
      expired_reservations: expiredCount
    });

  } catch (error: any) {
    logger.error('OTA reservation cleanup failed', {
      partner: req.ota_partner?.name,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to cleanup reservations'
    });
  }
});

// DELETE /api/ota/reservations/:id - Cancel reservation
router.delete('/reservations/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reservationId = req.params.id;
    await otaService.cancelReservation(reservationId);

    res.status(204).send();

  } catch (error: any) {
    logger.error('OTA reservation cancellation failed', {
      partner: req.ota_partner?.name,
      reservation_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'RESERVATION_NOT_FOUND' ? 404 :
                      error.code === 'CANNOT_CANCEL_ACTIVATED' ? 409 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to cancel reservation'
    });
  }
});

// GET /api/ota/orders - List confirmed orders for OTA
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await otaService.getOrders();

    res.json({
      orders,
      total_count: orders.length
    });

  } catch (error: any) {
    logger.error('OTA orders list failed', {
      partner: req.ota_partner?.name,
      order_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve orders'
    });
  }
});

// GET /api/ota/orders/:id/tickets - Get QR codes and ticket details
router.get('/orders/:id/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const tickets = await otaService.getOrderTickets(orderId);

    res.json({
      tickets
    });

  } catch (error: any) {
    logger.error('OTA order tickets lookup failed', {
      partner: req.ota_partner?.name,
      order_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve order tickets'
    });
  }
});

// GET /api/ota/tickets - List tickets with optional filters
router.get('/tickets', otaAuthMiddleware('inventory:read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, batch_id, created_after, created_before, page, limit } = req.query;

    // Parse and validate query parameters
    const filters: any = {};

    if (status) {
      filters.status = status as string;
    }

    if (batch_id) {
      filters.batch_id = batch_id as string;
    }

    if (created_after) {
      filters.created_after = created_after as string;
    }

    if (created_before) {
      filters.created_before = created_before as string;
    }

    if (page) {
      const pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'page must be a positive integer'
        });
      }
      filters.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(422).json({
          error: 'INVALID_PARAMETER',
          message: 'limit must be a positive integer'
        });
      }
      filters.limit = limitNum;
    }

    const result = await otaService.getTickets(req.ota_partner!.id, filters);

    res.json(result);

  } catch (error: any) {
    logger.error('OTA tickets list failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      query: req.query
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve tickets'
    });
  }
});

// POST /api/ota/tickets/bulk-generate - Generate pre-made tickets for OTA
router.post('/tickets/bulk-generate', otaAuthMiddleware('tickets:bulk-generate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      product_id,
      quantity,
      batch_id,
      distribution_mode,
      reseller_metadata,
      batch_metadata,
      special_pricing
    } = req.body;

    // Validate required fields
    if (typeof product_id !== 'number' || typeof quantity !== 'number' || !batch_id) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'product_id (number), quantity (number), and batch_id are required'
      });
    }

    // Validate reseller metadata if reseller_batch mode
    if (distribution_mode === 'reseller_batch' && !reseller_metadata?.intended_reseller) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'reseller_metadata.intended_reseller is required for reseller_batch mode'
      });
    }

    const result = await otaService.bulkGenerateTickets(req.ota_partner!.id, {
      product_id,
      quantity,
      batch_id,
      distribution_mode: distribution_mode || 'direct_sale',
      reseller_metadata,
      batch_metadata,
      special_pricing
    });

    res.status(201).json(result);

  } catch (error: any) {
    logger.error('OTA bulk ticket generation failed', {
      partner: req.ota_partner?.name,
      error: error.message,
      request_body: req.body
    });

    const statusCode = error.code === 'PRODUCT_NOT_FOUND' ? 404 :
                      error.code === 'SOLD_OUT' ? 409 :
                      error.code === 'VALIDATION_ERROR' ? 422 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to generate tickets'
    });
  }
});

// POST /api/ota/tickets/:code/activate - Activate pre-made ticket with customer details
router.post('/tickets/:code/activate', otaAuthMiddleware('tickets:activate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketCode = req.params.code;
    const { customer_details, payment_reference } = req.body;

    // Validate required fields
    if (!customer_details || !payment_reference) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details and payment_reference are required'
      });
    }

    if (!customer_details.name || !customer_details.email || !customer_details.phone) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'customer_details must include name, email, and phone'
      });
    }

    const result = await otaService.activatePreMadeTicket(ticketCode, req.ota_partner!.id, {
      customer_details,
      payment_reference
    });

    res.status(200).json(result);

  } catch (error: any) {
    logger.error('OTA ticket activation failed', {
      partner: req.ota_partner?.name,
      ticket_code: req.params.code,
      error: error.message
    });

    const statusCode = error.code === 'TICKET_NOT_FOUND' ? 404 :
                      error.code === 'TICKET_ALREADY_ACTIVATED' ? 409 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to activate ticket'
    });
  }
});

// GET /api/ota/batches/:id/analytics - Real-time batch performance analytics
router.get('/batches/:id/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.params.id;
    const analytics = await otaService.getBatchAnalytics(batchId);

    if (!analytics) {
      return res.status(404).json({
        error: 'BATCH_NOT_FOUND',
        message: 'Batch not found'
      });
    }

    res.json(analytics);

  } catch (error: any) {
    logger.error('OTA batch analytics failed', {
      partner: req.ota_partner?.name,
      batch_id: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve batch analytics'
    });
  }
});

// GET /api/ota/billing/summary - Billing summary for reseller
router.get('/billing/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, reseller } = req.query;

    if (!period || typeof period !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'period parameter is required (YYYY-MM format)'
      });
    }

    const summary = await otaService.getResellerBillingSummary(
      reseller as string || 'all',
      period
    );

    res.json(summary);

  } catch (error: any) {
    logger.error('OTA billing summary failed', {
      partner: req.ota_partner?.name,
      query: req.query,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve billing summary'
    });
  }
});

// GET /api/ota/batches/:id/redemptions - Get redemption events for specific batch
router.get('/batches/:id/redemptions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.params.id;
    const redemptions = await otaService.getBatchRedemptions(batchId);

    res.json({
      batch_id: batchId,
      total_redemptions: redemptions.length,
      redemption_events: redemptions
    });

  } catch (error: any) {
    logger.error('OTA batch redemptions failed', {
      partner: req.ota_partner?.name,
      batch_id: req.params.id,
      error: error.message
    });

    const statusCode = error.code === 'BATCH_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Failed to retrieve batch redemptions'
    });
  }
});

// GET /api/ota/campaigns/analytics - Campaign performance analytics
router.get('/campaigns/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaign_type, date_range } = req.query;

    const analytics = await otaService.getCampaignAnalytics(
      campaign_type as string,
      date_range as string
    );

    res.json(analytics);

  } catch (error: any) {
    logger.error('OTA campaign analytics failed', {
      partner: req.ota_partner?.name,
      query: req.query,
      error: error.message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve campaign analytics'
    });
  }
});

export default router;