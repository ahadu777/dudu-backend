import { AppDataSource } from '../../config/database';
import { VenueRepository } from './domain/venue.repository';
import { mockStore } from '../../core/mock/store';
import { dataSourceConfig } from '../../config/data-source';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { getFunctionType, isUnlimited, isSingleUse, isCounted } from './domain/function-types';
import { translateFunctionCode, requiresLocationValidation, getRequiredVenueCode } from './utils/function-mapper';
import { RedemptionEvent } from './domain/redemption-event.entity';
import { ScanResult } from '../../types/domain';

export interface VenueOperationsResponse {
  result: 'success' | 'reject';
  ticket_status?: string;
  entitlements?: any[];
  reason?: string;
  remaining_uses?: number;
  venue_info?: {
    venue_code: string;
    venue_name: string;
    terminal_device?: string;
  };
  performance_metrics?: {
    response_time_ms: number;
    fraud_checks_passed: boolean;
  };
  ts: string;
}

export interface VenueSessionResponse {
  session_code: string;
  venue_code: string;
  venue_name: string;
  operator_name: string;
  expires_at: string;
  supported_functions: string[];
}

export class VenueOperationsService {
  private venueRepository: VenueRepository | null = null;

  private async getRepository(): Promise<VenueRepository> {
    if (!this.venueRepository) {
      if (AppDataSource.isInitialized) {
        this.venueRepository = new VenueRepository(AppDataSource);
      } else {
        throw new Error('Database not initialized');
      }
    }
    return this.venueRepository;
  }

  private async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.getRepository();
      return true;
    } catch {
      return false;
    }
  }

  // Create venue operator session (replaces basic operator login)
  async createVenueSession(sessionData: {
    venueCode: string;
    operatorId: number;
    operatorName: string;
    terminalDeviceId?: string;
    durationHours?: number;
  }): Promise<VenueSessionResponse | null> {
    logger.info('venue.session.create.started', sessionData);

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database mode: Full venue operations
      const repo = await this.getRepository();

      const session = await repo.createVenueSession({
        venueCode: sessionData.venueCode,
        operatorId: sessionData.operatorId,
        operatorName: sessionData.operatorName,
        terminalDeviceId: sessionData.terminalDeviceId,
        durationSeconds: (sessionData.durationHours || 8) * 3600
      });

      if (!session) {
        throw new Error(`Venue ${sessionData.venueCode} not found`);
      }

      const venue = await repo.findVenueByCode(sessionData.venueCode);
      const expiresAt = new Date(session.started_at.getTime() + (session.session_duration_seconds * 1000));

      logger.info('venue.session.create.success', {
        session_code: session.session_code,
        venue_code: sessionData.venueCode,
        operator_id: sessionData.operatorId
      });

      return {
        session_code: session.session_code,
        venue_code: sessionData.venueCode,
        venue_name: venue?.venue_name || sessionData.venueCode,
        operator_name: sessionData.operatorName,
        expires_at: expiresAt.toISOString(),
        supported_functions: venue?.supported_functions || ['ferry_boarding', 'gift_redemption', 'playground_token']
      };

    } else {
      // Fallback to enhanced mock mode
      logger.warn('venue.session.fallback_to_mock', { reason: 'database_unavailable' });

      const sessionCode = `VS-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + (sessionData.durationHours || 8) * 3600 * 1000);

      // Enhanced mock store with venue context
      const mockSession = {
        session_id: sessionCode,
        operator_id: sessionData.operatorId,
        device_id: sessionData.terminalDeviceId || 'mock-device',
        location_id: null, // Use null for mock mode
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };
      mockStore.createSession(mockSession);

      return {
        session_code: sessionCode,
        venue_code: sessionData.venueCode,
        venue_name: this.getVenueDisplayName(sessionData.venueCode),
        operator_name: sessionData.operatorName,
        expires_at: expiresAt.toISOString(),
        supported_functions: this.getVenueFunctions(sessionData.venueCode)
      };
    }
  }

  // Enhanced scanning with venue operations and fraud prevention
  async validateAndRedeem(request: {
    qrToken: string;
    functionCode: string;
    sessionCode: string;
    terminalDeviceId?: string;
  }): Promise<VenueOperationsResponse> {
    const startTime = Date.now();
    logger.info('venue.scan.started', {
      function_code: request.functionCode,
      session_code: request.sessionCode,
      terminal_device: request.terminalDeviceId
    });

    try {
      // 1. Parse and verify QR token
      let tokenPayload;
      try {
        tokenPayload = jwt.verify(request.qrToken, env.QR_SIGNER_SECRET) as any;
      } catch (jwtError) {
        const response = this.createRejectResponse('TOKEN_EXPIRED', startTime, {
          session_code: request.sessionCode,
          function_code: request.functionCode
        });
        await this.recordRedemptionAttempt(request, null, 'reject', 'TOKEN_EXPIRED');
        return response;
      }

      const { tid: ticketCode, jti } = tokenPayload;

      if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
        return this.handleDatabaseModeValidation(request, ticketCode, jti, startTime);
      } else {
        return this.handleMockModeValidation(request, ticketCode, jti, startTime);
      }

    } catch (error) {
      logger.error('venue.scan.error', {
        function_code: request.functionCode,
        session_code: request.sessionCode,
        error: (error as Error).message
      });

      return this.createRejectResponse('INTERNAL_ERROR', startTime, {
        session_code: request.sessionCode,
        function_code: request.functionCode
      });
    }
  }

  private async handleDatabaseModeValidation(
    request: any,
    ticketCode: string,
    jti: string,
    startTime: number
  ): Promise<VenueOperationsResponse> {
    const repo = await this.getRepository();
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 1. Validate session with venue context (outside transaction for read)
      const session = await repo.findActiveSession(request.sessionCode);
      if (!session) {
        await queryRunner.rollbackTransaction();
        const response = this.createRejectResponse('INVALID_SESSION', startTime, request);
        await this.recordRedemptionAttempt(request, ticketCode, 'reject', 'INVALID_SESSION');
        return response;
      }

      // 2. CRITICAL: Cross-terminal fraud detection with pessimistic locking (atomic)
      const jtiAlreadyUsed = await queryRunner.manager
        .createQueryBuilder(RedemptionEvent, 're')
        .setLock('pessimistic_write')
        .where('re.jti = :jti', { jti })
        .getOne();

      if (jtiAlreadyUsed) {
        await queryRunner.rollbackTransaction();
        
        logger.info('venue.scan.fraud_detected', {
          jti,
          ticket_code: ticketCode,
          venue_code: session.venue.venue_code,
          function_code: request.functionCode
        });

        await repo.recordRedemption({
          ticketCode,
          functionCode: request.functionCode,
          venueId: session.venue_id,
          operatorId: session.operator_id,
          sessionCode: request.sessionCode,
          terminalDeviceId: request.terminalDeviceId,
          jti,
          result: 'reject',
          reason: 'DUPLICATE_JTI'
        });

        return this.createRejectResponse('ALREADY_REDEEMED', startTime, {
          session_code: request.sessionCode,
          venue_code: session.venue.venue_code,
          fraud_detected: true
        });
      }

      // 3. Translate function code from product code to PRD-003 standard
      const translatedFunctionCode = translateFunctionCode(request.functionCode);
      const functionType = getFunctionType(translatedFunctionCode);

      // 4. Location-specific validation (tea_set only at cheung-chau)
      if (requiresLocationValidation(translatedFunctionCode)) {
        const requiredVenue = getRequiredVenueCode(translatedFunctionCode);
        if (requiredVenue && session.venue.venue_code !== requiredVenue) {
          await queryRunner.rollbackTransaction();
          await repo.recordRedemption({
            ticketCode,
            functionCode: translatedFunctionCode,
            venueId: session.venue_id,
            operatorId: session.operator_id,
            sessionCode: request.sessionCode,
            terminalDeviceId: request.terminalDeviceId,
            jti,
            result: 'reject',
            reason: 'WRONG_LOCATION'
          });
          return this.createRejectResponse('WRONG_LOCATION', startTime, {
            ...request,
            required_venue: requiredVenue,
            actual_venue: session.venue.venue_code
          });
        }
      }

      // 5. Check venue supports function code
      if (session.venue.supported_functions && 
          !session.venue.supported_functions.includes(translatedFunctionCode)) {
        await queryRunner.rollbackTransaction();
        await repo.recordRedemption({
          ticketCode,
          functionCode: translatedFunctionCode,
          venueId: session.venue_id,
          operatorId: session.operator_id,
          sessionCode: request.sessionCode,
          terminalDeviceId: request.terminalDeviceId,
          jti,
          result: 'reject',
          reason: 'WRONG_FUNCTION'
        });
        return this.createRejectResponse('WRONG_FUNCTION', startTime, {
          ...request,
          venue_supports: session.venue.supported_functions,
          requested_function: translatedFunctionCode
        });
      }

      // 6. Validate ticket (fallback to mock for ticket data - Phase 3.3 will fix this)
      const ticket = mockStore.getTicket(ticketCode);
      if (!ticket) {
        await queryRunner.rollbackTransaction();
        await repo.recordRedemption({
          ticketCode,
          functionCode: translatedFunctionCode,
          venueId: session.venue_id,
          operatorId: session.operator_id,
          sessionCode: request.sessionCode,
          terminalDeviceId: request.terminalDeviceId,
          jti,
          result: 'reject',
          reason: 'TICKET_NOT_FOUND'
        });
        return this.createRejectResponse('TICKET_NOT_FOUND', startTime, request);
      }

      // 7. Find entitlement (check both original and translated function codes)
      let entitlement = ticket.entitlements.find(e => e.function_code === request.functionCode);
      if (!entitlement) {
        entitlement = ticket.entitlements.find(e => e.function_code === translatedFunctionCode);
      }
      
      if (!entitlement) {
        await queryRunner.rollbackTransaction();
        await repo.recordRedemption({
          ticketCode,
          functionCode: translatedFunctionCode,
          venueId: session.venue_id,
          operatorId: session.operator_id,
          sessionCode: request.sessionCode,
          terminalDeviceId: request.terminalDeviceId,
          jti,
          result: 'reject',
          reason: 'WRONG_FUNCTION'
        });
        return this.createRejectResponse('WRONG_FUNCTION', startTime, request);
      }

      // 8. Multi-function validation logic based on function type
      let shouldAllow = false;
      let remainingUsesAfter: number | null = null;
      let rejectReason: string | null = null;

      if (isUnlimited(translatedFunctionCode)) {
        // UNLIMITED (ferry boarding): Always allow, don't check remaining_uses, don't decrement
        shouldAllow = true;
        remainingUsesAfter = entitlement.remaining_uses; // Unchanged
      } else if (isSingleUse(translatedFunctionCode)) {
        // SINGLE_USE (gift redemption): Check redemption history, not remaining_uses
        // Check within transaction using queryRunner for consistency
        const redemptionCount = await queryRunner.manager.count(RedemptionEvent, {
          where: {
            ticket_code: ticketCode,
            function_code: translatedFunctionCode,
            result: 'success'
          }
        });
        const alreadyRedeemed = redemptionCount > 0;
        
        if (alreadyRedeemed) {
          shouldAllow = false;
          rejectReason = 'ALREADY_REDEEMED';
        } else {
          shouldAllow = true;
          remainingUsesAfter = entitlement.remaining_uses; // Don't decrement for single-use
        }
      } else if (isCounted(translatedFunctionCode)) {
        // COUNTED (playground tokens): Check remaining_uses and decrement
        if (entitlement.remaining_uses <= 0) {
          shouldAllow = false;
          rejectReason = 'NO_REMAINING';
        } else {
          shouldAllow = true;
          remainingUsesAfter = entitlement.remaining_uses - 1;
          // Decrement in mock store (Phase 3.3 will move to database)
          mockStore.decrementEntitlement(ticketCode, request.functionCode);
        }
      } else {
        // Fallback: treat as counted
        if (entitlement.remaining_uses <= 0) {
          shouldAllow = false;
          rejectReason = 'NO_REMAINING';
        } else {
          shouldAllow = true;
          remainingUsesAfter = entitlement.remaining_uses - 1;
          mockStore.decrementEntitlement(ticketCode, request.functionCode);
        }
      }

      // 9. Record redemption result (success or reject) within transaction
      if (!shouldAllow) {
        await queryRunner.manager.save(RedemptionEvent, {
          ticket_code: ticketCode,
          function_code: translatedFunctionCode,
          venue_id: session.venue_id,
          operator_id: session.operator_id,
          session_code: request.sessionCode,
          terminal_device_id: request.terminalDeviceId,
          jti,
          result: 'reject',
          reason: rejectReason || 'VALIDATION_FAILED',
          remaining_uses_after: undefined, // Use undefined instead of null
          redeemed_at: new Date(),
          additional_data: {
            venue_code: session.venue.venue_code,
            venue_name: session.venue.venue_name,
            function_type: functionType
          }
        });

        await queryRunner.commitTransaction();
        return this.createRejectResponse(rejectReason || 'VALIDATION_FAILED', startTime, request);
      }

      // 10. SUCCESS: Record successful redemption within transaction
      await queryRunner.manager.save(RedemptionEvent, {
        ticket_code: ticketCode,
        function_code: translatedFunctionCode,
        venue_id: session.venue_id,
        operator_id: session.operator_id,
        session_code: request.sessionCode,
        terminal_device_id: request.terminalDeviceId,
        jti,
        result: 'success',
        remaining_uses_after: remainingUsesAfter ?? undefined, // Convert null to undefined
        redeemed_at: new Date(),
        additional_data: {
          venue_code: session.venue.venue_code,
          venue_name: session.venue.venue_name,
          function_type: functionType,
          original_function_code: request.functionCode
        }
      });

      await queryRunner.commitTransaction();

      const updatedTicket = mockStore.getTicket(ticketCode);
      const responseTime = Date.now() - startTime;

      logger.info('venue.scan.success', {
        ticket_code: ticketCode,
        function_code: translatedFunctionCode,
        original_function_code: request.functionCode,
        function_type: functionType,
        venue_code: session.venue.venue_code,
        response_time_ms: responseTime,
        remaining_uses: remainingUsesAfter
      });

      return {
        result: 'success',
        ticket_status: updatedTicket?.status || 'unknown',
        entitlements: updatedTicket?.entitlements || [],
        remaining_uses: remainingUsesAfter ?? undefined,
        venue_info: {
          venue_code: session.venue.venue_code,
          venue_name: session.venue.venue_name,
          terminal_device: request.terminalDeviceId
        },
        performance_metrics: {
          response_time_ms: responseTime,
          fraud_checks_passed: true
        },
        ts: new Date().toISOString()
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('venue.scan.transaction_error', {
        ticket_code: ticketCode,
        jti,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return this.createRejectResponse('INTERNAL_ERROR', startTime, request);
    } finally {
      await queryRunner.release();
    }
  }

  private async handleMockModeValidation(
    request: any,
    ticketCode: string,
    jti: string,
    startTime: number
  ): Promise<VenueOperationsResponse> {
    // Enhanced mock mode with venue context and multi-function validation
    logger.warn('venue.scan.mock_mode', { session_code: request.sessionCode });

    // Use existing mock validation logic but with venue enhancements
    if (!mockStore.isSessionValid(request.sessionCode)) {
      return this.createRejectResponse('INVALID_SESSION', startTime, request);
    }

    if (jti && mockStore.hasJti(jti)) {
      return this.createRejectResponse('ALREADY_REDEEMED', startTime, { ...request, fraud_detected: true });
    }

    const ticket = mockStore.getTicket(ticketCode);
    if (!ticket) {
      return this.createRejectResponse('TICKET_NOT_FOUND', startTime, request);
    }

    // Translate function code
    const translatedFunctionCode = translateFunctionCode(request.functionCode);
    
    // Find entitlement (check both original and translated codes)
    let entitlement = ticket.entitlements.find(e => e.function_code === request.functionCode);
    if (!entitlement) {
      entitlement = ticket.entitlements.find(e => e.function_code === translatedFunctionCode);
    }
    
    if (!entitlement) {
      return this.createRejectResponse('WRONG_FUNCTION', startTime, request);
    }

    // Multi-function validation logic (same as database mode)
    let shouldAllow = false;
    let remainingUsesAfter: number | null = null;
    let rejectReason: string | null = null;

    if (isUnlimited(translatedFunctionCode)) {
      // UNLIMITED: Always allow, don't decrement
      shouldAllow = true;
      remainingUsesAfter = entitlement.remaining_uses;
    } else if (isSingleUse(translatedFunctionCode)) {
      // SINGLE_USE: Check if already redeemed in mock store
      // Extract ticket_id from ticket_code (format: TKT-USER-PRODUCT)
      const ticketIdMatch = ticketCode.match(/TKT-\d+-(\d+)/);
      const ticketId = ticketIdMatch ? parseInt(ticketIdMatch[1]) : 0;
      
      const redemptions = mockStore.getRedemptions({ ticket_id: ticketId });
      const alreadyRedeemed = redemptions.some(r => 
        (r.function_code === translatedFunctionCode || r.function_code === request.functionCode) && 
        r.result === 'success'
      );
      
      if (alreadyRedeemed) {
        shouldAllow = false;
        rejectReason = 'ALREADY_REDEEMED';
      } else {
        shouldAllow = true;
        remainingUsesAfter = entitlement.remaining_uses; // Don't decrement
      }
    } else if (isCounted(translatedFunctionCode)) {
      // COUNTED: Check remaining_uses and decrement
      if (entitlement.remaining_uses <= 0) {
        shouldAllow = false;
        rejectReason = 'NO_REMAINING';
      } else {
        shouldAllow = true;
        remainingUsesAfter = entitlement.remaining_uses - 1;
        mockStore.decrementEntitlement(ticketCode, request.functionCode);
      }
    } else {
      // Fallback: treat as counted
      if (entitlement.remaining_uses <= 0) {
        shouldAllow = false;
        rejectReason = 'NO_REMAINING';
      } else {
        shouldAllow = true;
        remainingUsesAfter = entitlement.remaining_uses - 1;
        mockStore.decrementEntitlement(ticketCode, request.functionCode);
      }
    }

    if (!shouldAllow) {
      return this.createRejectResponse(rejectReason || 'VALIDATION_FAILED', startTime, request);
    }

    // Record successful redemption in mock store (for single-use validation)
    const ticketIdMatch = ticketCode.match(/TKT-\d+-(\d+)/);
    const ticketId = ticketIdMatch ? parseInt(ticketIdMatch[1]) : 0;
    mockStore.addRedemption({
      ticket_id: ticketId,
      function_code: translatedFunctionCode,
      operator_id: 0, // Mock mode
      session_id: request.sessionCode,
      location_id: null,
      jti: jti || null,
      result: ScanResult.SUCCESS,
      reason: null,
      ts: new Date().toISOString()
    });

    // SUCCESS in mock mode
    const session = mockStore.getSession(request.sessionCode);
    const responseTime = Date.now() - startTime;

    return {
      result: 'success',
      ticket_status: ticket.status,
      entitlements: ticket.entitlements,
      remaining_uses: remainingUsesAfter ?? undefined,
      venue_info: {
        venue_code: 'mock-venue',
        venue_name: this.getVenueDisplayName('mock-venue'),
        terminal_device: request.terminalDeviceId
      },
      performance_metrics: {
        response_time_ms: responseTime,
        fraud_checks_passed: true
      },
      ts: new Date().toISOString()
    };
  }

  private createRejectResponse(reason: string, startTime: number, context: any): VenueOperationsResponse {
    return {
      result: 'reject',
      reason,
      performance_metrics: {
        response_time_ms: Date.now() - startTime,
        fraud_checks_passed: reason !== 'ALREADY_REDEEMED'
      },
      ts: new Date().toISOString()
    };
  }

  private async recordRedemptionAttempt(
    request: any,
    ticketCode: string | null,
    result: 'success' | 'reject',
    reason?: string
  ): Promise<void> {
    // Record in mock store for consistency
    mockStore.addRedemption({
      ticket_id: ticketCode ? parseInt(ticketCode.split('-')[2]) || 0 : 0,
      function_code: request.functionCode,
      operator_id: 0, // Will be updated with session info
      session_id: request.sessionCode,
      location_id: request.terminalDeviceId || null,
      jti: null,
      result: result as any,
      reason,
      ts: new Date().toISOString()
    });
  }

  private getVenueDisplayName(venueCode: string): string {
    const venueNames: { [key: string]: string } = {
      'central-pier': 'Central Pier Terminal',
      'cheung-chau': 'Cheung Chau Terminal',
      'gift-shop-central': 'Central Pier Gift Shop',
      'gift-shop-cc': 'Cheung Chau Gift Shop',
      'playground-cc': 'Cheung Chau Playground'
    };
    return venueNames[venueCode] || venueCode;
  }

  private getVenueFunctions(venueCode: string): string[] {
    const venueFunctions: { [key: string]: string[] } = {
      'central-pier': ['ferry_boarding'],
      'cheung-chau': ['ferry_boarding', 'gift_redemption', 'playground_token'],
      'gift-shop-central': ['gift_redemption'],
      'gift-shop-cc': ['gift_redemption'],
      'playground-cc': ['playground_token']
    };
    return venueFunctions[venueCode] || ['ferry_boarding', 'gift_redemption', 'playground_token'];
  }

  // Analytics for PRD-003 success metrics
  async getVenueAnalytics(venueCode: string, hours: number = 24) {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const venue = await repo.findVenueByCode(venueCode);

      if (!venue) {
        throw new Error(`Venue ${venueCode} not found`);
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));

      return repo.getVenueAnalytics(venue.venue_id, startDate, endDate);
    } else {
      // Mock analytics
      return {
        venue_code: venueCode,
        period: { hours },
        metrics: {
          total_scans: Math.floor(Math.random() * 100),
          successful_scans: Math.floor(Math.random() * 80),
          fraud_attempts: Math.floor(Math.random() * 5),
          success_rate: 85 + Math.random() * 10,
          function_breakdown: {
            ferry_boarding: Math.floor(Math.random() * 50),
            gift_redemption: Math.floor(Math.random() * 20),
            playground_token: Math.floor(Math.random() * 30)
          }
        }
      };
    }
  }
}

export const venueOperationsService = new VenueOperationsService();