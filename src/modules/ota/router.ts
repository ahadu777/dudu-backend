import { Router, Request, Response } from 'express';
import { otaAuthMiddleware } from '../../middlewares/otaAuth';
import { otaService } from './service';
import { logger } from '../../utils/logger';

const router = Router();

// Apply OTA authentication to all routes
router.use(otaAuthMiddleware());

interface AuthenticatedRequest extends Request {
  ota_partner?: {
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

// POST /api/ota/tickets/bulk-generate - Generate pre-made tickets for OTA
router.post('/tickets/bulk-generate', otaAuthMiddleware('tickets:bulk-generate'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, quantity, batch_id } = req.body;

    // Validate required fields
    if (typeof product_id !== 'number' || typeof quantity !== 'number' || !batch_id) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'product_id (number), quantity (number), and batch_id are required'
      });
    }

    const result = await otaService.bulkGenerateTickets({
      product_id,
      quantity,
      batch_id
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

    const result = await otaService.activatePreMadeTicket(ticketCode, {
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

export default router;