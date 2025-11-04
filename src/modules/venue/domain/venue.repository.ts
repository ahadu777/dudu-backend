import { DataSource, Repository } from 'typeorm';
import { Venue } from './venue.entity';
import { VenueSession } from './venue-session.entity';
import { RedemptionEvent } from './redemption-event.entity';

export class VenueRepository {
  private venueRepo: Repository<Venue>;
  private sessionRepo: Repository<VenueSession>;
  private redemptionRepo: Repository<RedemptionEvent>;

  constructor(dataSource: DataSource) {
    this.venueRepo = dataSource.getRepository(Venue);
    this.sessionRepo = dataSource.getRepository(VenueSession);
    this.redemptionRepo = dataSource.getRepository(RedemptionEvent);
  }

  // Venue Management
  async findVenueByCode(venueCode: string): Promise<Venue | null> {
    return this.venueRepo.findOne({ where: { venue_code: venueCode, is_active: true } });
  }

  async createVenue(venueData: Partial<Venue>): Promise<Venue> {
    const venue = this.venueRepo.create(venueData);
    return this.venueRepo.save(venue);
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
  async hasJtiBeenUsed(jti: string): Promise<boolean> {
    const count = await this.redemptionRepo.count({ where: { jti } });
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
}