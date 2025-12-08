import { DataSource, Repository } from 'typeorm';
import { Venue } from './venue.entity';
import { VenueSession } from './venue-session.entity';
import { RedemptionEvent } from './redemption-event.entity';
import { TicketEntity, TicketStatus } from '../../ticket-reservation/domain/ticket.entity';
import { OTAOrderEntity } from '../../ota/domain/ota-order.entity';
import { TicketReservationEntity } from '../../ticket-reservation/domain/ticket-reservation.entity';
import { ReservationSlotEntity } from '../../ticket-reservation/domain/reservation-slot.entity';
import { ProductEntity } from '../../ota/domain/product.entity';

export class VenueRepository {
  private venueRepo: Repository<Venue>;
  private sessionRepo: Repository<VenueSession>;
  private redemptionRepo: Repository<RedemptionEvent>;
  private otaOrderRepo: Repository<OTAOrderEntity>;
  private ticketRepo: Repository<TicketEntity>;  // 统一票券表（小程序 + OTA）
  private reservationRepo: Repository<TicketReservationEntity>;  // 票券预订
  private slotRepo: Repository<ReservationSlotEntity>;  // 预订时段
  private productRepo: Repository<ProductEntity>;

  constructor(dataSource: DataSource) {
    this.venueRepo = dataSource.getRepository(Venue);
    this.sessionRepo = dataSource.getRepository(VenueSession);
    this.redemptionRepo = dataSource.getRepository(RedemptionEvent);
    this.otaOrderRepo = dataSource.getRepository(OTAOrderEntity);
    this.ticketRepo = dataSource.getRepository(TicketEntity);
    this.reservationRepo = dataSource.getRepository(TicketReservationEntity);
    this.slotRepo = dataSource.getRepository(ReservationSlotEntity);
    this.productRepo = dataSource.getRepository(ProductEntity);
  }

  // Ticket Management
  async getTicketByCode(ticketCode: string): Promise<any | null> {
    // 统一查询 tickets 表（已合并 OTA 和小程序票券）
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code: ticketCode }
    });

    if (!ticket) {
      return null;
    }

    // 根据 channel 判断来源
    const isOTA = ticket.channel === 'ota';
    const source = isOTA ? 'OTA' : 'MINIPROGRAM';
    const reservationSource = isOTA ? 'ota' : 'direct';

    // Cascading lookup: reservation (优先) → ticket (兜底)
    let customer_name = ticket.customer_name;
    let customer_email = ticket.customer_email;
    let customer_phone = ticket.customer_phone;

    // Check reservation for customer info (优先使用预约表的信息)
    const reservationWhere = isOTA
      ? { ota_ticket_code: ticket.ticket_code, source: reservationSource }
      : { ticket_id: ticket.id, source: reservationSource };

    const reservation = await this.reservationRepo.findOne({
      where: reservationWhere
    });
    if (reservation) {
      customer_name = reservation.customer_name || customer_name;
      customer_email = reservation.customer_email || customer_email;
      customer_phone = reservation.customer_phone || customer_phone;
    }

    if (isOTA) {
      return {
        ticket_code: ticket.ticket_code,
        product_id: ticket.product_id,
        status: ticket.status,
        entitlements: ticket.entitlements,
        ticket_type: 'OTA',
        source: 'OTA',
        order_id: ticket.ota_order_id,  // OTA 使用 ota_order_id
        batch_id: ticket.batch_id,
        partner_id: ticket.partner_id,
        // Customer information - 预约表优先，票券表兜底
        customer_name: customer_name,
        customer_email: customer_email,
        customer_phone: customer_phone,
        customer_type: ticket.customer_type,
        raw: ticket.raw,
        extra: ticket.extra
      };
    }

    // 小程序票券
    return {
      ticket_code: ticket.ticket_code,
      product_id: ticket.product_id,
      status: ticket.status,
      entitlements: ticket.entitlements,
      ticket_type: 'MINIPROGRAM',
      source: 'MINIPROGRAM',
      order_id: ticket.order_id?.toString(),
      user_id: ticket.user_id,
      channel: ticket.channel,
      // Customer information - 预约表优先，票券表兜底
      customer_name: customer_name,
      customer_email: customer_email,
      customer_phone: customer_phone,
      customer_type: ticket.customer_type,
      travel_date: ticket.travel_date,
      extra: ticket.extra  // 包含 current_jti 用于一码失效验证
    };
  }

  async decrementEntitlement(ticketCode: string, functionCode: string): Promise<boolean> {
    // 统一查询 tickets 表
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code: ticketCode }
    });

    if (!ticket) {
      return false;
    }

    // 根据 channel 选择不同的处理方法
    if (ticket.channel === 'ota') {
      return this.decrementOtaEntitlement(ticket, functionCode);
    } else {
      return this.decrementMiniprogramEntitlement(ticket, functionCode);
    }

    return false;
  }

  /**
   * 核销 OTA 票券权益
   */
  private async decrementOtaEntitlement(
    ticket: TicketEntity,
    functionCode: string
  ): Promise<boolean> {
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

    // If all entitlements are used up, mark ticket as VERIFIED (原 USED)
    if (allUsed) {
      updateData.status = 'VERIFIED' as TicketStatus;
    }

    await this.ticketRepo.update(
      { ticket_code: ticket.ticket_code },
      updateData
    );

    // Update order status if ticket has an ota_order_id
    if (ticket.ota_order_id) {
      await this.updateOrderStatusIfNeeded(ticket.ota_order_id);
    }

    return true;
  }

  /**
   * 核销小程序票券权益
   */
  private async decrementMiniprogramEntitlement(
    ticket: TicketEntity,
    functionCode: string
  ): Promise<boolean> {
    const entitlements = (ticket.entitlements || []) as Array<{
      function_code: string;
      remaining_uses: number;
    }>;

    const entitlementIndex = entitlements.findIndex(
      (e) => e.function_code === functionCode
    );

    if (entitlementIndex === -1) {
      return false;
    }

    if (entitlements[entitlementIndex].remaining_uses <= 0) {
      return false;
    }

    // Decrement remaining_uses
    entitlements[entitlementIndex].remaining_uses -= 1;

    // Check if all entitlements are fully used
    const allUsed = entitlements.every((e) => e.remaining_uses === 0);

    // Update the ticket in database
    const updateData: Partial<TicketEntity> = {
      entitlements: entitlements as any
    };

    // If all entitlements are used up, mark ticket as VERIFIED (已核销)
    if (allUsed) {
      updateData.status = 'VERIFIED';
      updateData.verified_at = new Date();
    }

    await this.ticketRepo.update(
      { ticket_code: ticket.ticket_code },
      updateData
    );

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
    // Get all OTA tickets for this order
    const tickets = await this.ticketRepo.find({
      where: { ota_order_id: orderId, channel: 'ota' }
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

  async findAllVenues(options: { includeInactive?: boolean; partnerId?: string } = {}): Promise<Venue[]> {
    const { includeInactive = false, partnerId } = options;

    const where: any = {};
    if (!includeInactive) {
      where.is_active = true;
    }
    // If partnerId provided, filter by it; otherwise return all
    if (partnerId) {
      where.partner_id = partnerId;
    }

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

  async deleteVenue(venueId: number): Promise<boolean> {
    // Soft delete using TypeORM's built-in mechanism
    const result = await this.venueRepo.softDelete(venueId);
    return (result.affected ?? 0) > 0;
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
    // Only set success_unique_key for success records to enforce uniqueness
    // NULL for reject records allows multiple reject attempts with same jti
    const successUniqueKey = redemptionData.result === 'success'
      ? `${redemptionData.jti}_${redemptionData.functionCode}`
      : null;

    const event = this.redemptionRepo.create({
      ticket_code: redemptionData.ticketCode,
      function_code: redemptionData.functionCode,
      venue_id: redemptionData.venueId,
      operator_id: redemptionData.operatorId,
      session_code: redemptionData.sessionCode,
      terminal_device_id: redemptionData.terminalDeviceId,
      jti: redemptionData.jti,
      success_unique_key: successUniqueKey,
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
      ferryCount,
      giftCount,
      tokensCount,
      parkAdmissionCount
    ] = await Promise.all([
      query.clone().getCount(),
      query.clone().andWhere('re.result = :result', { result: 'success' }).getCount(),
      query.clone().andWhere('re.reason IN (:...fraudReasons)', {
        fraudReasons: ['ALREADY_REDEEMED', 'DUPLICATE_JTI']
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'ferry', result: 'success'
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'gift', result: 'success'
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'tokens', result: 'success'
      }).getCount(),
      query.clone().andWhere('re.function_code = :func AND re.result = :result', {
        func: 'park_admission', result: 'success'
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
          ferry: ferryCount,
          gift: giftCount,
          tokens: tokensCount,
          park_admission: parkAdmissionCount
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

  /**
   * 根据产品 ID 获取产品名称
   */
  async getProductNameById(productId: number): Promise<string | null> {
    if (!productId) return null;

    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['name']
    });

    return product?.name || null;
  }

  /**
   * 获取票券的预订时间信息
   * @param ticketCode 票券编号
   * @returns 预订时间信息 { slot_date, slot_time } 或 null
   */
  async getTicketReservationSlot(ticketCode: string): Promise<{
    slot_date: string | null;
    slot_time: string | null;
  } | null> {
    // 统一查询 ticket_reservations 表（支持小程序和 OTA）
    // 小程序：通过 ticket 关联查询
    // OTA：通过 ota_ticket_code 直接查询
    const reservation = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.slot', 'slot')
      .leftJoin('r.ticket', 'ticket')
      .where('r.ota_ticket_code = :ticketCode', { ticketCode })
      .orWhere('ticket.ticket_code = :ticketCode', { ticketCode })
      .getOne();

    if (reservation && reservation.slot) {
      return {
        slot_date: reservation.slot.date,
        slot_time: reservation.slot.start_time && reservation.slot.end_time
          ? `${reservation.slot.start_time} - ${reservation.slot.end_time}`
          : reservation.slot.start_time || null
      };
    }

    // 回退：查询 tickets 表的 travel_date
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code: ticketCode },
      select: ['travel_date']
    });

    if (ticket?.travel_date) {
      return {
        slot_date: ticket.travel_date instanceof Date
          ? ticket.travel_date.toISOString().split('T')[0]
          : String(ticket.travel_date),
        slot_time: null
      };
    }

    return null;
  }
}