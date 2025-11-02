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

export default router;