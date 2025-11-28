import { DataSource, Repository } from 'typeorm';
import { Venue } from './venue.entity';
import { VenueSession } from './venue-session.entity';
import { RedemptionEvent } from './redemption-event.entity';
import { PreGeneratedTicketEntity } from '../../ota/domain/pre-generated-ticket.entity';
import { OTAOrderEntity } from '../../ota/domain/ota-order.entity';

export class VenueRepository {
  private venueRepo: Repository<Venue>;
  private sessionRepo: Repository<VenueSession>;
  private redemptionRepo: Repository<RedemptionEvent>;
  private preGeneratedTicketRepo: Repository<PreGeneratedTicketEntity>;
  private otaOrderRepo: Repository<OTAOrderEntity>;

  constructor(dataSource: DataSource) {
    this.venueRepo = dataSource.getRepository(Venue);
    this.sessionRepo = dataSource.getRepository(VenueSession);
    this.redemptionRepo = dataSource.getRepository(RedemptionEvent);
    this.preGeneratedTicketRepo = dataSource.getRepository(PreGeneratedTicketEntity);
    this.otaOrderRepo = dataSource.getRepository(OTAOrderEntity);
  }

  // Ticket Management
  async getTicketByCode(ticketCode: string): Promise<any | null> {
    // Query from pre_generated_tickets table (OTA tickets)
    const otaTicket = await this.preGeneratedTicketRepo.findOne({
      where: { ticket_code: ticketCode }
    });

    if (otaTicket) {
      return {
        ticket_code: otaTicket.ticket_code,
        product_id: otaTicket.product_id,
        status: otaTicket.status,
        entitlements: otaTicket.entitlements,
        ticket_type: 'OTA',
        order_id: otaTicket.order_id,
        batch_id: otaTicket.batch_id,
        partner_id: otaTicket.partner_id,
        // Customer information (顾客信息)
        customer_name: otaTicket.customer_name,
        customer_email: otaTicket.customer_email,
        customer_phone: otaTicket.customer_phone,
        customer_type: otaTicket.customer_type,
        raw: otaTicket.raw
      };
    }

    // TODO: Add support for normal tickets from 'tickets' table if needed
    return null;
  }

  async decrementEntitlement(ticketCode: string, functionCode: string): Promise<boolean> {
    const ticket = await this.preGeneratedTicketRepo.findOne({
      where: { ticket_code: ticketCode }
    });

    if (!ticket) {
      return false;
    }

    // Find and decrement the entitlement
    const entitlements = ticket.entitlements as Array<{
      function_code: string;
      remaining_uses: number;
    }>;

    const entitlementIndex = entitlements.findIndex(
      (e: { function_code: string }) => e.function_code === functionCode
    );

    if (entitlementIndex === -1) {
      return false;
    }

    if (entitlements[entitlementIndex].remaining_uses <= 0) {
      return false;
    }

    // Decrement the remaining uses
    entitlements[entitlementIndex].remaining_uses -= 1;

    // Check if all entitlements are fully used
    const allUsed = entitlements.every((e: { remaining_uses: number }) => e.remaining_uses === 0);

    // Update the ticket in database
    const updateData: any = { entitlements: entitlements as any };

    // If all entitlements are used up, mark ticket as USED
    if (allUsed) {
      updateData.status = 'USED';
    }

    await this.preGeneratedTicketRepo.update(
      { ticket_code: ticketCode },
      updateData
    );

    // Update order status if ticket has an order_id
    if (ticket.order_id) {
      await this.updateOrderStatusIfNeeded(ticket.order_id);
    }

    return true;
  }

  /**
   * Update order status based on entitlement redemption progress
   * Called after ticket redemption to keep order status in sync
   *
   * Status logic:
   * - confirmed: No entitlements redeemed yet
   * - in_progress: Some (but not all) entitlements redeemed
   * - completed: All entitlements redeemed
   */
  private async updateOrderStatusIfNeeded(orderId: string): Promise<void> {
    // Get all tickets for this order
    const tickets = await this.preGeneratedTicketRepo.find({
      where: { order_id: orderId }
    });

    if (tickets.length === 0) {
      return; // No tickets found, nothing to update
    }

    // Count total and used entitlements across all tickets
    let totalEntitlements = 0;
    let usedEntitlements = 0;

    for (const ticket of tickets) {
      const entitlements = ticket.entitlements as Array<{
        function_code: string;
        remaining_uses: number;
      }>;

      for (const entitlement of entitlements) {
        totalEntitlements++;
        // Entitlement is considered "used" if remaining_uses is 0
        if (entitlement.remaining_uses === 0) {
          usedEntitlements++;
        }
      }
    }

    // Determine new order status based on entitlement usage
    let newStatus: 'confirmed' | 'in_progress' | 'completed';

    if (usedEntitlements === totalEntitlements && totalEntitlements > 0) {
      // All entitlements are used - order is completed
      newStatus = 'completed';
    } else if (usedEntitlements > 0) {
      // Some entitlements are used - order is in progress
      newStatus = 'in_progress';
    } else {
      // No entitlements used yet - keep confirmed
      newStatus = 'confirmed';
    }

    // Update order status
    await this.otaOrderRepo.update(
      { order_id: orderId },
      { status: newStatus }
    );
  }

  // Venue Management
  async findVenueByCode(venueCode: string): Promise<Venue | null> {
    return this.venueRepo.findOne({ where: { venue_code: venueCode, is_active: true } });
  }

  async getAllActiveVenues(): Promise<Venue[]> {
    return this.venueRepo.find({
      where: { is_active: true },
      order: { venue_code: 'ASC' }
    });
  }

  // ============================================================================
  // Venue CRUD Operations
  // ============================================================================

  async createVenue(venueData: Partial<Venue>): Promise<Venue> {
    const venue = this.venueRepo.create(venueData);
    return this.venueRepo.save(venue);
  }

  async findVenueById(venueId: number): Promise<Venue | null> {
    return this.venueRepo.findOne({ where: { venue_id: venueId } });
  }

  async findAllVenues(includeInactive: boolean = false): Promise<Venue[]> {
    const where = includeInactive ? {} : { is_active: true };
    return this.venueRepo.find({
      where,
      order: { venue_code: 'ASC' }
    });
  }

  async updateVenue(venueId: number, updateData: Partial<Venue>): Promise<Venue | null> {
    const venue = await this.findVenueById(venueId);
    if (!venue) return null;

    Object.assign(venue, updateData);
    return this.venueRepo.save(venue);
  }

  async deleteVenue(venueId: number, hardDelete: boolean = false): Promise<boolean> {
    const venue = await this.findVenueById(venueId);
    if (!venue) return false;

    if (hardDelete) {
      await this.venueRepo.remove(venue);
    } else {
      // Soft delete - set is_active to false
      venue.is_active = false;
      await this.venueRepo.save(venue);
    }
    return true;
  }

  async isVenueCodeUnique(venueCode: string, excludeVenueId?: number): Promise<boolean> {
    const query = this.venueRepo.createQueryBuilder('venue')
      .where('venue.venue_code = :venueCode', { venueCode });

    if (excludeVenueId) {
      query.andWhere('venue.venue_id != :venueId', { venueId: excludeVenueId });
    }

    const count = await query.getCount();
    return count === 0;
  }

  // Session Management for Operators
  async createVenueSession(sessionData: {
    venueCode: string;
    operatorId: number;
    operatorName: string;
    terminalDeviceId?: string;
    durationSeconds?: number;
  }): Promise<VenueSession | null> {
    const venue = await this.findVenueByCode(sessionData.venueCode);
    if (!venue) return null;

    const session = this.sessionRepo.create({
      session_code: `VS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      venue_id: venue.venue_id,
      operator_id: sessionData.operatorId,
      operator_name: sessionData.operatorName,
      terminal_device_id: sessionData.terminalDeviceId,
      started_at: new Date(),
      session_duration_seconds: sessionData.durationSeconds || 28800, // 8 hours default
      status: 'active'
    });

    return this.sessionRepo.save(session);
  }

  async findActiveSession(sessionCode: string): Promise<VenueSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { session_code: sessionCode, status: 'active' },
      relations: ['venue']
    });

    // Check if session is still valid (not expired)
    if (session && !session.isValid()) {
      // Auto-expire the session
      session.status = 'expired';
      session.ended_at = new Date();
      await this.sessionRepo.save(session);
      return null;
    }

    return session;
  }

  // CRITICAL: Fast JTI duplicate detection for fraud prevention
  // Check if JTI has been used for a specific function (not just any function)
  async hasJtiBeenUsedForFunction(jti: string, functionCode: string): Promise<boolean> {
    const count = await this.redemptionRepo.count({
      where: {
        jti,
        function_code: functionCode,
        result: 'success'  // Only count successful redemptions
      }
    });
    return count > 0;
  }

  // Record redemption attempt (success or failure)
  async recordRedemption(redemptionData: {
    ticketCode: string;
    functionCode: string;
    venueId: number;
    operatorId: number;
    sessionCode: string;
    terminalDeviceId?: string;
    jti: string;
    result: 'success' | 'reject';
    reason?: string;
    remainingUsesAfter?: number;
    additionalData?: Record<string, any>;
  }): Promise<RedemptionEvent> {
    const event = this.redemptionRepo.create({
      ticket_code: redemptionData.ticketCode,
      function_code: redemptionData.functionCode,
      venue_id: redemptionData.venueId,
      operator_id: redemptionData.operatorId,
      session_code: redemptionData.sessionCode,
      terminal_device_id: redemptionData.terminalDeviceId,
      jti: redemptionData.jti,
      result: redemptionData.result,
      reason: redemptionData.reason,
      remaining_uses_after: redemptionData.remainingUsesAfter,
      redeemed_at: new Date(),
      additional_data: redemptionData.additionalData
    });

    return this.redemptionRepo.save(event);
  }

  // Analytics queries for PRD-003 success metrics
  async getVenueAnalytics(venueId: number, startDate: Date, endDate: Date) {
    const query = this.redemptionRepo.createQueryBuilder('re')
      .leftJoin('re.venue', 'v')
      .where('re.venue_id = :venueId', { venueId })
      .andWhere('re.redeemed_at BETWEEN :startDate AND :endDate', { startDate, endDate });

    const [
      totalScans,
      successfulScans,
      fraudAttempts,
      ferryBoardings,
      giftRedemptions,
      playgroundTokens
    ] = await Promise.all([
      query.clone().getCount(),
      query.clone().andWhere('re.result = :result', { result: 'success' }).getCount(),
      query.clone().andWhere('re.reason IN (:...fraudReasons)', {
        fraudReasons: ['ALREADY_REDEEMED', 'DUPLICATE_JTI']
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'ferry_boarding', result: 'success'
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'gift_redemption', result: 'success'
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'playground_token', result: 'success'
      }).getCount()
    ]);

    return {
      venue_id: venueId,
      period: { start: startDate, end: endDate },
      metrics: {
        total_scans: totalScans,
        successful_scans: successfulScans,
        fraud_attempts: fraudAttempts,
        success_rate: totalScans > 0 ? (successfulScans / totalScans) * 100 : 0,
        fraud_rate: totalScans > 0 ? (fraudAttempts / totalScans) * 100 : 0,
        function_breakdown: {
          ferry_boarding: ferryBoardings,
          gift_redemption: giftRedemptions,
          playground_token: playgroundTokens
        }
      }
    };
  }

  // Performance monitoring for <2 second requirement
  async getAverageResponseTime(venueId: number, hours: number = 1): Promise<number> {
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const events = await this.redemptionRepo.find({
      where: {
        venue_id: venueId,
        redeemed_at: { $gte: startTime } as any
      },
      select: ['created_at', 'redeemed_at']
    });

    if (events.length === 0) return 0;

    const totalResponseTime = events.reduce((sum, event) => {
      const responseTime = event.created_at.getTime() - event.redeemed_at.getTime();
      return sum + Math.abs(responseTime); // Ensure positive
    }, 0);

    return totalResponseTime / events.length / 1000; // Return in seconds
  }

  /**
   * Query redemption events for reporting
   * Supports filtering by time range, function code, and venue
   */
  async queryRedemptionEvents(filters: {
    from?: Date;
    to?: Date;
    functionCode?: string;
    venueId?: number;
    result?: 'success' | 'reject';
    limit?: number;
    offset?: number;
  }): Promise<{
    events: RedemptionEvent[];
    total: number;
  }> {
    const query = this.redemptionRepo.createQueryBuilder('re')
      .leftJoinAndSelect('re.venue', 'v');

    // Apply filters
    if (filters.from) {
      query.andWhere('re.redeemed_at >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('re.redeemed_at <= :to', { to: filters.to });
    }

    if (filters.functionCode) {
      query.andWhere('re.function_code = :functionCode', { functionCode: filters.functionCode });
    }

    if (filters.venueId) {
      query.andWhere('re.venue_id = :venueId', { venueId: filters.venueId });
    }

    if (filters.result) {
      query.andWhere('re.result = :result', { result: filters.result });
    }

    // Order by redeemed_at DESC (newest first)
    query.orderBy('re.redeemed_at', 'DESC');

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    if (filters.limit) {
      query.take(filters.limit);
    }

    if (filters.offset) {
      query.skip(filters.offset);
    }

    const events = await query.getMany();

    return { events, total };
  }
}