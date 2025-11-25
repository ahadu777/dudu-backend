import { Request, Response } from 'express';
import { TicketReservationService } from './service';
import {
  TicketValidationRequest,
  AvailableSlotsRequest,
  CreateReservationRequest,
  OperatorValidateTicketRequest,
  OperatorVerifyTicketRequest,
} from '../../types/domain';

export class TicketReservationController {
  constructor(private service: TicketReservationService) {}

  // ========================================
  // Customer Reservation Endpoints
  // ========================================

  /**
   * POST /api/tickets/validate
   * Validate ticket code before reservation
   */
  async validateTicket(req: Request, res: Response): Promise<void> {
    try {
      const request: TicketValidationRequest = req.body;

      if (!request.ticket_code) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ticket_code is required',
          },
        });
        return;
      }

      const response = await this.service.validateTicket(request);

      if (response.success) {
        res.status(200).json(response);
      } else {
        const statusCode = response.error?.code === 'TICKET_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json(response);
      }
    } catch (error) {
      console.error('Error validating ticket:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while validating the ticket',
        },
      });
    }
  }

  /**
   * GET /api/reservation-slots/available
   * Get available reservation slots for calendar display
   */
  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const orq = parseInt(req.query.orq as string, 10);

      if (!orq || isNaN(orq)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'orq (organization ID) is required',
          },
        });
        return;
      }

      const request: AvailableSlotsRequest = { month, orq };
      const response = await this.service.getAvailableSlots(request);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching available slots',
        },
      });
    }
  }

  /**
   * POST /api/reservations/create
   * Create reservation for ticket
   */
  async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateReservationRequest = req.body;

      // Validate required fields
      if (!request.ticket_id || !request.slot_id || !request.customer_email || !request.customer_phone) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ticket_id, slot_id, customer_email, and customer_phone are required',
          },
        });
        return;
      }

      const response = await this.service.createReservation(request);

      if (response.success) {
        res.status(200).json(response);
      } else {
        const statusCode = response.error?.code === 'SLOT_FULL' ? 409 : 400;
        res.status(statusCode).json(response);
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating the reservation',
        },
      });
    }
  }

  // ========================================
  // Operator Validation Endpoints
  // ========================================

  /**
   * POST /api/operator/validate-ticket
   * Validate ticket for venue entry
   */
  async operatorValidateTicket(req: Request, res: Response): Promise<void> {
    try {
      const request: OperatorValidateTicketRequest = req.body;

      if (!request.ticket_code) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ticket_code is required',
          },
        });
        return;
      }

      const response = await this.service.operatorValidateTicket(request);

      if (response.success) {
        res.status(200).json(response);
      } else {
        const statusCode = response.error?.code === 'TICKET_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json(response);
      }
    } catch (error) {
      console.error('Error validating ticket for operator:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while validating the ticket',
        },
      });
    }
  }

  /**
   * POST /api/operator/verify-ticket
   * Mark ticket as verified (allow entry)
   */
  async operatorVerifyTicket(req: Request, res: Response): Promise<void> {
    try {
      const request: OperatorVerifyTicketRequest = req.body;

      if (!request.ticket_id || !request.operator_id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'ticket_id and operator_id are required',
          },
        });
        return;
      }

      const response = await this.service.operatorVerifyTicket(request);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error verifying ticket:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while verifying the ticket',
        },
      });
    }
  }
}
