import {
  TicketValidationRequest,
  TicketValidationResponse,
  VerifyContactRequest,
  VerifyContactResponse,
  CreateReservationRequest,
  CreateReservationResponse,
  ModifyReservationRequest,
  ModifyReservationResponse,
  CancelReservationRequest,
  CancelReservationResponse
} from './types';
import { directusService } from '../../utils/directus';
import { logger } from '../../utils/logger';

/**
 * CustomerReservationServiceDirectus
 * Implements reservation logic using Directus CMS as data source
 */
export class CustomerReservationServiceDirectus {
  /**
   * Validate ticket eligibility for reservation
   * Checks if ticket is activated and not already reserved
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code, orq } = request;

    logger.info('directus.customer.validate_ticket.start', { ticket_code, orq });

    // 1. Check if ticket exists in Directus
    const ticket = await directusService.getTicketByNumber(ticket_code);

    if (!ticket) {
      logger.warn('directus.customer.validate_ticket.not_found', { ticket_code });
      return {
        valid: false,
        error: 'Ticket not found'
      };
    }

    // 2. Check if ticket is activated (Phase 2 requirement)
    // Directus uses 'status' field with value 'ACTIVATED' (not activation_status)
    if (ticket.status !== 'ACTIVATED') {
      logger.warn('directus.customer.validate_ticket.not_activated', {
        ticket_code,
        status: ticket.status
      });
      return {
        valid: false,
        error: 'Ticket must be activated before making a reservation'
      };
    }

    // 3. Check if ticket already has a reservation
    const existingReservation = await directusService.getReservationByTicket(ticket_code);

    if (existingReservation && existingReservation.status !== 'CANCELLED') {
      logger.warn('directus.customer.validate_ticket.already_reserved', {
        ticket_code,
        reservation_id: existingReservation.id
      });
      return {
        valid: false,
        error: 'Ticket already has an active reservation'
      };
    }

    // 4. Check if ticket is expired
    if (ticket.expires_at) {
      const expiryDate = new Date(ticket.expires_at);
      if (expiryDate < new Date()) {
        logger.warn('directus.customer.validate_ticket.expired', {
          ticket_code,
          expires_at: ticket.expires_at
        });
        return {
          valid: false,
          error: 'Ticket has expired'
        };
      }
    }

    // Ticket is valid for reservation
    logger.info('directus.customer.validate_ticket.success', { ticket_code });

    return {
      valid: true,
      ticket: {
        ticket_code: ticket.ticket_code || ticket_code,
        product_id: ticket.product_id,
        product_name: ticket.product_name || 'Unknown Product',
        status: ticket.status,
        expires_at: ticket.expires_at,
        reserved_at: ticket.reserved_at,
        customer_email: ticket.customer_email,
        customer_phone: ticket.customer_phone,
        order_id: ticket.order_id
      }
    };
  }

  /**
   * Verify contact information (simple validation)
   * Gets customer info from ticket data
   */
  async verifyContact(request: VerifyContactRequest): Promise<VerifyContactResponse> {
    const { ticket_code, orq } = request;

    logger.info('directus.customer.verify_contact', { ticket_code });

    // Get ticket data to verify contact information
    const ticket = await directusService.getTicketByNumber(ticket_code);

    if (!ticket) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    // Verify customer email exists
    if (!ticket.customer_email || ticket.customer_email.trim().length < 3) {
      return {
        success: false,
        error: 'Invalid customer email in ticket'
      };
    }

    // Verify customer phone exists
    if (!ticket.customer_phone || ticket.customer_phone.trim().length < 10) {
      return {
        success: false,
        error: 'Invalid customer phone in ticket'
      };
    }

    return {
      success: true,
      message: 'Contact information verified'
    };
  }

  /**
   * Create reservation for ticket and time slot
   * Uses customer_email and customer_phone from ticket data
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_code, slot_id, orq, customer_email: providedEmail, customer_phone: providedPhone } = request;

    logger.info('directus.customer.create_reservation.start', {
      ticket_code,
      slot_id,
      orq,
      has_provided_email: !!providedEmail,
      has_provided_phone: !!providedPhone
    });

    let customer_email: string;
    let customer_phone: string;

    // If customer info is provided in request, use it directly
    if (providedEmail && providedPhone) {
      customer_email = providedEmail;
      customer_phone = providedPhone;
      logger.info('directus.customer.create_reservation.using_provided_contact', {
        ticket_code
      });
    } else {
      // Otherwise, validate ticket and get customer info from ticket
      const validation = await this.validateTicket({ ticket_code, orq });
      if (!validation.valid || !validation.ticket) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Get customer info from validated ticket
      customer_email = validation.ticket.customer_email || '';
      customer_phone = validation.ticket.customer_phone || '';

      if (!customer_email || !customer_phone) {
        return {
          success: false,
          error: 'Missing customer contact information in ticket'
        };
      }
    }

    // 3. Create reservation in Directus
    const result = await directusService.createReservation({
      ticket_id: ticket_code,
      slot_id: slot_id.toString(),
      customer_email,
      customer_phone,
      orq
    });

    if (!result.success) {
      logger.error('directus.customer.create_reservation.failed', {
        ticket_code,
        slot_id,
        error: result.error
      });
      return {
        success: false,
        error: result.error || 'Failed to create reservation'
      };
    }

    // 4. Update ticket status to RESERVED and customer contact info
    await directusService.updateTicket(ticket_code, {
      status: 'RESERVED',
      reserved_at: new Date().toISOString(),
      customer_email,
      customer_phone
    });

    logger.info('directus.customer.create_reservation.success', {
      ticket_code,
      reservation_id: result.reservation.id
    });

    return {
      success: true,
      data: {
        reservation_id: result.reservation.id,
        ticket_code,
        slot_id: parseInt(slot_id),
        slot_date: '2025-12-01', // TODO: fetch from slot data
        slot_time: '09:00-12:00', // TODO: fetch from slot data
        customer_email,
        customer_phone,
        status: 'RESERVED',
        created_at: result.reservation.reserved_at || new Date().toISOString()
      }
    };
  }

  /**
   * Modify existing reservation (change slot)
   */
  async modifyReservation(request: ModifyReservationRequest): Promise<ModifyReservationResponse> {
    const { reservation_id, new_slot_id } = request;

    logger.info('directus.customer.modify_reservation.start', {
      reservation_id,
      new_slot_id
    });

    // Update reservation with new slot
    const success = await directusService.updateReservation(reservation_id, {
      slot_id: new_slot_id,
      updated_at: new Date().toISOString()
    });

    if (!success) {
      return {
        success: false,
        error: 'Failed to modify reservation'
      };
    }

    return {
      success: true,
      data: {
        reservation_id,
        ticket_code: 'TKT-XXX', // TODO: fetch from reservation
        new_slot_id: parseInt(new_slot_id),
        new_slot_date: '2025-12-02', // TODO: fetch from slot data
        new_slot_time: '14:00-17:00', // TODO: fetch from slot data
        updated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(request: CancelReservationRequest): Promise<CancelReservationResponse> {
    const { reservation_id } = request;

    logger.info('directus.customer.cancel_reservation.start', { reservation_id });

    // Update reservation status to CANCELLED
    const success = await directusService.updateReservation(reservation_id, {
      status: 'CANCELLED',
      updated_at: new Date().toISOString()
    });

    if (!success) {
      return {
        success: false,
        error: 'Failed to cancel reservation'
      };
    }

    // TODO: Also update ticket status back to ACTIVATED

    return {
      success: true,
      message: 'Reservation cancelled successfully',
      data: {
        reservation_id,
        ticket_status: 'ACTIVATED',
        cancelled_at: new Date().toISOString()
      }
    };
  }
}
