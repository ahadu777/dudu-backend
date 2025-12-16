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
import { TicketEntity, TicketReservationEntity, ReservationSlotEntity } from '../../models';
import { Repository, Not } from 'typeorm';

/**
 * CustomerReservationService
 * Database implementation using TypeORM
 * Unified ticket lookup from tickets table (supports both mini-program and OTA)
 */
export class CustomerReservationService {
  private ticketRepo!: Repository<TicketEntity>;
  private reservationRepo!: Repository<TicketReservationEntity>;
  private slotRepo!: Repository<ReservationSlotEntity>;
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    this.ticketRepo = AppDataSource.getRepository(TicketEntity);
    this.reservationRepo = AppDataSource.getRepository(TicketReservationEntity);
    this.slotRepo = AppDataSource.getRepository(ReservationSlotEntity);
    this.initialized = true;
  }

  /**
   * Validate ticket eligibility for reservation
   * Unified lookup from tickets table (supports both mini-program and OTA)
   */
  async validateTicket(request: TicketValidationRequest): Promise<TicketValidationResponse> {
    await this.ensureInitialized();
    const { ticket_code, orq } = request;

    logger.info('reservation.validate_ticket.start', { ticket_code, orq });

    // Unified lookup from tickets table
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code }
    });

    if (!ticket) {
      logger.warn('reservation.validate_ticket.not_found', { ticket_code });
      return {
        valid: false,
        error: 'Ticket not found'
      };
    }

    // Determine source based on channel field
    const isOTA = ticket.channel === 'ota';
    if (isOTA) {
      return this.validateOtaTicket(ticket);
    } else {
      return this.validateDirectTicket(ticket);
    }
  }

  /**
   * Validate mini-program ticket from tickets table
   */
  private async validateDirectTicket(
    ticket: TicketEntity
  ): Promise<TicketValidationResponse> {
    const ticket_code = ticket.ticket_code;

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
        orq: ticket.orq,
        source: 'direct' as ReservationSource
      }
    };
  }

  /**
   * Validate OTA ticket from unified tickets table
   */
  private async validateOtaTicket(
    ticket: TicketEntity
  ): Promise<TicketValidationResponse> {
    const ticket_code = ticket.ticket_code;

    // Check OTA ticket status
    switch (ticket.status) {
      case 'PRE_GENERATED':
        logger.warn('reservation.validate_ticket.ota_not_activated', { ticket_code });
        return { valid: false, error: 'OTA ticket is not activated yet' };

      case 'VERIFIED':
        logger.warn('reservation.validate_ticket.ota_used', { ticket_code });
        return { valid: false, error: 'Ticket has already been used' };

      case 'EXPIRED':
        logger.warn('reservation.validate_ticket.ota_expired', { ticket_code });
        return { valid: false, error: 'Ticket has expired' };

      case 'CANCELLED':
        logger.warn('reservation.validate_ticket.ota_cancelled', { ticket_code });
        return { valid: false, error: 'Ticket has been cancelled' };

      case 'ACTIVATED':
      case 'RESERVED':
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
            ticket_code: ticket.ticket_code,
            product_id: ticket.product_id,
            product_name: 'OTA Product', // TODO: join with products table
            status: 'ACTIVATED',
            expires_at: ticket.expires_at ? ticket.expires_at.toISOString() : null,
            customer_name: ticket.customer_name,
            customer_email: ticket.customer_email,
            customer_phone: ticket.customer_phone,
            source: 'ota' as ReservationSource
          }
        };

      default:
        logger.warn('reservation.validate_ticket.ota_invalid_status', { ticket_code, status: ticket.status });
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
    const { ticket_code, slot_id, orq, customer_name: providedName, customer_email: providedEmail, customer_phone: providedPhone } = request;

    logger.info('reservation.create.start', { ticket_code, slot_id, orq });

    // 1. Validate ticket (dual-source lookup)
    const validation = await this.validateTicket({ ticket_code, orq });
    if (!validation.valid || !validation.ticket) {
      return { success: false, error: validation.error };
    }

    const ticketSource = validation.ticket.source || 'direct';

    // 2. Determine customer info: use provided values or fallback to ticket values
    const customer_name = providedName || validation.ticket.customer_name || undefined;
    const customer_email = providedEmail || validation.ticket.customer_email || '';
    const customer_phone = providedPhone || validation.ticket.customer_phone || '';

    // 3. Check slot capacity
    const slot = await this.slotRepo.findOne({ where: { id: parseInt(slot_id) } });
    if (!slot) {
      return { success: false, error: 'Slot not found' };
    }
    if (slot.booked_count >= slot.total_capacity) {
      return { success: false, error: 'Slot is full' };
    }

    // 4. Determine orq: use ticket's orq for direct, slot's orq for OTA
    const reservationOrq = validation.ticket.orq || slot.orq;

    // 5. Create reservation record
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
      orq: reservationOrq,
      status: 'RESERVED' as const,
      reserved_at: new Date()
    });

    const savedReservation = await this.reservationRepo.save(reservation);

    // 6. Update slot booked count
    slot.booked_count += 1;
    await this.slotRepo.save(slot);

    // 7. Update ticket status (only for direct tickets, OTA keeps ACTIVE)
    if (ticketSource === 'direct') {
      await this.ticketRepo.update(
        { ticket_code },
        { status: 'RESERVED', reserved_at: new Date(), customer_name, customer_email, customer_phone }
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
        slot_date: slot.date,
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
        new_slot_date: newSlot.date,
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
