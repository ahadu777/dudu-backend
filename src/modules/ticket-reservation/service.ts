import { DataSource, Repository } from 'typeorm';
import { TicketEntity } from './domain/ticket.entity';
import { ReservationSlotEntity } from './domain/reservation-slot.entity';
import { TicketReservationEntity } from './domain/ticket-reservation.entity';
import { PreGeneratedTicketEntity } from '../ota/domain/pre-generated-ticket.entity';
import {
  TicketValidationRequest,
  TicketValidationResponse,
  AvailableSlotsRequest,
  AvailableSlotsResponse,
  CreateReservationRequest,
  CreateReservationResponse,
  OperatorValidateTicketRequest,
  OperatorValidateTicketResponse,
  OperatorVerifyTicketRequest,
  OperatorVerifyTicketResponse,
  TicketReservationStatus,
  ReservationSlot,
  ReservationSource,
} from '../../types/domain';
import {
  mockTickets,
  mockReservationSlots,
  mockTicketReservations,
  findTicketByCode,
  findReservationByTicketId,
  findSlotById,
  getAvailableSlotsForMonth,
  mockOtaTickets,
  findOtaTicketByCode,
  findReservationByOtaTicketCode,
} from './mock/reservation.mock';

export class TicketReservationService {
  private ticketRepo?: Repository<TicketEntity>;
  private slotRepo?: Repository<ReservationSlotEntity>;
  private reservationRepo?: Repository<TicketReservationEntity>;
  private otaTicketRepo?: Repository<PreGeneratedTicketEntity>;
  private useMock: boolean = true;

  constructor(private dataSource?: DataSource) {
    if (dataSource) {
      this.ticketRepo = dataSource.getRepository(TicketEntity);
      this.slotRepo = dataSource.getRepository(ReservationSlotEntity);
      this.reservationRepo = dataSource.getRepository(TicketReservationEntity);
      this.otaTicketRepo = dataSource.getRepository(PreGeneratedTicketEntity);
      this.useMock = false;
    }
  }

  // ========================================
  // Customer Reservation APIs
  // ========================================

  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code } = request;

    if (this.useMock) {
      // 1. First try direct ticket
      const directTicket = findTicketByCode(ticket_code);
      if (directTicket) {
        return this.validateDirectTicket(directTicket);
      }

      // 2. Then try OTA ticket
      const otaTicket = findOtaTicketByCode(ticket_code);
      if (otaTicket) {
        return this.validateOtaTicket(otaTicket);
      }

      // 3. Not found in either source
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Invalid ticket code. Please check and try again.',
        },
      };
    }

    // Database mode (future implementation)
    throw new Error('Database mode not yet implemented');
  }

  private validateDirectTicket(ticket: typeof mockTickets[0]): TicketValidationResponse {
    if (ticket.status === 'PENDING_PAYMENT') {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_ACTIVATED',
          message: 'This ticket is not activated yet. Please complete payment.',
        },
      };
    }

    if (ticket.status === 'RESERVED') {
      const reservation = findReservationByTicketId(ticket.id);
      const slot = reservation ? findSlotById(reservation.slot_id) : null;
      return {
        success: false,
        error: {
          code: 'TICKET_ALREADY_RESERVED',
          message: `This ticket is already reserved for ${slot?.date || 'a date'}.`,
          reserved_date: slot?.date,
        },
      };
    }

    if (ticket.status === 'EXPIRED') {
      return {
        success: false,
        error: {
          code: 'TICKET_EXPIRED',
          message: 'This ticket has expired.',
        },
      };
    }

    return {
      success: true,
      data: {
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        source: 'direct' as ReservationSource,
        status: ticket.status as TicketReservationStatus,
        product_id: ticket.product_id,
        order_id: ticket.order_id,
      },
    };
  }

  private validateOtaTicket(otaTicket: typeof mockOtaTickets[0]): TicketValidationResponse {
    if (otaTicket.status === 'PRE_GENERATED') {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_ACTIVATED',
          message: 'This OTA ticket is not activated yet.',
        },
      };
    }

    if (otaTicket.status === 'USED') {
      return {
        success: false,
        error: {
          code: 'TICKET_ALREADY_USED',
          message: 'This ticket has already been used.',
        },
      };
    }

    if (otaTicket.status === 'EXPIRED') {
      return {
        success: false,
        error: {
          code: 'TICKET_EXPIRED',
          message: 'This ticket has expired.',
        },
      };
    }

    if (otaTicket.status === 'CANCELLED') {
      return {
        success: false,
        error: {
          code: 'TICKET_CANCELLED',
          message: 'This ticket has been cancelled.',
        },
      };
    }

    // Check if OTA ticket already has a reservation
    const existingReservation = findReservationByOtaTicketCode(otaTicket.ticket_code);
    if (existingReservation) {
      const slot = findSlotById(existingReservation.slot_id);
      return {
        success: false,
        error: {
          code: 'TICKET_ALREADY_RESERVED',
          message: `This ticket is already reserved for ${slot?.date || 'a date'}.`,
          reserved_date: slot?.date,
        },
      };
    }

    // OTA ticket is ACTIVE and ready for reservation
    return {
      success: true,
      data: {
        ticket_code: otaTicket.ticket_code,
        source: 'ota' as ReservationSource,
        status: 'ACTIVE',
        product_id: otaTicket.product_id,
        order_id: otaTicket.order_id,
        partner_id: otaTicket.partner_id,
      },
    };
  }

  async getAvailableSlots(request: AvailableSlotsRequest): Promise<AvailableSlotsResponse> {
    const { month, orq } = request;
    const currentMonth = month || new Date().toISOString().substring(0, 7);

    if (this.useMock) {
      const slots = getAvailableSlotsForMonth(currentMonth, orq);

      const data: ReservationSlot[] = slots.map(slot => ({
        id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        total_capacity: slot.total_capacity,
        booked_count: slot.booked_count,
        available_count: slot.available_count,
        status: slot.status as any, // SlotStatus matches ReservationSlotStatus values
        capacity_status: slot.capacity_status as any, // Computed property matches CapacityStatus
      }));

      return {
        success: true,
        data,
        metadata: {
          month: currentMonth,
          total_slots: data.length,
        },
      };
    }

    // Database mode (future implementation)
    throw new Error('Database mode not yet implemented');
  }

  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    const { ticket_id, ticket_code, slot_id, customer_email, customer_phone } = request;

    if (this.useMock) {
      // Determine ticket source and find ticket
      if (ticket_id) {
        // Direct ticket by ID
        return this.createDirectReservation(ticket_id, slot_id, customer_email, customer_phone);
      }

      if (ticket_code) {
        // Try OTA ticket first
        const otaTicket = findOtaTicketByCode(ticket_code);
        if (otaTicket && otaTicket.status === 'ACTIVE') {
          return this.createOtaReservation(otaTicket, slot_id, customer_email, customer_phone);
        }

        // Fallback to direct ticket by code
        const directTicket = findTicketByCode(ticket_code);
        if (directTicket) {
          return this.createDirectReservation(directTicket.id, slot_id, customer_email, customer_phone);
        }
      }

      return {
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found. Please provide ticket_id or ticket_code.',
        },
      };
    }

    // Database mode with transaction
    // TODO: Implement database transaction with row-level locking
    throw new Error('Database mode not yet implemented');
  }

  private createDirectReservation(
    ticketId: number,
    slotId: number,
    customerEmail: string,
    customerPhone: string
  ): CreateReservationResponse {
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      };
    }

    if (ticket.status !== 'ACTIVATED') {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_ACTIVATED',
          message: 'Only activated tickets can make reservations.',
        },
      };
    }

    const slot = findSlotById(slotId);
    if (!slot) {
      return {
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Slot not found.',
        },
      };
    }

    if (slot.booked_count >= slot.total_capacity) {
      const alternativeSlots = mockReservationSlots
        .filter(s => s.date === slot.date && s.id !== slotId && s.available_count > 0)
        .slice(0, 2)
        .map(s => ({
          slot_id: s.id,
          date: s.date,
          start_time: s.start_time,
        }));

      return {
        success: false,
        error: {
          code: 'SLOT_FULL',
          message: 'This time slot is full. Please select another time.',
          alternative_slots: alternativeSlots,
        },
      };
    }

    // Create reservation
    const newReservation = {
      id: mockTicketReservations.length + 1,
      source: 'direct' as const,
      ota_ticket_code: undefined,
      ticket_id: ticketId,
      slot_id: slotId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      reserved_at: new Date(),
      status: 'RESERVED' as const,
      orq: slot.orq,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockTicketReservations.push(newReservation as any);

    // Update ticket status
    ticket.status = 'RESERVED';
    ticket.customer_email = customerEmail;
    ticket.customer_phone = customerPhone;
    ticket.reserved_at = new Date();

    // Increment slot booked count
    slot.booked_count += 1;
    if (slot.booked_count >= slot.total_capacity) {
      slot.status = 'FULL';
    }

    const qrCode = `data:image/png;base64,QR_CODE_FOR_${ticket.ticket_code}`;
    ticket.qr_code = qrCode;

    return {
      success: true,
      data: {
        reservation_id: newReservation.id,
        ticket_code: ticket.ticket_code,
        source: 'direct',
        slot: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        },
        confirmation_sent: true,
        qr_code: qrCode,
      },
    };
  }

  private createOtaReservation(
    otaTicket: typeof mockOtaTickets[0],
    slotId: number,
    customerEmail: string,
    customerPhone: string
  ): CreateReservationResponse {
    // Check if already reserved
    const existingReservation = findReservationByOtaTicketCode(otaTicket.ticket_code);
    if (existingReservation) {
      return {
        success: false,
        error: {
          code: 'TICKET_ALREADY_RESERVED',
          message: 'This OTA ticket is already reserved.',
        },
      };
    }

    const slot = findSlotById(slotId);
    if (!slot) {
      return {
        success: false,
        error: {
          code: 'SLOT_NOT_FOUND',
          message: 'Slot not found.',
        },
      };
    }

    if (slot.booked_count >= slot.total_capacity) {
      const alternativeSlots = mockReservationSlots
        .filter(s => s.date === slot.date && s.id !== slotId && s.available_count > 0)
        .slice(0, 2)
        .map(s => ({
          slot_id: s.id,
          date: s.date,
          start_time: s.start_time,
        }));

      return {
        success: false,
        error: {
          code: 'SLOT_FULL',
          message: 'This time slot is full. Please select another time.',
          alternative_slots: alternativeSlots,
        },
      };
    }

    // Create OTA reservation
    const newReservation = {
      id: mockTicketReservations.length + 1,
      source: 'ota' as const,
      ota_ticket_code: otaTicket.ticket_code,
      ticket_id: undefined, // OTA tickets don't have ticket_id
      slot_id: slotId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      reserved_at: new Date(),
      status: 'RESERVED' as const,
      orq: slot.orq,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockTicketReservations.push(newReservation as any);

    // Increment slot booked count (shared capacity with direct tickets)
    slot.booked_count += 1;
    if (slot.booked_count >= slot.total_capacity) {
      slot.status = 'FULL';
    }

    // OTA ticket status remains ACTIVE (not changed)
    const qrCode = otaTicket.qr_code || `data:image/png;base64,QR_CODE_FOR_${otaTicket.ticket_code}`;

    return {
      success: true,
      data: {
        reservation_id: newReservation.id,
        ticket_code: otaTicket.ticket_code,
        source: 'ota',
        ota_ticket_code: otaTicket.ticket_code,
        slot: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        },
        confirmation_sent: true,
        qr_code: qrCode,
      },
    };
  }

  // ========================================
  // Operator Validation APIs
  // ========================================

  async operatorValidateTicket(request: OperatorValidateTicketRequest): Promise<OperatorValidateTicketResponse> {
    const { ticket_code } = request;
    const today = new Date().toISOString().split('T')[0];

    if (this.useMock) {
      // 1. First try direct ticket
      const directTicket = findTicketByCode(ticket_code);
      if (directTicket) {
        return this.operatorValidateDirectTicket(directTicket, today);
      }

      // 2. Then try OTA ticket
      const otaTicket = findOtaTicketByCode(ticket_code);
      if (otaTicket) {
        return this.operatorValidateOtaTicket(otaTicket, today);
      }

      // 3. Not found
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket code not found or expired.',
        },
      };
    }

    // Database mode (future implementation)
    throw new Error('Database mode not yet implemented');
  }

  private operatorValidateDirectTicket(
    ticket: typeof mockTickets[0],
    today: string
  ): OperatorValidateTicketResponse {
    if (ticket.status === 'PENDING_PAYMENT') {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_ACTIVATED',
          message: 'This ticket is not activated yet. Please complete payment.',
          ticket_status: ticket.status,
        },
      };
    }

    if (ticket.status === 'EXPIRED') {
      return {
        success: false,
        error: {
          code: 'TICKET_EXPIRED',
          message: 'This ticket has expired.',
        },
      };
    }

    if (ticket.status === 'VERIFIED') {
      return {
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'This ticket was already verified',
          verified_at: ticket.verified_at?.toISOString(),
          verified_by: ticket.verified_by,
          operator_name: 'Jane Smith', // Mock operator name
        },
      };
    }

    if (ticket.status === 'ACTIVATED') {
      return {
        success: false,
        error: {
          code: 'NO_RESERVATION',
          message: 'Ticket is activated but has no reservation',
          ticket_status: ticket.status,
        },
      };
    }

    // Status is RESERVED - check reservation
    const reservation = findReservationByTicketId(ticket.id);
    if (!reservation) {
      return {
        success: false,
        error: {
          code: 'NO_RESERVATION',
          message: 'Ticket has no reservation.',
          ticket_status: ticket.status,
        },
      };
    }

    const slot = findSlotById(reservation.slot_id);
    if (!slot) {
      throw new Error('Reservation slot not found - data integrity issue');
    }

    const isToday = slot.date === today;
    if (!isToday) {
      return {
        success: false,
        error: {
          code: 'WRONG_DATE',
          message: `Ticket reserved for ${slot.date}, not today`,
          reservation_date: slot.date,
          today,
        },
      };
    }

    return {
      success: true,
      data: {
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        status: ticket.status as TicketReservationStatus,
        customer_email: ticket.customer_email || '',
        customer_phone: ticket.customer_phone || '',
        reservation: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_today: isToday,
        },
        validation_status: 'VALID',
      },
    };
  }

  private operatorValidateOtaTicket(
    otaTicket: typeof mockOtaTickets[0],
    today: string
  ): OperatorValidateTicketResponse {
    if (otaTicket.status === 'PRE_GENERATED') {
      return {
        success: false,
        error: {
          code: 'TICKET_NOT_ACTIVATED',
          message: 'This OTA ticket is not activated yet.',
          ticket_status: otaTicket.status,
        },
      };
    }

    if (otaTicket.status === 'EXPIRED') {
      return {
        success: false,
        error: {
          code: 'TICKET_EXPIRED',
          message: 'This ticket has expired.',
        },
      };
    }

    if (otaTicket.status === 'USED') {
      return {
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'This OTA ticket has already been used.',
          ticket_status: otaTicket.status,
        },
      };
    }

    if (otaTicket.status === 'CANCELLED') {
      return {
        success: false,
        error: {
          code: 'TICKET_CANCELLED',
          message: 'This ticket has been cancelled.',
          ticket_status: otaTicket.status,
        },
      };
    }

    // Status is ACTIVE - check for reservation
    const reservation = findReservationByOtaTicketCode(otaTicket.ticket_code);
    if (!reservation) {
      return {
        success: false,
        error: {
          code: 'NO_RESERVATION',
          message: 'OTA ticket is active but has no reservation',
          ticket_status: otaTicket.status,
        },
      };
    }

    const slot = findSlotById(reservation.slot_id);
    if (!slot) {
      throw new Error('Reservation slot not found - data integrity issue');
    }

    const isToday = slot.date === today;
    if (!isToday) {
      return {
        success: false,
        error: {
          code: 'WRONG_DATE',
          message: `Ticket reserved for ${slot.date}, not today`,
          reservation_date: slot.date,
          today,
        },
      };
    }

    return {
      success: true,
      data: {
        ticket_id: 0, // OTA tickets don't have numeric ID
        ticket_code: otaTicket.ticket_code,
        status: 'RESERVED' as TicketReservationStatus, // Map ACTIVE + reservation to RESERVED for display
        customer_email: otaTicket.customer_email || reservation.customer_email || '',
        customer_phone: otaTicket.customer_phone || reservation.customer_phone || '',
        reservation: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_today: isToday,
        },
        validation_status: 'VALID',
      },
    };
  }

  async operatorVerifyTicket(request: OperatorVerifyTicketRequest): Promise<OperatorVerifyTicketResponse> {
    const { ticket_id, operator_id } = request;

    if (this.useMock) {
      const ticket = mockTickets.find(t => t.id === ticket_id);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.status !== 'RESERVED') {
        throw new Error('Only reserved tickets can be verified');
      }

      // Update ticket status
      ticket.status = 'VERIFIED';
      ticket.verified_at = new Date();
      ticket.verified_by = operator_id;

      // Update reservation status
      const reservation = findReservationByTicketId(ticket_id);
      if (reservation) {
        reservation.status = 'VERIFIED';
        reservation.updated_at = new Date();
      }

      return {
        success: true,
        data: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          status: ticket.status as TicketReservationStatus,
          verified_at: ticket.verified_at.toISOString(),
          verified_by: ticket.verified_by,
        },
      };
    }

    // Database mode with transaction
    // TODO: Implement database transaction
    throw new Error('Database mode not yet implemented');
  }
}
