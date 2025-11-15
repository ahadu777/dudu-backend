import { Request, Response } from 'express';
import { CustomerReservationServiceMock } from './service.mock';
import {
  TicketValidationRequest,
  VerifyContactRequest,
  CreateReservationRequest,
} from './types';
import { logger } from '../../utils/logger';

export class CustomerReservationController {
  private service: CustomerReservationServiceMock;

  constructor() {
    this.service = new CustomerReservationServiceMock();
  }

  /**
   * POST /api/tickets/validate
   * Validate ticket eligibility for reservation
   */
  async validateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_number, orq } = req.body as TicketValidationRequest;

      if (!ticket_number || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_number, orq',
        });
        return;
      }

      const result = await this.service.validateTicket({ ticket_number, orq });

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

      logger.info('tickets.validate.success', { ticket_number });
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
      const { ticket_number, visitor_name, visitor_phone, orq } = req.body as VerifyContactRequest;

      if (!ticket_number || !visitor_name || !visitor_phone || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_number, visitor_name, visitor_phone, orq',
        });
        return;
      }

      const result = await this.service.verifyContact({
        ticket_number,
        visitor_name,
        visitor_phone,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('tickets.verify_contact.success', { ticket_number, visitor_name });
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
      const { ticket_number, slot_id, visitor_name, visitor_phone, orq } =
        req.body as CreateReservationRequest;

      if (!ticket_number || !slot_id || !visitor_name || !visitor_phone || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_number, slot_id, visitor_name, visitor_phone, orq',
        });
        return;
      }

      const result = await this.service.createReservation({
        ticket_number,
        slot_id,
        visitor_name,
        visitor_phone,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);

      logger.info('reservations.create.success', {
        ticket_number,
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
}
