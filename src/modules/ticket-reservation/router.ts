import { Router } from 'express';
import { TicketReservationService } from './service';
import {
  TicketValidationRequest,
  AvailableSlotsRequest,
  CreateReservationRequest,
} from '../../types/domain';
import { logger } from '../../utils/logger';

const router = Router();
const service = new TicketReservationService();

// ========================================
// Customer Reservation Routes
// ========================================

/**
 * POST /api/tickets/validate
 * Validate ticket code before reservation
 */
router.post('/api/tickets/validate', async (req, res) => {
  try {
    const request: TicketValidationRequest = req.body;

    if (!request.ticket_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'ticket_code is required',
        },
      });
    }

    const response = await service.validateTicket(request);

    if (response.success) {
      res.status(200).json(response);
    } else {
      const statusCode = response.error?.code === 'TICKET_NOT_FOUND' ? 404 : 400;
      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error('ticket.validation.error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while validating the ticket',
      },
    });
  }
});

/**
 * GET /api/reservation-slots/available
 * Get available reservation slots for calendar display
 */
router.get('/api/reservation-slots/available', async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const orq = parseInt(req.query.orq as string, 10);

    if (!orq || isNaN(orq)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'orq (organization ID) is required',
        },
      });
    }

    const request: AvailableSlotsRequest = { month, orq };
    const response = await service.getAvailableSlots(request);

    res.status(200).json(response);
  } catch (error) {
    logger.error('slots.fetch.error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching available slots',
      },
    });
  }
});

/**
 * POST /api/reservations/create
 * Create reservation for ticket
 */
router.post('/api/reservations/create', async (req, res) => {
  try {
    const request: CreateReservationRequest = req.body;

    // Validate required fields
    if (!request.ticket_id || !request.slot_id || !request.customer_email || !request.customer_phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'ticket_id, slot_id, customer_email, and customer_phone are required',
        },
      });
    }

    const response = await service.createReservation(request);

    if (response.success) {
      res.status(200).json(response);
    } else {
      const statusCode = response.error?.code === 'SLOT_FULL' ? 409 : 400;
      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error('reservation.create.error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the reservation',
      },
    });
  }
});

// ========================================
// Operator Validation Routes (DISABLED - Using operatorValidation module with Week 2 integration)
// ========================================

/**
 * POST /api/operator/validate-ticket
 * Validate ticket for venue entry
 * NOTE: These routes are now handled by the operatorValidation module
 * which integrates with Week 2 customerReservation and reservation-slots services
 */
// router.post('/api/operator/validate-ticket', ...);

/**
 * POST /api/operator/verify-ticket
 * Mark ticket as verified (allow entry)
 */
// router.post('/api/operator/verify-ticket', ...);

export default router;
