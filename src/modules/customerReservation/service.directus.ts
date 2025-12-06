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
  ReservationSource
} from './types';
import { logger } from '../../utils/logger';
import { AppDataSource } from '../../config/database';
import { TicketEntity } from '../ticket-reservation/domain/ticket.entity';
import { PreGeneratedTicketEntity } from '../ota/domain/pre-generated-ticket.entity';
import { TicketReservationEntity } from '../ticket-reservation/domain/ticket-reservation.entity';
import { ReservationSlotEntity } from '../ticket-reservation/domain/reservation-slot.entity';
import { Repository, Not } from 'typeorm';

/**
 * CustomerReservationServiceDirectus
 * Dual-source lookup: tickets (mini-program) + pre_generated_tickets (OTA)
 * Uses TypeORM for all database queries
 */
export class CustomerReservationServiceDirectus {
  private ticketRepo!: Repository<TicketEntity>;
  private otaTicketRepo!: Repository<PreGeneratedTicketEntity>;
  private reservationRepo!: Repository<TicketReservationEntity>;
  private slotRepo!: Repository<ReservationSlotEntity>;
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    this.ticketRepo = AppDataSource.getRepository(TicketEntity);
    this.otaTicketRepo = AppDataSource.getRepository(PreGeneratedTicketEntity);
    this.reservationRepo = AppDataSource.getRepository(TicketReservationEntity);
    this.slotRepo = AppDataSource.getRepository(ReservationSlotEntity);
    this.initialized = true;
  }
  /**
   * Validate ticket eligibility for reservation
   * Dual-source lookup: tickets (mini-program) → pre_generated_tickets (OTA)
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    await this.ensureInitialized();
    const { ticket_code, orq } = request;

    logger.info('reservation.validate_ticket.start', { ticket_code, orq });

    // 1. First try mini-program tickets table
    const directTicket = await this.ticketRepo.findOne({
      where: { ticket_code }
    });

    if (directTicket) {
      return this.validateDirectTicket(directTicket, orq);
    }

    // 2. Then try OTA tickets table
    logger.info('reservation.validate_ticket.try_ota', { ticket_code });
    const otaTicket = await this.otaTicketRepo.findOne({
      where: { ticket_code }
    });

    if (otaTicket) {
      return this.validateOtaTicket(otaTicket, orq);
    }

    // 3. Not found in either source
    logger.warn('reservation.validate_ticket.not_found', { ticket_code });
    return {
      valid: false,
      error: 'Ticket not found'
    };
  }

  /**
   * Validate mini-program ticket from tickets table
   */
  private async validateDirectTicket(
    ticket: TicketEntity,
    orq: number
  ): Promise<TicketValidationResponse> {
    const ticket_code = ticket.ticket_code;

    // Check organization match
    if (ticket.orq !== orq) {
      logger.warn('reservation.validate_ticket.wrong_org', { ticket_code, expected: orq, actual: ticket.orq });
      return { valid: false, error: 'Ticket belongs to a different organization' };
    }

    // Check if ticket is activated
    if (ticket.status !== 'ACTIVATED') {
      logger.warn('reservation.validate_ticket.not_activated', { ticket_code, status: ticket.status });
      return { valid: false, error: 'Ticket must be activated before making a reservation' };
    }

    // Check if ticket already has a reservation
    const existingReservation = await this.reservationRepo.findOne({
      where: {
        ticket_id: ticket.id,
        source: 'direct',
        status: Not('CANCELLED')
      }
    });

    if (existingReservation) {
      logger.warn('reservation.validate_ticket.already_reserved', { ticket_code, reservation_id: existingReservation.id });
      return { valid: false, error: 'Ticket already has an active reservation' };
    }

    // Check expiration
    if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
      logger.warn('reservation.validate_ticket.expired', { ticket_code });
      return { valid: false, error: 'Ticket has expired' };
    }

    logger.info('reservation.validate_ticket.success', { ticket_code, source: 'direct' });

    return {
      valid: true,
      ticket: {
        ticket_code: ticket.ticket_code,
        product_id: ticket.product_id,
        product_name: 'Mini-program Product', // TODO: join with products table
        status: ticket.status,
        expires_at: ticket.expires_at?.toISOString() || null,
        reserved_at: ticket.reserved_at?.toISOString(),
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        customer_phone: ticket.customer_phone,
        order_id: Number(ticket.order_id),
        source: 'direct' as ReservationSource
      }
    };
  }

  /**
   * Validate OTA ticket from pre_generated_tickets table
   */
  private async validateOtaTicket(
    otaTicket: PreGeneratedTicketEntity,
    orq: number
  ): Promise<TicketValidationResponse> {
    const ticket_code = otaTicket.ticket_code;

    // Check OTA ticket status
    switch (otaTicket.status) {
      case 'PRE_GENERATED':
        logger.warn('reservation.validate_ticket.ota_not_activated', { ticket_code });
        return { valid: false, error: 'OTA ticket is not activated yet' };

      case 'USED':
        logger.warn('reservation.validate_ticket.ota_used', { ticket_code });
        return { valid: false, error: 'Ticket has already been used' };

      case 'EXPIRED':
        logger.warn('reservation.validate_ticket.ota_expired', { ticket_code });
        return { valid: false, error: 'Ticket has expired' };

      case 'CANCELLED':
        logger.warn('reservation.validate_ticket.ota_cancelled', { ticket_code });
        return { valid: false, error: 'Ticket has been cancelled' };

      case 'ACTIVE':
        // Check if OTA ticket already has a reservation
        const existingReservation = await this.reservationRepo.findOne({
          where: {
            ota_ticket_code: ticket_code,
            source: 'ota',
            status: Not('CANCELLED')
          }
        });

        if (existingReservation) {
          logger.warn('reservation.validate_ticket.ota_already_reserved', { ticket_code, reservation_id: existingReservation.id });
          return { valid: false, error: 'Ticket already has an active reservation' };
        }

        logger.info('reservation.validate_ticket.success', { ticket_code, source: 'ota' });

        return {
          valid: true,
          ticket: {
            ticket_code: otaTicket.ticket_code,
            product_id: otaTicket.product_id,
            product_name: 'OTA Product', // TODO: join with products table
            status: 'ACTIVE',
            expires_at: null,
            customer_name: otaTicket.customer_name,
            customer_email: otaTicket.customer_email,
            customer_phone: otaTicket.customer_phone,
            source: 'ota' as ReservationSource
          }
        };

      default:
        logger.warn('reservation.validate_ticket.ota_invalid_status', { ticket_code, status: otaTicket.status });
        return { valid: false, error: 'Invalid ticket status' };
    }
  }

  /**
   * Verify contact information
   * Reuses validateTicket for dual-source lookup
   */
  async verifyContact(request: VerifyContactRequest): Promise<VerifyContactResponse> {
    const { ticket_code, orq } = request;

    logger.info('reservation.verify_contact.start', { ticket_code });

    // Use validateTicket for dual-source lookup
    const validation = await this.validateTicket({ ticket_code, orq });

    if (!validation.valid || !validation.ticket) {
      return { success: false, error: validation.error || 'Ticket not found' };
    }

    const { customer_email, customer_phone } = validation.ticket;

    // Verify customer email exists
    if (!customer_email || customer_email.trim().length < 3) {
      return { success: false, error: 'Invalid customer email in ticket' };
    }

    // Verify customer phone exists
    if (!customer_phone || customer_phone.trim().length < 8) {
      return { success: false, error: 'Invalid customer phone in ticket' };
    }

    return { success: true, message: 'Contact information verified' };
  }

  /**
   * Create reservation for ticket and time slot
   * Supports both mini-program and OTA tickets
   */
  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    await this.ensureInitialized();
    const { ticket_code, slot_id, orq, customer_email: providedEmail, customer_phone: providedPhone } = request;

    logger.info('reservation.create.start', { ticket_code, slot_id, orq });

    // 1. Validate ticket (dual-source lookup)
    const validation = await this.validateTicket({ ticket_code, orq });
    if (!validation.valid || !validation.ticket) {
      return { success: false, error: validation.error };
    }

    const ticketSource = validation.ticket.source || 'direct';
    const customer_name = validation.ticket.customer_name || undefined;

    // Determine customer contact info
    let customer_email: string;
    let customer_phone: string;

    if (providedEmail && providedPhone) {
      customer_email = providedEmail;
      customer_phone = providedPhone;
    } else {
      customer_email = validation.ticket.customer_email || '';
      customer_phone = validation.ticket.customer_phone || '';
      if (!customer_email || !customer_phone) {
        return { success: false, error: 'Missing customer contact information in ticket' };
      }
    }

    // 2. Check slot capacity
    const slot = await this.slotRepo.findOne({ where: { id: parseInt(slot_id) } });
    if (!slot) {
      return { success: false, error: 'Slot not found' };
    }
    if (slot.booked_count >= slot.total_capacity) {
      return { success: false, error: 'Slot is full' };
    }

    // 3. Create reservation record
    // Get ticket_id for direct tickets (need to look it up)
    let directTicketId: number | undefined;
    if (ticketSource === 'direct') {
      const ticket = await this.ticketRepo.findOne({ where: { ticket_code } });
      directTicketId = ticket?.id;
    }

    const reservation = this.reservationRepo.create({
      source: ticketSource as 'direct' | 'ota',
      ticket_id: directTicketId,
      ota_ticket_code: ticketSource === 'ota' ? ticket_code : undefined,
      slot_id: parseInt(slot_id),
      customer_email,
      customer_phone,
      customer_name,
      orq,
      status: 'RESERVED' as const,
      reserved_at: new Date()
    });

    const savedReservation = await this.reservationRepo.save(reservation);

    // 4. Update slot booked count
    slot.booked_count += 1;
    await this.slotRepo.save(slot);

    // 5. Update ticket status (only for direct tickets, OTA keeps ACTIVE)
    if (ticketSource === 'direct') {
      await this.ticketRepo.update(
        { ticket_code },
        { status: 'RESERVED', reserved_at: new Date(), customer_email, customer_phone }
      );
    }

    logger.info('reservation.create.success', {
      reservation_id: savedReservation.id,
      ticket_code,
      source: ticketSource
    });

    return {
      success: true,
      data: {
        reservation_id: savedReservation.id.toString(),
        ticket_code,
        source: ticketSource,
        slot_id: slot_id,
        slot_date: slot.date, // Already a string in the entity
        slot_time: `${slot.start_time} - ${slot.end_time}`,
        customer_email,
        customer_phone,
        status: 'RESERVED',
        created_at: savedReservation.created_at.toISOString()
      }
    };
  }

  /**
   * Modify existing reservation (change slot)
   */
  async modifyReservation(request: ModifyReservationRequest): Promise<ModifyReservationResponse> {
    await this.ensureInitialized();
    const { reservation_id, new_slot_id } = request;

    logger.info('reservation.modify.start', { reservation_id, new_slot_id });

    // Find reservation
    const reservation = await this.reservationRepo.findOne({
      where: { id: parseInt(reservation_id) }
    });

    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    if (reservation.status === 'VERIFIED') {
      return { success: false, error: 'Cannot modify verified reservation' };
    }

    // Get old and new slots
    const oldSlot = await this.slotRepo.findOne({ where: { id: reservation.slot_id } });
    const newSlot = await this.slotRepo.findOne({ where: { id: parseInt(new_slot_id) } });

    if (!newSlot) {
      return { success: false, error: 'New slot not found' };
    }

    if (newSlot.booked_count >= newSlot.total_capacity) {
      return { success: false, error: 'New slot is full' };
    }

    // Update counts
    if (oldSlot) {
      oldSlot.booked_count = Math.max(0, oldSlot.booked_count - 1);
      await this.slotRepo.save(oldSlot);
    }
    newSlot.booked_count += 1;
    await this.slotRepo.save(newSlot);

    // Update reservation
    reservation.slot_id = parseInt(new_slot_id);
    reservation.updated_at = new Date();
    await this.reservationRepo.save(reservation);

    const ticketCode = reservation.source === 'ota' ? reservation.ota_ticket_code : `TICKET-${reservation.ticket_id}`;

    logger.info('reservation.modify.success', { reservation_id, new_slot_id });

    return {
      success: true,
      data: {
        reservation_id,
        ticket_code: ticketCode || '',
        new_slot_id: new_slot_id,
        new_slot_date: newSlot.date, // Already a string in the entity
        new_slot_time: `${newSlot.start_time} - ${newSlot.end_time}`,
        updated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(request: CancelReservationRequest): Promise<CancelReservationResponse> {
    await this.ensureInitialized();
    const { reservation_id } = request;

    logger.info('reservation.cancel.start', { reservation_id });

    // Find reservation
    const reservation = await this.reservationRepo.findOne({
      where: { id: parseInt(reservation_id) }
    });

    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    if (reservation.status === 'VERIFIED') {
      return { success: false, error: 'Cannot cancel verified reservation' };
    }

    // Decrement slot booked count
    const slot = await this.slotRepo.findOne({ where: { id: reservation.slot_id } });
    if (slot) {
      slot.booked_count = Math.max(0, slot.booked_count - 1);
      await this.slotRepo.save(slot);
    }

    // Update reservation status
    reservation.status = 'CANCELLED';
    reservation.updated_at = new Date();
    await this.reservationRepo.save(reservation);

    // Update ticket status back to ACTIVATED (only for direct tickets)
    if (reservation.source === 'direct' && reservation.ticket_id) {
      await this.ticketRepo.update(
        { id: reservation.ticket_id },
        { status: 'ACTIVATED' }
      );
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
}
