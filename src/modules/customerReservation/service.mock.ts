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
  CancelReservationResponse,
  TicketReservation,
  TicketStatus,
} from './types';
import { ReservationSlotServiceMock } from '../reservation-slots/service.mock';
import { logger } from '../../utils/logger';

interface MockTicket {
  ticket_code: string;
  product_id: number;
  product_name: string;
  status: TicketStatus;
  expires_at: string | null;
  orq: number;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
}

// Customer info interface for operator validation
export interface CustomerInfo {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export class CustomerReservationServiceMock {
  private static instance: CustomerReservationServiceMock;
  private tickets: Map<string, MockTicket> = new Map();
  private reservations: Map<string, TicketReservation> = new Map();
  private slotsService: ReservationSlotServiceMock;

  constructor() {
    this.slotsService = new ReservationSlotServiceMock();
    this.seedMockTickets();
  }

  /**
   * Get singleton instance (for shared state with operatorValidation)
   */
  static getInstance(): CustomerReservationServiceMock {
    if (!CustomerReservationServiceMock.instance) {
      CustomerReservationServiceMock.instance = new CustomerReservationServiceMock();
    }
    return CustomerReservationServiceMock.instance;
  }

  /**
   * Seed some mock tickets for testing
   */
  private seedMockTickets() {
    const mockTickets: MockTicket[] = [
      {
        ticket_code: 'TKT-001-20251114-001',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'ACTIVATED',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
      },
      {
        ticket_code: 'TKT-001-20251114-002',
        product_id: 102,
        product_name: 'Beijing Zoo Child Ticket',
        status: 'ACTIVATED',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
      },
      {
        ticket_code: 'TKT-001-20251114-003',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'RESERVED',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
        customer_email: 'john.doe@example.com',
        customer_phone: '+1234567890',
      },
      {
        ticket_code: 'TKT-001-20251114-004',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'VERIFIED',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
        customer_email: 'jane.smith@example.com',
        customer_phone: '+0987654321',
      },
      {
        ticket_code: 'TKT-001-20251114-005',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'EXPIRED',
        expires_at: '2025-11-01T23:59:59Z',
        orq: 1,
      },
    ];

    mockTickets.forEach(ticket => {
      this.tickets.set(ticket.ticket_code, ticket);
    });

    logger.info('customer_reservation.tickets.seeded', { count: this.tickets.size });
  }

  /**
   * Validate ticket for reservation eligibility
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code, orq } = request;

    const ticket = this.tickets.get(ticket_code);

    // Check if ticket exists
    if (!ticket) {
      return {
        valid: false,
        error: 'Ticket not found',
      };
    }

    // Check organization match
    if (ticket.orq !== orq) {
      return {
        valid: false,
        error: 'Ticket does not belong to this organization',
      };
    }

    // Check if ticket is in valid status for reservation
    const validStatuses: TicketStatus[] = ['ACTIVATED', 'RESERVED'];
    if (!validStatuses.includes(ticket.status)) {
      return {
        valid: false,
        error: `Ticket status ${ticket.status} cannot make reservations`,
      };
    }

    // Check expiration
    if (ticket.expires_at) {
      const expiryDate = new Date(ticket.expires_at);
      if (expiryDate < new Date()) {
        return {
          valid: false,
          error: 'Ticket has expired',
        };
      }
    }

    logger.info('ticket.validation.success', { ticket_code, status: ticket.status });

    return {
      valid: true,
      ticket: {
        ticket_code: ticket.ticket_code,
        product_id: ticket.product_id,
        product_name: ticket.product_name,
        status: ticket.status,
        expires_at: ticket.expires_at,
      },
    };
  }

  /**
   * Verify contact information (Step 2 in reservation flow)
   * Gets customer info from ticket data
   */
  async verifyContact(request: VerifyContactRequest): Promise<VerifyContactResponse> {
    const { ticket_code, orq } = request;

    // Validate ticket first
    const validation = await this.validateTicket({ ticket_code, orq });
    if (!validation.valid || !validation.ticket) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Get customer info from ticket (optional)
    const { customer_email, customer_phone } = validation.ticket;

    logger.info('contact.verification.success', { ticket_code, customer_email });

    return {
      success: true,
      message: 'Contact information verified',
    };
  }

  /**
   * Create reservation (final step)
   * Uses customer_email and customer_phone from ticket data
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_code, slot_id, orq, customer_name: providedName, customer_email: providedEmail, customer_phone: providedPhone } = request;

    try {
      // 1. Validate ticket
      const validation = await this.validateTicket({ ticket_code, orq });
      if (!validation.valid || !validation.ticket) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Get customer info: use provided values or fallback to ticket values
      const { customer_email: ticketEmail, customer_phone: ticketPhone, orq: ticketOrq } = validation.ticket;
      const customer_email = providedEmail || ticketEmail || '';
      const customer_phone = providedPhone || ticketPhone || '';
      const reservationOrq = ticketOrq || 1; // Default to 1 if not available

      // 2. Get slot details
      const slot = await this.slotsService.getSlotById(slot_id);
      if (!slot) {
        return {
          success: false,
          error: 'Time slot not found',
        };
      }

      // 3. Check slot capacity
      if (slot.booked_count >= slot.total_capacity) {
        return {
          success: false,
          error: 'Selected time slot is full',
        };
      }

      // 4. Check if ticket already has reservation
      const existingReservation = Array.from(this.reservations.values()).find(
        r => r.ticket_code === ticket_code && r.status === 'RESERVED'
      );

      if (existingReservation) {
        return {
          success: false,
          error: 'Ticket already has an active reservation',
        };
      }

      // 5. Create reservation
      const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const reservation: TicketReservation = {
        id: reservationId,
        ticket_code,
        slot_id: slot_id, // Keep as string
        visitor_name: customer_email, // Use customer_email from ticket
        visitor_phone: customer_phone, // Use customer_phone from ticket
        status: 'RESERVED',
        reserved_at: new Date().toISOString(),
        verified_at: null,
        orq: reservationOrq,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.reservations.set(reservationId, reservation);

      // 6. Increment slot booked count
      await this.slotsService.incrementBookedCount(slot_id);

      // 7. Update ticket status to RESERVED
      const ticket = this.tickets.get(ticket_code);
      if (ticket) {
        ticket.status = 'RESERVED';
        ticket.customer_email = customer_email;
        ticket.customer_phone = customer_phone;
      }

      logger.info('reservation.created', {
        reservation_id: reservation.id,
        ticket_code,
        slot_id,
        customer_email,
      });

      return {
        success: true,
        data: {
          reservation_id: reservationId,
          ticket_code,
          slot_id: slot_id, // Keep as string
          slot_date: slot.date,
          slot_time: `${slot.start_time} - ${slot.end_time}`,
          customer_email,
          customer_phone,
          status: reservation.status,
          created_at: reservation.created_at,
        },
      };
    } catch (error) {
      logger.error('reservation.creation.error', { error, ticket_code, slot_id });
      return {
        success: false,
        error: 'Failed to create reservation',
      };
    }
  }

  /**
   * Get reservation by ticket number (helper method)
   */
  async getReservationByTicket(ticketNumber: string): Promise<TicketReservation | null> {
    const reservation = Array.from(this.reservations.values()).find(
      r => r.ticket_code === ticketNumber && r.status === 'RESERVED'
    );
    return reservation || null;
  }

  /**
   * Modify existing reservation (change slot)
   */
  async modifyReservation(request: ModifyReservationRequest): Promise<ModifyReservationResponse> {
    const { reservation_id, new_slot_id } = request;

    logger.info('reservation.modify.start', { reservation_id, new_slot_id });

    // Find reservation
    const reservation = this.reservations.get(reservation_id);
    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    if (reservation.status === 'VERIFIED') {
      return { success: false, error: 'Cannot modify verified reservation' };
    }

    // Get old and new slots
    const oldSlot = await this.slotsService.getSlotById(reservation.slot_id);
    const newSlot = await this.slotsService.getSlotById(new_slot_id);

    if (!newSlot) {
      return { success: false, error: 'New slot not found' };
    }

    if (newSlot.booked_count >= newSlot.total_capacity) {
      return { success: false, error: 'New slot is full' };
    }

    // Update counts
    if (oldSlot) {
      await this.slotsService.decrementBookedCount(reservation.slot_id);
    }
    await this.slotsService.incrementBookedCount(new_slot_id);

    // Update reservation
    reservation.slot_id = new_slot_id;
    reservation.updated_at = new Date().toISOString();

    logger.info('reservation.modify.success', { reservation_id, new_slot_id });

    return {
      success: true,
      data: {
        reservation_id,
        ticket_code: reservation.ticket_code,
        new_slot_id,
        new_slot_date: newSlot.date,
        new_slot_time: `${newSlot.start_time} - ${newSlot.end_time}`,
        updated_at: reservation.updated_at
      }
    };
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(request: CancelReservationRequest): Promise<CancelReservationResponse> {
    const { reservation_id } = request;

    logger.info('reservation.cancel.start', { reservation_id });

    // Find reservation
    const reservation = this.reservations.get(reservation_id);
    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    if (reservation.status === 'VERIFIED') {
      return { success: false, error: 'Cannot cancel verified reservation' };
    }

    // Decrement slot booked count
    await this.slotsService.decrementBookedCount(reservation.slot_id);

    // Update reservation status
    reservation.status = 'CANCELLED';
    reservation.updated_at = new Date().toISOString();

    // Update ticket status back to ACTIVATED
    const ticket = this.tickets.get(reservation.ticket_code);
    if (ticket) {
      ticket.status = 'ACTIVATED';
    }

    logger.info('reservation.cancel.success', { reservation_id });

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

  /**
   * Get customer info by ticket code (for operator validation)
   */
  async getCustomerInfo(ticketCode: string): Promise<CustomerInfo> {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) {
      return {};
    }

    return {
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email,
      customer_phone: ticket.customer_phone,
    };
  }

  /**
   * Get reservation by ticket code (for operator validation)
   */
  async getReservationByTicketCode(ticketCode: string): Promise<TicketReservation | null> {
    const reservation = Array.from(this.reservations.values()).find(
      r => r.ticket_code === ticketCode && r.status !== 'CANCELLED'
    );
    return reservation || null;
  }
}
