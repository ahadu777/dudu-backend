import { Request, Response } from 'express';
import { CustomerReservationServiceEnhanced } from './service.enhanced';
import { CustomerReservationServiceDirectus } from './service.directus';
import {
  TicketValidationRequest,
  VerifyContactRequest,
  CreateReservationRequest,
  ModifyReservationRequest,
  CancelReservationRequest,
} from './types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export class CustomerReservationController {
  private service: CustomerReservationServiceEnhanced | CustomerReservationServiceDirectus;

  constructor() {
    // Use Directus service if USE_DIRECTUS env variable is set to true
    const useDirectus = env.USE_DIRECTUS;

    if (useDirectus) {
      logger.info('customer_reservation.controller.using_directus');
      this.service = new CustomerReservationServiceDirectus();
    } else {
      logger.info('customer_reservation.controller.using_mock');
      this.service = new CustomerReservationServiceEnhanced();
    }
  }

  /**
   * POST /api/tickets/validate
   * Validate ticket eligibility for reservation
   */
  async validateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_code, orq } = req.body as TicketValidationRequest;

      if (!ticket_code || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_code, orq',
        });
        return;
      }

      const result = await this.service.validateTicket({ ticket_code, orq });

      if (!result.valid) {
        res.status(400).json({
          success: false,
          valid: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        ...result,
      });

      logger.info('tickets.validate.success', { ticket_code });
    } catch (error) {
      logger.error('tickets.validate.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to validate ticket',
      });
    }
  }

  /**
   * POST /api/tickets/verify-contact
   * Verify visitor contact information
   */
  async verifyContact(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_code, orq } = req.body as VerifyContactRequest;

      if (!ticket_code || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_code, orq',
        });
        return;
      }

      const result = await this.service.verifyContact({
        ticket_code,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('tickets.verify_contact.success', { ticket_code });
    } catch (error) {
      logger.error('tickets.verify_contact.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify contact information',
      });
    }
  }

  /**
   * POST /api/reservations/create
   * Create reservation for ticket and time slot
   */
  async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_code, slot_id, orq } =
        req.body as CreateReservationRequest;

      if (!ticket_code || !slot_id || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_code, slot_id, orq',
        });
        return;
      }

      const result = await this.service.createReservation({
        ticket_code,
        slot_id,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);

      logger.info('reservations.create.success', {
        ticket_code,
        slot_id,
        reservation_id: result.data?.reservation_id,
      });
    } catch (error) {
      logger.error('reservations.create.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create reservation',
      });
    }
  }

  /**
   * PUT /api/reservations/:reservation_id
   * Modify existing reservation (change slot)
   */
  async modifyReservation(req: Request, res: Response): Promise<void> {
    try {
      const { reservation_id } = req.params;
      const { new_slot_id } = req.body as ModifyReservationRequest;

      if (!new_slot_id) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: new_slot_id',
        });
        return;
      }

      const result = await this.service.modifyReservation({
        reservation_id,
        new_slot_id,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('reservations.modify.success', {
        reservation_id,
        new_slot_id,
      });
    } catch (error) {
      logger.error('reservations.modify.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to modify reservation',
      });
    }
  }

  /**
   * DELETE /api/reservations/:reservation_id
   * Cancel reservation
   */
  async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const { reservation_id } = req.params;

      const result = await this.service.cancelReservation({
        reservation_id,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('reservations.cancel.success', {
        reservation_id,
      });
    } catch (error) {
      logger.error('reservations.cancel.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to cancel reservation',
      });
    }
  }
}
