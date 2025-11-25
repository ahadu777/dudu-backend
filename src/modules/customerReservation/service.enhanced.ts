import {
  TicketValidationRequest,
  TicketValidationResponse,
  VerifyContactRequest,
  VerifyContactResponse,
  CreateReservationRequest,
  CreateReservationResponse,
  TicketReservation,
  TicketStatus,
  ModifyReservationRequest,
  ModifyReservationResponse,
  CancelReservationRequest,
  CancelReservationResponse
} from './types';
import { ReservationSlotServiceMock } from '../reservation-slots/service.mock';
import { logger } from '../../utils/logger';

interface MockTicket {
  ticket_code: string;
  product_id: number;
  product_name: string;
  status: TicketStatus;
  activation_status?: 'inactive' | 'active' | 'redeemed' | 'cancelled'; // Phase 2
  activated_at?: string | null;
  activation_mode?: 'immediate' | 'deferred';
  expires_at: string | null;
  orq: number;
  customer_email?: string;
  customer_phone?: string;
}

export class CustomerReservationServiceEnhanced {
  private tickets: Map<string, MockTicket> = new Map();
  private reservations: Map<string, TicketReservation> = new Map();
  private slotsService: ReservationSlotServiceMock;

  constructor() {
    this.slotsService = new ReservationSlotServiceMock();
    this.seedMockTickets();
  }

  /**
   * Seed mock tickets with activation status
   */
  private seedMockTickets() {
    const mockTickets: MockTicket[] = [
      // Active tickets (can reserve)
      {
        ticket_code: 'TKT-ACTIVE-001',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'ACTIVATED',
        activation_status: 'active',
        activated_at: '2025-11-20T10:00:00Z',
        activation_mode: 'immediate',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
      },
      {
        ticket_code: 'TKT-ACTIVE-002',
        product_id: 102,
        product_name: 'Shanghai Museum Ticket',
        status: 'ACTIVATED',
        activation_status: 'active',
        activated_at: '2025-11-21T14:30:00Z',
        activation_mode: 'deferred',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
      },
      // Inactive ticket (cannot reserve - MUST activate first)
      {
        ticket_code: 'TKT-INACTIVE-001',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'PENDING_PAYMENT',
        activation_status: 'inactive',
        activated_at: null,
        activation_mode: 'deferred',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
      },
      // Already reserved ticket
      {
        ticket_code: 'TKT-RESERVED-001',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'RESERVED',
        activation_status: 'active',
        activated_at: '2025-11-18T09:00:00Z',
        activation_mode: 'immediate',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
        customer_email: 'john@example.com',
        customer_phone: '+12025551234',
      },
      // Verified ticket
      {
        ticket_code: 'TKT-VERIFIED-001',
        product_id: 101,
        product_name: 'Beijing Zoo Adult Ticket',
        status: 'VERIFIED',
        activation_status: 'redeemed',
        activated_at: '2025-11-10T10:00:00Z',
        activation_mode: 'immediate',
        expires_at: '2025-12-31T23:59:59Z',
        orq: 1,
        customer_email: 'jane@example.com',
        customer_phone: '+10987654321',
      },
    ];

    mockTickets.forEach(ticket => {
      this.tickets.set(ticket.ticket_code, ticket);
    });

    logger.info('customer_reservation_enhanced.tickets.seeded', { count: this.tickets.size });
  }

  /**
   * Validate ticket for reservation eligibility
   * NEW: Checks activation_status = 'active'
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code, orq } = request;

    const ticket = this.tickets.get(ticket_code);

    // Check if ticket exists
    if (!ticket) {
      return {
        valid: false,
        error: 'TICKET_NOT_FOUND',
      };
    }

    // Check organization match
    if (ticket.orq !== orq) {
      return {
        valid: false,
        error: 'TICKET_WRONG_ORG',
      };
    }

    // NEW: Check activation status (Phase 2 requirement)
    if (ticket.activation_status === 'inactive') {
      return {
        valid: false,
        error: 'TICKET_NOT_ACTIVATED', // User decision: Reject with error
      };
    }

    // Check if ticket is already reserved
    if (ticket.status === 'RESERVED') {
      const reservation = Array.from(this.reservations.values()).find(
        r => r.ticket_code === ticket_code && r.status === 'RESERVED'
      );

      if (reservation) {
        return {
          valid: false,
          error: 'TICKET_ALREADY_RESERVED',
          ticket: {
            ticket_code: ticket.ticket_code,
            product_id: ticket.product_id,
            product_name: ticket.product_name,
            status: ticket.status,
            expires_at: ticket.expires_at,
          }
        };
      }
    }

    // Check if ticket is already verified
    if (ticket.status === 'VERIFIED') {
      return {
        valid: false,
        error: 'TICKET_ALREADY_VERIFIED',
      };
    }

    // Check expiration
    if (ticket.expires_at) {
      const expiryDate = new Date(ticket.expires_at);
      if (expiryDate < new Date()) {
        return {
          valid: false,
          error: 'TICKET_EXPIRED',
        };
      }
    }

    logger.info('ticket.validation.success', {
      ticket_code,
      status: ticket.status,
      activation_status: ticket.activation_status
    });

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
   * Verify contact information
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

    // Get customer info from ticket
    const { customer_email, customer_phone } = validation.ticket;

    if (!customer_email || !customer_phone) {
      return {
        success: false,
        error: 'Missing customer contact information in ticket',
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL_FORMAT',
      };
    }

    // Phone validation (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(customer_phone.replace(/[\s\-\(\)]/g, ''))) {
      return {
        success: false,
        error: 'INVALID_PHONE_FORMAT',
      };
    }

    logger.info('contact.verification.success', { ticket_code });

    return {
      success: true,
      message: 'Contact information verified',
    };
  }

  /**
   * Create reservation with slot integration
   * Uses customer_email and customer_phone from ticket data
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_code, slot_id, orq } = request;

    try {
      // 1. Validate ticket (includes activation check)
      const validation = await this.validateTicket({ ticket_code, orq });
      if (!validation.valid || !validation.ticket) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Get customer info from validated ticket
      const { customer_email, customer_phone } = validation.ticket;

      if (!customer_email || !customer_phone) {
        return {
          success: false,
          error: 'Missing customer contact information in ticket',
        };
      }

      // 2. Get slot and check capacity
      const slot = await this.slotsService.getSlotById(slot_id);
      if (!slot) {
        return {
          success: false,
          error: 'SLOT_NOT_FOUND',
        };
      }

      // Check slot status
      if (slot.status === 'CLOSED') {
        return {
          success: false,
          error: 'SLOT_CLOSED',
        };
      }

      // Check capacity
      if (slot.booked_count >= slot.total_capacity) {
        return {
          success: false,
          error: 'SLOT_FULL',
        };
      }

      // 3. Check if date is in the past
      const slotDate = new Date(slot.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (slotDate < today) {
        return {
          success: false,
          error: 'CANNOT_RESERVE_PAST_DATE',
        };
      }

      // 4. Create reservation record
      const reservationId = `RSV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const reservation: TicketReservation = {
        id: reservationId,
        ticket_code,
        slot_id: parseInt(slot_id), // Convert string to number
        visitor_name: customer_email, // Use customer_email from ticket
        visitor_phone: customer_phone, // Use customer_phone from ticket
        status: 'RESERVED',
        reserved_at: new Date().toISOString(),
        verified_at: null,
        orq,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.reservations.set(reservationId, reservation);

      // 5. Increment slot booked count (atomic in real DB)
      await this.slotsService.incrementBookedCount(slot_id);

      // 6. Update ticket status
      const ticket = this.tickets.get(ticket_code);
      if (ticket) {
        ticket.status = 'RESERVED';
        ticket.customer_email = customer_email;
        ticket.customer_phone = customer_phone;
      }

      logger.info('reservation.created', {
        reservation_id: reservationId,
        ticket_code,
        slot_id,
        slot_date: slot.date
      });

      return {
        success: true,
        data: {
          reservation_id: reservationId,
          ticket_code,
          slot_id: parseInt(slot_id),
          slot_date: slot.date,
          slot_time: `${slot.start_time} - ${slot.end_time}`,
          customer_email,
          customer_phone,
          status: 'RESERVED',
          created_at: reservation.created_at
        },
      };
    } catch (error: any) {
      logger.error('reservation.create.error', { error: error.message });

      return {
        success: false,
        error: error.message || 'RESERVATION_FAILED',
      };
    }
  }

  /**
   * Modify existing reservation (change slot)
   */
  async modifyReservation(request: ModifyReservationRequest): Promise<ModifyReservationResponse> {
    const { reservation_id, new_slot_id } = request;

    try {
      // 1. Get existing reservation
      const reservation = this.reservations.get(reservation_id);
      if (!reservation) {
        return {
          success: false,
          error: 'RESERVATION_NOT_FOUND',
        };
      }

      // Check if already verified (cannot modify)
      if (reservation.status === 'VERIFIED') {
        return {
          success: false,
          error: 'CANNOT_MODIFY_VERIFIED_RESERVATION',
        };
      }

      // 2. Get old and new slots
      const oldSlot = await this.slotsService.getSlotById(reservation.slot_id.toString());
      const newSlot = await this.slotsService.getSlotById(new_slot_id);

      if (!newSlot) {
        return {
          success: false,
          error: 'NEW_SLOT_NOT_FOUND',
        };
      }

      // Check new slot capacity
      if (newSlot.booked_count >= newSlot.total_capacity) {
        return {
          success: false,
          error: 'NEW_SLOT_FULL',
        };
      }

      // 3. Update counts (atomic in real DB)
      await this.slotsService.decrementBookedCount(reservation.slot_id.toString());
      await this.slotsService.incrementBookedCount(new_slot_id);

      // 4. Update reservation
      reservation.slot_id = parseInt(new_slot_id);
      reservation.updated_at = new Date().toISOString();
      this.reservations.set(reservation_id, reservation);

      logger.info('reservation.modified', {
        reservation_id,
        old_slot_id: oldSlot?.id,
        new_slot_id
      });

      return {
        success: true,
        data: {
          reservation_id,
          ticket_code: reservation.ticket_code,
          new_slot_id: parseInt(new_slot_id),
          new_slot_date: newSlot.date,
          new_slot_time: `${newSlot.start_time} - ${newSlot.end_time}`,
          updated_at: reservation.updated_at
        },
      };
    } catch (error: any) {
      logger.error('reservation.modify.error', { error: error.message });

      return {
        success: false,
        error: error.message || 'MODIFICATION_FAILED',
      };
    }
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(request: CancelReservationRequest): Promise<CancelReservationResponse> {
    const { reservation_id } = request;

    try {
      // 1. Get reservation
      const reservation = this.reservations.get(reservation_id);
      if (!reservation) {
        return {
          success: false,
          error: 'RESERVATION_NOT_FOUND',
        };
      }

      // Check if already verified (cannot cancel)
      if (reservation.status === 'VERIFIED') {
        return {
          success: false,
          error: 'CANNOT_CANCEL_VERIFIED_RESERVATION',
        };
      }

      // 2. Decrement slot booked count
      await this.slotsService.decrementBookedCount(reservation.slot_id.toString());

      // 3. Update reservation status
      reservation.status = 'CANCELLED';
      reservation.updated_at = new Date().toISOString();
      this.reservations.set(reservation_id, reservation);

      // 4. Update ticket status back to ACTIVATED
      const ticket = this.tickets.get(reservation.ticket_code);
      if (ticket) {
        ticket.status = 'ACTIVATED';
        ticket.customer_email = undefined;
        ticket.customer_phone = undefined;
      }

      logger.info('reservation.cancelled', { reservation_id, ticket_code: reservation.ticket_code });

      return {
        success: true,
        message: 'Reservation cancelled successfully',
        data: {
          reservation_id,
          ticket_status: 'ACTIVATED',
          cancelled_at: reservation.updated_at
        },
      };
    } catch (error: any) {
      logger.error('reservation.cancel.error', { error: error.message });

      return {
        success: false,
        error: error.message || 'CANCELLATION_FAILED',
      };
    }
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string): Promise<TicketReservation | null> {
    return this.reservations.get(reservationId) || null;
  }
}
