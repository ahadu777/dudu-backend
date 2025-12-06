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

/**
 * Customer info result from cascading lookup
 */
export interface CustomerInfo {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  source: 'reservation' | 'ticket' | 'order' | null;  // Where the info was found
}

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
  customer_name?: string;  // 客户姓名
  customer_email?: string;
  customer_phone?: string;
  source?: 'direct' | 'ota';
}

// OTA ticket interface (from pre_generated_tickets)
interface MockOtaTicket {
  ticket_code: string;
  product_id: number;
  product_name: string;
  batch_id: string;
  partner_id: string;
  status: 'PRE_GENERATED' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  qr_code: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  order_id?: string;
  orq: number;
  created_at: string;
  activated_at?: string;
}

export class CustomerReservationServiceEnhanced {
  private static instance: CustomerReservationServiceEnhanced;

  private tickets: Map<string, MockTicket> = new Map();
  private otaTickets: Map<string, MockOtaTicket> = new Map(); // NEW: OTA tickets
  private reservations: Map<string, TicketReservation> = new Map();
  private slotsService: ReservationSlotServiceMock;

  constructor() {
    this.slotsService = new ReservationSlotServiceMock();
    this.seedMockTickets();
    this.seedOtaTickets(); // NEW: Seed OTA tickets
  }

  /**
   * Get singleton instance (for mock mode - shared state across modules)
   */
  static getInstance(): CustomerReservationServiceEnhanced {
    if (!CustomerReservationServiceEnhanced.instance) {
      CustomerReservationServiceEnhanced.instance = new CustomerReservationServiceEnhanced();
    }
    return CustomerReservationServiceEnhanced.instance;
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
        customer_name: '张三',
        customer_email: 'zhangsan@example.com',
        customer_phone: '+8613800138001',
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
        customer_name: '李四',
        customer_email: 'lisi@example.com',
        customer_phone: '+8613900139002',
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
        customer_name: 'John Doe',
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
        customer_name: 'Jane Smith',
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
   * Seed OTA tickets for testing
   */
  private seedOtaTickets() {
    const otaTickets: MockOtaTicket[] = [
      // Active OTA ticket (can reserve)
      {
        ticket_code: 'OTA-2025-BATCH001-001',
        product_id: 106,
        product_name: 'Cruise Package - Standard',
        batch_id: 'BATCH-2025-001',
        partner_id: 'PARTNER-KLOOK',
        status: 'ACTIVE',
        qr_code: 'data:image/png;base64,OTA_QR_CODE_001',
        customer_name: 'Alice Wong',
        customer_email: 'alice@example.com',
        customer_phone: '+85291234567',
        order_id: 'OTA-ORD-001',
        orq: 1,
        created_at: '2025-11-20T10:00:00Z',
        activated_at: '2025-11-21T14:00:00Z',
      },
      {
        ticket_code: 'OTA-2025-BATCH001-002',
        product_id: 106,
        product_name: 'Cruise Package - Standard',
        batch_id: 'BATCH-2025-001',
        partner_id: 'PARTNER-KLOOK',
        status: 'ACTIVE',
        qr_code: 'data:image/png;base64,OTA_QR_CODE_002',
        customer_name: 'Bob Chen',
        customer_email: 'bob@example.com',
        customer_phone: '+85298765432',
        order_id: 'OTA-ORD-002',
        orq: 1,
        created_at: '2025-11-20T10:00:00Z',
        activated_at: '2025-11-22T09:00:00Z',
      },
      // PRE_GENERATED (not activated yet)
      {
        ticket_code: 'OTA-2025-BATCH002-001',
        product_id: 107,
        product_name: 'Cruise Package - Premium',
        batch_id: 'BATCH-2025-002',
        partner_id: 'PARTNER-KKDAY',
        status: 'PRE_GENERATED',
        qr_code: 'data:image/png;base64,OTA_QR_CODE_003',
        orq: 1,
        created_at: '2025-11-22T08:00:00Z',
      },
      // USED (already consumed)
      {
        ticket_code: 'OTA-2025-BATCH002-002',
        product_id: 107,
        product_name: 'Cruise Package - Premium',
        batch_id: 'BATCH-2025-002',
        partner_id: 'PARTNER-KKDAY',
        status: 'USED',
        qr_code: 'data:image/png;base64,OTA_QR_CODE_004',
        customer_name: 'Charlie Lee',
        customer_email: 'charlie@example.com',
        order_id: 'OTA-ORD-003',
        orq: 1,
        created_at: '2025-11-18T08:00:00Z',
        activated_at: '2025-11-19T10:00:00Z',
      },
    ];

    otaTickets.forEach(ticket => {
      this.otaTickets.set(ticket.ticket_code, ticket);
    });

    logger.info('customer_reservation_enhanced.ota_tickets.seeded', { count: this.otaTickets.size });
  }

  /**
   * Validate ticket for reservation eligibility
   * NEW: Supports both direct and OTA tickets
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code } = request;

    // Try direct ticket first
    const ticket = this.tickets.get(ticket_code);

    if (ticket) {
      return this.validateDirectTicket(ticket, ticket_code);
    }

    // Try OTA ticket if direct not found
    const otaTicket = this.otaTickets.get(ticket_code);

    if (otaTicket) {
      return this.validateOtaTicket(otaTicket, ticket_code);
    }

    // Neither found
    return {
      valid: false,
      error: 'TICKET_NOT_FOUND',
    };
  }

  /**
   * Validate direct ticket
   */
  private validateDirectTicket(ticket: MockTicket, ticket_code: string): TicketValidationResponse {
    // Note: orq check removed - customer doesn't need to know organization

    // Check activation status (Phase 2 requirement)
    if (ticket.activation_status === 'inactive') {
      return {
        valid: false,
        error: 'TICKET_NOT_ACTIVATED',
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
            source: 'direct',
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
      source: 'direct',
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
        source: 'direct',
        customer_email: ticket.customer_email,
        customer_phone: ticket.customer_phone,
      },
    };
  }

  /**
   * Validate OTA ticket
   */
  private validateOtaTicket(otaTicket: MockOtaTicket, ticket_code: string): TicketValidationResponse {
    // Note: orq check removed - customer doesn't need to know organization

    // Check OTA ticket status
    switch (otaTicket.status) {
      case 'PRE_GENERATED':
        return {
          valid: false,
          error: 'TICKET_NOT_ACTIVATED',
        };

      case 'USED':
        return {
          valid: false,
          error: 'TICKET_ALREADY_VERIFIED', // OTA "USED" = verified
        };

      case 'EXPIRED':
        return {
          valid: false,
          error: 'TICKET_EXPIRED',
        };

      case 'CANCELLED':
        return {
          valid: false,
          error: 'TICKET_CANCELLED',
        };

      case 'ACTIVE':
        // Check if already has reservation
        const existingReservation = Array.from(this.reservations.values()).find(
          r => r.ticket_code === ticket_code && r.status === 'RESERVED'
        );

        if (existingReservation) {
          return {
            valid: false,
            error: 'TICKET_ALREADY_RESERVED',
            ticket: {
              ticket_code: otaTicket.ticket_code,
              product_id: otaTicket.product_id,
              product_name: otaTicket.product_name,
              status: 'ACTIVE',
              expires_at: null,
              source: 'ota',
            }
          };
        }

        // Valid for reservation
        logger.info('ticket.validation.success', {
          ticket_code,
          source: 'ota',
          status: otaTicket.status,
          partner_id: otaTicket.partner_id
        });

        return {
          valid: true,
          ticket: {
            ticket_code: otaTicket.ticket_code,
            product_id: otaTicket.product_id,
            product_name: otaTicket.product_name,
            status: 'ACTIVE',
            expires_at: null,
            source: 'ota',
            customer_email: otaTicket.customer_email,
            customer_phone: otaTicket.customer_phone,
          },
        };

      default:
        return {
          valid: false,
          error: 'INVALID_TICKET_STATUS',
        };
    }
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
    if (!phoneRegex.test(customer_phone.replace(/[\s\-()]/g, ''))) {
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
   * NEW: Supports both direct and OTA tickets
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_code, slot_id, orq, customer_name: providedName, customer_email: providedEmail, customer_phone: providedPhone } = request;

    try {
      // 1. Validate ticket (includes activation check)
      const validation = await this.validateTicket({ ticket_code, orq });
      if (!validation.valid || !validation.ticket) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Get customer info, source, and orq from validated ticket
      // Use provided values if available, otherwise fallback to ticket values
      const { customer_name: ticketName, customer_email: ticketEmail, customer_phone: ticketPhone, source, orq: ticketOrq } = validation.ticket;
      const customer_name = providedName || ticketName;
      const customer_email = providedEmail || ticketEmail;
      const customer_phone = providedPhone || ticketPhone;
      const ticketSource = source || 'direct';
      const reservationOrq = ticketOrq || 1; // Default to 1 if not available

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
        slot_id: slot_id, // Keep as string (UUID)
        visitor_name: customer_email,
        visitor_phone: customer_phone,
        status: 'RESERVED',
        reserved_at: new Date().toISOString(),
        verified_at: null,
        orq: reservationOrq,
        source: ticketSource, // NEW: track source
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.reservations.set(reservationId, reservation);

      // 5. Increment slot booked count (atomic in real DB)
      await this.slotsService.incrementBookedCount(slot_id);

      // 6. Update ticket status - ONLY for direct tickets
      // OTA tickets keep ACTIVE status after reservation
      if (ticketSource === 'direct') {
        const ticket = this.tickets.get(ticket_code);
        if (ticket) {
          ticket.status = 'RESERVED';
          ticket.customer_name = customer_name || undefined;
          ticket.customer_email = customer_email;
          ticket.customer_phone = customer_phone;
        }
      }
      // OTA tickets: status remains ACTIVE (no change needed)

      logger.info('reservation.created', {
        reservation_id: reservationId,
        ticket_code,
        source: ticketSource,
        slot_id,
        slot_date: slot.date
      });

      return {
        success: true,
        data: {
          reservation_id: reservationId,
          ticket_code,
          source: ticketSource, // NEW: include source in response
          slot_id: slot_id, // Keep as string (UUID)
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
      reservation.slot_id = new_slot_id;
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
          new_slot_id: new_slot_id,
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

  /**
   * Get reservation by ticket code
   * Used by operator validation to find reservation for a scanned ticket
   */
  async getReservationByTicketCode(ticketCode: string): Promise<TicketReservation | null> {
    for (const reservation of this.reservations.values()) {
      if (reservation.ticket_code === ticketCode && reservation.status !== 'CANCELLED') {
        return reservation;
      }
    }
    return null;
  }

  /**
   * Get customer info with cascading lookup:
   * 1. First check reservation record (if customer_name is stored)
   * 2. Then check ticket record (direct or OTA)
   * 3. Then check order record (future implementation)
   *
   * @param ticketCode - The ticket code to lookup
   * @returns CustomerInfo with source indicating where the data was found
   */
  async getCustomerInfo(ticketCode: string): Promise<CustomerInfo> {
    const result: CustomerInfo = {
      customer_name: null,
      customer_email: null,
      customer_phone: null,
      source: null,
    };

    // Step 1: Check reservation record
    const reservation = await this.getReservationByTicketCode(ticketCode);
    if (reservation) {
      // Reservation has customer_name field (optional)
      if (reservation.customer_name) {
        result.customer_name = reservation.customer_name;
        result.source = 'reservation';
      }
      // Email and phone from reservation (visitor_name = email, visitor_phone = phone)
      if (reservation.visitor_name) {
        result.customer_email = reservation.visitor_name;
      }
      if (reservation.visitor_phone) {
        result.customer_phone = reservation.visitor_phone;
      }
    }

    // Step 2: Check ticket record if customer_name not found
    if (!result.customer_name) {
      // Try direct ticket
      const directTicket = this.tickets.get(ticketCode);
      if (directTicket) {
        if (directTicket.customer_name) {
          result.customer_name = directTicket.customer_name;
          result.source = 'ticket';
        }
        // Fill email/phone if not from reservation
        if (!result.customer_email && directTicket.customer_email) {
          result.customer_email = directTicket.customer_email;
        }
        if (!result.customer_phone && directTicket.customer_phone) {
          result.customer_phone = directTicket.customer_phone;
        }
      }

      // Try OTA ticket
      const otaTicket = this.otaTickets.get(ticketCode);
      if (otaTicket) {
        if (otaTicket.customer_name) {
          result.customer_name = otaTicket.customer_name;
          result.source = 'ticket';
        }
        // Fill email/phone if not from reservation
        if (!result.customer_email && otaTicket.customer_email) {
          result.customer_email = otaTicket.customer_email;
        }
        if (!result.customer_phone && otaTicket.customer_phone) {
          result.customer_phone = otaTicket.customer_phone;
        }
      }
    }

    // Step 3: Check order record (future - would query orders table)
    // For mock mode, we skip this step as we don't have mock orders
    // In production:
    // if (!result.customer_name) {
    //   const order = await orderRepository.findByTicketCode(ticketCode);
    //   if (order?.customer_name) {
    //     result.customer_name = order.customer_name;
    //     result.source = 'order';
    //   }
    // }

    logger.debug('customer_info.lookup', {
      ticket_code: ticketCode,
      found_name: !!result.customer_name,
      found_email: !!result.customer_email,
      found_phone: !!result.customer_phone,
      source: result.source,
    });

    return result;
  }

}
