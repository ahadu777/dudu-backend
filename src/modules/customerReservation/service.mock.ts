import {
  TicketValidationRequest,
  TicketValidationResponse,
  VerifyContactRequest,
  VerifyContactResponse,
  CreateReservationRequest,
  CreateReservationResponse,
  TicketReservation,
  TicketStatus,
} from './types';
import { ReservationSlotsServiceMock } from '../reservationSlots/service.mock';
import { logger } from '../../utils/logger';

interface MockTicket {
  ticket_code: string;
  product_id: number;
  product_name: string;
  status: TicketStatus;
  expires_at: string | null;
  orq: number;
  visitor_name?: string;
  visitor_phone?: string;
}

export class CustomerReservationServiceMock {
  private tickets: Map<string, MockTicket> = new Map();
  private reservations: Map<string, TicketReservation> = new Map();
  private slotsService: ReservationSlotsServiceMock;

  constructor() {
    this.slotsService = new ReservationSlotsServiceMock();
    this.seedMockTickets();
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
        visitor_name: 'John Doe',
        visitor_phone: '+1234567890',
      },
      {
        ticket_code: 'TKT-001-20251114-004',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'VERIFIED',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
        visitor_name: 'Jane Smith',
        visitor_phone: '+0987654321',
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
   */
  async verifyContact(request: VerifyContactRequest): Promise<VerifyContactResponse> {
    const { ticket_code, visitor_name, visitor_phone, orq } = request;

    // Validate ticket first
    const validation = await this.validateTicket({ ticket_code, orq });
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Basic validation of contact info
    if (!visitor_name || visitor_name.trim().length < 2) {
      return {
        success: false,
        error: 'Valid visitor name is required',
      };
    }

    if (!visitor_phone || !/^[\d\s\+\-\(\)]+$/.test(visitor_phone)) {
      return {
        success: false,
        error: 'Valid phone number is required',
      };
    }

    // Store contact info temporarily (in real implementation, this would be a transaction)
    const ticket = this.tickets.get(ticket_code);
    if (ticket) {
      ticket.visitor_name = visitor_name;
      ticket.visitor_phone = visitor_phone;
    }

    logger.info('contact.verification.success', { ticket_code, visitor_name });

    return {
      success: true,
      message: 'Contact information verified',
    };
  }

  /**
   * Create reservation (final step)
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_code, slot_id, visitor_name, visitor_phone, orq } = request;

    try {
      // 1. Validate ticket
      const validation = await this.validateTicket({ ticket_code, orq });
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // 2. Get slot details
      const slot = await this.slotsService.getSlotById(parseInt(slot_id));
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
        slot_id: parseInt(slot_id),
        visitor_name,
        visitor_phone,
        status: 'RESERVED',
        reserved_at: new Date().toISOString(),
        verified_at: null,
        orq,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.reservations.set(reservationId, reservation);

      // 6. Increment slot booked count
      await this.slotsService.incrementBookedCount(parseInt(slot_id));

      // 7. Update ticket status to RESERVED
      const ticket = this.tickets.get(ticket_code);
      if (ticket) {
        ticket.status = 'RESERVED';
        ticket.visitor_name = visitor_name;
        ticket.visitor_phone = visitor_phone;
      }

      logger.info('reservation.created', {
        reservation_id: reservation.id,
        ticket_code,
        slot_id,
        visitor_name,
      });

      return {
        success: true,
        data: {
          reservation_id: reservationId,
          ticket_code,
          slot_id: parseInt(slot_id),
          slot_date: slot.date,
          slot_time: `${slot.start_time} - ${slot.end_time}`,
          visitor_name,
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
}
