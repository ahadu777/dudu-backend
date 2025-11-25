import { DataSource, Repository } from 'typeorm';
import { TicketEntity } from './domain/ticket.entity';
import { ReservationSlotEntity } from './domain/reservation-slot.entity';
import { TicketReservationEntity } from './domain/ticket-reservation.entity';
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
} from '../../types/domain';
import {
  mockTickets,
  mockReservationSlots,
  mockTicketReservations,
  findTicketByCode,
  findReservationByTicketId,
  findSlotById,
  getAvailableSlotsForMonth,
} from './mock/reservation.mock';

export class TicketReservationService {
  private ticketRepo?: Repository<TicketEntity>;
  private slotRepo?: Repository<ReservationSlotEntity>;
  private reservationRepo?: Repository<TicketReservationEntity>;
  private useMock: boolean = true;

  constructor(private dataSource?: DataSource) {
    if (dataSource) {
      this.ticketRepo = dataSource.getRepository(TicketEntity);
      this.slotRepo = dataSource.getRepository(ReservationSlotEntity);
      this.reservationRepo = dataSource.getRepository(TicketReservationEntity);
      this.useMock = false;
    }
  }

  // ========================================
  // Customer Reservation APIs
  // ========================================

  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    const { ticket_code } = request;

    if (this.useMock) {
      const ticket = findTicketByCode(ticket_code);

      if (!ticket) {
        return {
          success: false,
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Invalid ticket code. Please check and try again.',
          },
        };
      }

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
          status: ticket.status as TicketReservationStatus,
          product_id: ticket.product_id,
          order_id: ticket.order_id,
        },
      };
    }

    // Database mode (future implementation)
    throw new Error('Database mode not yet implemented');
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
    const { ticket_id, slot_id, customer_email, customer_phone } = request;

    if (this.useMock) {
      // Find ticket
      const ticket = mockTickets.find(t => t.id === ticket_id);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket not found.',
          },
        };
      }

      // Check ticket status
      if (ticket.status !== 'ACTIVATED') {
        return {
          success: false,
          error: {
            code: 'TICKET_NOT_ACTIVATED',
            message: 'Only activated tickets can make reservations.',
          },
        };
      }

      // Find slot
      const slot = findSlotById(slot_id);
      if (!slot) {
        return {
          success: false,
          error: {
            code: 'SLOT_NOT_FOUND',
            message: 'Slot not found.',
          },
        };
      }

      // Check slot capacity
      if (slot.booked_count >= slot.total_capacity) {
        // Find alternative slots
        const alternativeSlots = mockReservationSlots
          .filter(s => s.date === slot.date && s.id !== slot_id && s.available_count > 0)
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
      const newReservation: TicketReservationEntity = {
        id: mockTicketReservations.length + 1,
        ticket_id,
        slot_id,
        customer_email,
        customer_phone,
        reserved_at: new Date(),
        status: 'RESERVED',
        orq: slot.orq,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTicketReservations.push(newReservation);

      // Update ticket status
      ticket.status = 'RESERVED';
      ticket.customer_email = customer_email;
      ticket.customer_phone = customer_phone;
      ticket.reserved_at = new Date();

      // Increment slot booked count
      slot.booked_count += 1;
      if (slot.booked_count >= slot.total_capacity) {
        slot.status = 'FULL';
      }

      // Generate QR code (simplified for mock)
      const qrCode = `data:image/png;base64,QR_CODE_FOR_${ticket.ticket_code}`;
      ticket.qr_code = qrCode;

      return {
        success: true,
        data: {
          reservation_id: newReservation.id,
          ticket_code: ticket.ticket_code,
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

    // Database mode with transaction
    // TODO: Implement database transaction with row-level locking
    throw new Error('Database mode not yet implemented');
  }

  // ========================================
  // Operator Validation APIs
  // ========================================

  async operatorValidateTicket(request: OperatorValidateTicketRequest): Promise<OperatorValidateTicketResponse> {
    const { ticket_code } = request;
    const today = new Date().toISOString().split('T')[0];

    if (this.useMock) {
      const ticket = findTicketByCode(ticket_code);

      if (!ticket) {
        return {
          success: false,
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket code not found or expired.',
          },
        };
      }

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
        // This shouldn't happen in normal operation - data integrity issue
        throw new Error('Reservation slot not found - data integrity issue');
      }

      // Check if reservation date matches today
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

      // Valid ticket
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

    // Database mode (future implementation)
    throw new Error('Database mode not yet implemented');
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
