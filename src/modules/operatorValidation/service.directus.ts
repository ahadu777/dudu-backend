import {
  OperatorLoginRequest,
  OperatorLoginResponse,
  ValidateTicketRequest,
  ValidateTicketResponse,
  VerifyTicketRequest,
  VerifyTicketResponse
} from './types';
import { directusService } from '../../utils/directus';
import { logger } from '../../utils/logger';
import { randomBytes } from 'crypto';

/**
 * OperatorValidationServiceDirectus
 * Implements operator validation logic using Directus CMS as data source
 */
export class OperatorValidationServiceDirectus {
  /**
   * Operator login with session management
   * TODO: Implement actual authentication against Directus operators collection
   */
  async login(request: OperatorLoginRequest): Promise<OperatorLoginResponse> {
    const { operator_id, password, terminal_id, orq } = request;

    logger.info('directus.operator.login.start', {
      operator_id,
      terminal_id,
      orq
    });

    // TODO: Query Directus operators collection and verify password
    // For now, mock authentication
    if (!operator_id || !password) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8); // 8-hour session

    logger.info('directus.operator.login.success', { operator_id });

    return {
      success: true,
      data: {
        operator_id,
        operator_name: `Operator ${operator_id}`, // TODO: fetch from Directus
        terminal_id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      }
    };
  }

  /**
   * Validate ticket via QR scan
   * Returns color-coded validation result (GREEN/YELLOW/RED)
   */
  async validateTicket(request: ValidateTicketRequest): Promise<ValidateTicketResponse> {
    const { ticket_code, operator_id, terminal_id, orq } = request;

    logger.info('directus.operator.validate_ticket.start', {
      ticket_code,
      operator_id,
      terminal_id,
      orq
    });

    // 1. Get ticket from Directus
    const ticket = await directusService.getTicketByNumber(ticket_code);

    if (!ticket) {
      logger.warn('directus.operator.validate_ticket.not_found', { ticket_code });
      return {
        success: true, // API call succeeded
        validation_result: {
          ticket_code,
          status: 'INVALID',
          color_code: 'RED',
          message: 'Invalid ticket - Deny entry',
          details: {
            visitor_name: 'N/A',
            slot_date: 'N/A',
            slot_time: 'N/A',
            product_name: 'N/A'
          },
          allow_entry: false
        }
      };
    }

    // 2. Check if ticket is activated
    // Directus uses 'status' field with value 'ACTIVATED' (not activation_status)
    if (ticket.status !== 'ACTIVATED') {
      logger.warn('directus.operator.validate_ticket.not_activated', {
        ticket_code,
        status: ticket.status
      });
      return {
        success: true,
        validation_result: {
          ticket_code,
          status: 'INVALID',
          color_code: 'RED',
          message: 'Ticket not activated - Deny entry',
          details: {
            visitor_name: 'N/A',
            slot_date: 'N/A',
            slot_time: 'N/A',
            product_name: ticket.product_name || 'Unknown Product'
          },
          allow_entry: false
        }
      };
    }

    // 3. Check if ticket has a reservation
    const reservation = await directusService.getReservationByTicket(ticket_code);

    if (!reservation) {
      // YELLOW: Activated but no reservation
      logger.warn('directus.operator.validate_ticket.no_reservation', { ticket_code });
      return {
        success: true,
        validation_result: {
          ticket_code,
          status: 'RESERVED', // Status from ticket
          color_code: 'YELLOW',
          message: 'Warning: No reservation found for this ticket',
          details: {
            visitor_name: 'N/A',
            slot_date: 'N/A',
            slot_time: 'N/A',
            product_name: ticket.product_name || 'Unknown Product'
          },
          allow_entry: false // Operator must decide
        }
      };
    }

    // 4. Check if reservation is for today
    const today = new Date().toISOString().split('T')[0];
    const reservationDate = reservation.slot_date || ''; // TODO: fetch from slot

    if (reservationDate !== today) {
      // YELLOW: Reservation not for today
      logger.warn('directus.operator.validate_ticket.wrong_date', {
        ticket_code,
        reservation_date: reservationDate,
        today
      });
      return {
        success: true,
        validation_result: {
          ticket_code,
          status: 'RESERVED',
          color_code: 'YELLOW',
          message: `Warning: Reservation is for ${reservationDate}, not today`,
          details: {
            visitor_name: reservation.customer_email || 'N/A',
            slot_date: reservationDate,
            slot_time: '09:00-12:00', // TODO: fetch from slot
            product_name: ticket.product_name || 'Unknown Product'
          },
          allow_entry: false // Operator must decide
        }
      };
    }

    // 5. GREEN: Valid reservation for today
    logger.info('directus.operator.validate_ticket.valid', { ticket_code });
    return {
      success: true,
      validation_result: {
        ticket_code,
        status: 'RESERVED',
        color_code: 'GREEN',
        message: 'Valid reservation - Allow entry',
        details: {
          visitor_name: reservation.customer_email || 'N/A',
          slot_date: reservationDate,
          slot_time: '09:00-12:00', // TODO: fetch from slot
          product_name: ticket.product_name || 'Unknown Product'
        },
        allow_entry: true
      }
    };
  }

  /**
   * Verify ticket entry (mark as verified)
   */
  async verifyTicket(request: VerifyTicketRequest): Promise<VerifyTicketResponse> {
    const { ticket_code, operator_id, terminal_id, validation_decision, orq } = request;

    logger.info('directus.operator.verify_ticket.start', {
      ticket_code,
      operator_id,
      terminal_id,
      validation_decision,
      orq
    });

    if (validation_decision === 'DENY') {
      logger.info('directus.operator.verify_ticket.denied', { ticket_code, operator_id });
      return {
        success: true,
        data: {
          ticket_code,
          verification_status: 'DENIED',
          verified_at: new Date().toISOString(),
          operator_id,
          terminal_id
        }
      };
    }

    // Update ticket status to VERIFIED
    const ticketUpdated = await directusService.updateTicket(ticket_code, {
      status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: operator_id
    });

    // Update reservation status to VERIFIED
    const reservation = await directusService.getReservationByTicket(ticket_code);
    if (reservation) {
      await directusService.updateReservation(reservation.id, {
        status: 'VERIFIED',
        updated_at: new Date().toISOString()
      });
    }

    if (!ticketUpdated) {
      logger.error('directus.operator.verify_ticket.failed', { ticket_code });
      return {
        success: false,
        error: 'Failed to verify ticket'
      };
    }

    logger.info('directus.operator.verify_ticket.success', {
      ticket_code,
      operator_id
    });

    return {
      success: true,
      data: {
        ticket_code,
        verification_status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        operator_id,
        terminal_id
      }
    };
  }
}
