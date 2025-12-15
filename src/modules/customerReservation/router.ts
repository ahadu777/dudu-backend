import { Router } from 'express';
import { CustomerReservationService } from './service';
import { CustomerReservationServiceMock } from './service.mock';
import {
  TicketValidationRequest,
  VerifyContactRequest,
  CreateReservationRequest,
  ModifyReservationRequest,
} from './types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const router = Router();

// Initialize service based on environment
const useDatabase = env.USE_DATABASE;
const service = useDatabase
  ? new CustomerReservationService()
  : new CustomerReservationServiceMock();

if (useDatabase) {
  logger.info('customer_reservation.router.using_database');
} else {
  logger.info('customer_reservation.router.using_mock');
}

/**
 * POST /api/tickets/validate
 * Validate ticket eligibility for reservation
 */
router.post('/tickets/validate', async (req, res) => {
  try {
    const { ticket_code, orq } = req.body as TicketValidationRequest;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: ticket_code',
      });
    }

    // orq is optional - customer doesn't need to know organization
    const result = await service.validateTicket({ ticket_code, orq });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: result.error,
      });
    }

    logger.info('tickets.validate.success', { ticket_code });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('tickets.validate.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate ticket',
    });
  }
});

/**
 * POST /api/tickets/verify-contact
 * Verify visitor contact information
 */
router.post('/tickets/verify-contact', async (req, res) => {
  try {
    const { ticket_code, orq } = req.body as VerifyContactRequest;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: ticket_code',
      });
    }

    const result = await service.verifyContact({
      ticket_code,
      orq,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('tickets.verify_contact.success', { ticket_code });
    res.status(200).json(result);
  } catch (error) {
    logger.error('tickets.verify_contact.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify contact information',
    });
  }
});

/**
 * POST /api/reservations/create
 * Create reservation for ticket and time slot
 */
router.post('/reservations/create', async (req, res) => {
  try {
    const { ticket_code, slot_id, orq, customer_name, customer_email, customer_phone } =
      req.body as CreateReservationRequest;

    if (!ticket_code || !slot_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticket_code, slot_id',
      });
    }

    const result = await service.createReservation({
      ticket_code,
      slot_id,
      orq,
      customer_name,
      customer_email,
      customer_phone,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('reservations.create.success', {
      ticket_code,
      slot_id,
      reservation_id: result.data?.reservation_id,
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error('reservations.create.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation',
    });
  }
});

/**
 * PUT /api/reservations/:reservation_id
 * Modify existing reservation (change slot)
 */
router.put('/reservations/:reservation_id', async (req, res) => {
  try {
    const { reservation_id } = req.params;
    const { new_slot_id } = req.body as ModifyReservationRequest;

    if (!new_slot_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: new_slot_id',
      });
    }

    const result = await service.modifyReservation({
      reservation_id,
      new_slot_id,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('reservations.modify.success', {
      reservation_id,
      new_slot_id,
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error('reservations.modify.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to modify reservation',
    });
  }
});

/**
 * DELETE /api/reservations/:reservation_id
 * Cancel reservation
 */
router.delete('/reservations/:reservation_id', async (req, res) => {
  try {
    const { reservation_id } = req.params;

    const result = await service.cancelReservation({
      reservation_id,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('reservations.cancel.success', {
      reservation_id,
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error('reservations.cancel.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel reservation',
    });
  }
});

export default router;
