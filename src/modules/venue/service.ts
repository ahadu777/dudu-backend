import { AppDataSource } from '../../config/database';
import { VenueRepository } from './domain/venue.repository';
import { mockStore } from '../../core/mock/store';
import { dataSourceConfig } from '../../config/data-source';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

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

  /**
   * Detect QR code format
   * @param qrToken - QR token string
   * @returns 'ENCRYPTED' for new encrypted format, 'JWT' for old format, 'UNKNOWN' otherwise
   */
  private detectQRFormat(qrToken: string): 'ENCRYPTED' | 'JWT' | 'UNKNOWN' {
    // Encrypted format: iv:encrypted:authTag:signature (4 parts separated by colons)
    if (qrToken.split(':').length >= 4) {
      return 'ENCRYPTED';
    }
    // JWT format: header.payload.signature (3 parts separated by dots)
    if (qrToken.split('.').length === 3) {
      return 'JWT';
    }
    return 'UNKNOWN';
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
    sessionCode?: string;
    terminalDeviceId?: string;
  }): Promise<VenueOperationsResponse> {
    const startTime = Date.now();

    logger.info('venue.scan.started', {
      function_code: request.functionCode,
      terminal_device: request.terminalDeviceId
    });

    try {
      // 1. Parse and verify QR token (support both encrypted and JWT formats)
      let ticketCode: string;
      let jti: string;

      // Detect QR format: encrypted (4+ colons) or JWT (2 dots)
      const qrFormat = this.detectQRFormat(request.qrToken);

      if (qrFormat === 'ENCRYPTED') {
        // New encrypted format: use decryptAndVerifyQR
        try {
          const { decryptAndVerifyQR } = await import('../../utils/qr-crypto');
          const decryptResult = await decryptAndVerifyQR(request.qrToken);

          if (decryptResult.is_expired) {
            const response = this.createRejectResponse('QR_EXPIRED', startTime, {
              function_code: request.functionCode
            });
            await this.recordRedemptionAttempt(request, null, 'reject', 'QR_EXPIRED');
            return response;
          }

          ticketCode = decryptResult.data.ticket_code;
          jti = decryptResult.data.jti;

        } catch (decryptError) {
          const errorMsg = decryptError instanceof Error ? decryptError.message : 'Unknown';
          const reason = errorMsg.includes('QR_SIGNATURE_INVALID') ? 'QR_TAMPERED' : 'QR_INVALID';

          const response = this.createRejectResponse(reason, startTime, {
            function_code: request.functionCode
          });
          await this.recordRedemptionAttempt(request, null, 'reject', reason);
          return response;
        }

      } else if (qrFormat === 'JWT') {
        // Old JWT format: maintain backward compatibility
        try {
          const tokenPayload = jwt.verify(request.qrToken, env.QR_SIGNER_SECRET) as any;
          ticketCode = tokenPayload.tid;
          jti = tokenPayload.jti;
        } catch (jwtError) {
          const response = this.createRejectResponse('TOKEN_EXPIRED', startTime, {
            function_code: request.functionCode
          });
          await this.recordRedemptionAttempt(request, null, 'reject', 'TOKEN_EXPIRED');
          return response;
        }

      } else {
        // Unknown format
        const response = this.createRejectResponse('QR_FORMAT_INVALID', startTime, {
          function_code: request.functionCode
        });
        await this.recordRedemptionAttempt(request, null, 'reject', 'QR_FORMAT_INVALID');
        return response;
      }

      if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
        return this.handleDatabaseModeValidation(request, ticketCode, jti, startTime);
      } else {
        return this.handleMockModeValidation(request, ticketCode, jti, startTime);
      }

    } catch (error) {
      logger.error('venue.scan.error', {
        function_code: request.functionCode,
        error: (error as Error).message
      });

      return this.createRejectResponse('INTERNAL_ERROR', startTime, {
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

    logger.info('venue.scan.database_mode', {
      ticket_code: ticketCode,
      function_code: request.functionCode
    });

    // Get session info if available (session_code is optional)
    // Default to venue_id=0 for tickets scanned without session context
    let venueId: number = 0;
    let operatorId: number = 0;
    let sessionCode: string = '';

    if (request.sessionCode) {
      const session = await repo.findActiveSession(request.sessionCode);
      if (session) {
        venueId = session.venue_id;
        operatorId = session.operator_id;
        sessionCode = session.session_code;
      }
    }

    // CRITICAL: Cross-terminal fraud detection (JTI replay attack prevention)
    // Check if this JTI has been used for this specific function
    const jtiAlreadyUsedForFunction = await repo.hasJtiBeenUsedForFunction(jti, request.functionCode);
    if (jtiAlreadyUsedForFunction) {
      logger.info('venue.scan.fraud_detected', {
        jti,
        ticket_code: ticketCode,
        function_code: request.functionCode,
        reason: 'Same JTI already used for this function'
      });

      // Record fraud attempt
      await repo.recordRedemption({
        ticketCode,
        functionCode: request.functionCode,
        venueId,
        operatorId,
        sessionCode,
        terminalDeviceId: request.terminalDeviceId,
        jti,
        result: 'reject',
        reason: 'ALREADY_REDEEMED'
      });

      return this.createRejectResponse('ALREADY_REDEEMED', startTime, {
        fraud_detected: true
      });
    }

    // Fetch ticket from database (OTA tickets from pre_generated_tickets table)
    let ticket = await repo.getTicketByCode(ticketCode);

    if (!ticket) {
      logger.info('venue.scan.ticket_not_found_in_db', { ticket_code: ticketCode });

      // Record failed attempt
      await repo.recordRedemption({
        ticketCode,
        functionCode: request.functionCode,
        venueId,
        operatorId,
        sessionCode,
        terminalDeviceId: request.terminalDeviceId,
        jti,
        result: 'reject',
        reason: 'TICKET_NOT_FOUND'
      });

      return this.createRejectResponse('TICKET_NOT_FOUND', startTime, request);
    }

    logger.info('venue.scan.ticket_found_in_db', {
      ticket_code: ticketCode,
      status: ticket.status,
      ticket_type: ticket.ticket_type
    });

    // SECURITY: Validate JTI matches ticket's current_jti (for OTA tickets with raw field)
    const ticketRaw = (ticket as any).raw;
    if (ticketRaw && ticketRaw.jti) {
      const currentJti = ticketRaw.jti.current_jti;
      const preGeneratedJti = ticketRaw.jti.pre_generated_jti;

      if (currentJti && currentJti !== jti) {
        // Special case: PRE_GENERATED tickets can accept new JTI (for testing/first-use scenarios)
        if (ticket.status === 'PRE_GENERATED' || ticket.status === 'ACTIVE') {
          logger.info('venue.scan.jti_update_allowed', {
            ticket_code: ticketCode,
            old_jti: currentJti,
            new_jti: jti,
            status: ticket.status,
            reason: 'PRE_GENERATED/ACTIVE ticket allows JTI update on first redemption'
          });
          // Continue with redemption - JTI will be updated in ticket record
        } else {
          logger.warn('venue.scan.jti_mismatch', {
            ticket_code: ticketCode,
            qr_jti: jti,
            ticket_current_jti: currentJti,
            is_old_pre_generated: jti === preGeneratedJti
          });

          const reason = jti === preGeneratedJti ? 'QR_CODE_OUTDATED' : 'JTI_MISMATCH';
          const message = jti === preGeneratedJti
            ? 'Old pre-generated QR code detected. Please use the QR code received after activation.'
            : 'QR code does not match current ticket JTI.';

          // Record JTI mismatch attempt
          await repo.recordRedemption({
            ticketCode,
            functionCode: request.functionCode,
            venueId,
            operatorId,
            sessionCode,
            terminalDeviceId: request.terminalDeviceId,
            jti,
            result: 'reject',
            reason
          });

          return this.createRejectResponse(reason as any, startTime, {
            ...request,
            message,
            hint: jti === preGeneratedJti ? 'REFRESH_QR_CODE' : undefined
          });
        }
      }
    }

    // Function validation
    const entitlement = ticket.entitlements.find((e: { function_code: string; remaining_uses: number }) => e.function_code === request.functionCode);
    if (!entitlement) {
      // Record wrong function attempt
      await repo.recordRedemption({
        ticketCode,
        functionCode: request.functionCode,
        venueId,
        operatorId,
        sessionCode,
        terminalDeviceId: request.terminalDeviceId,
        jti,
        result: 'reject',
        reason: 'WRONG_FUNCTION'
      });

      return this.createRejectResponse('WRONG_FUNCTION', startTime, request);
    }

    // Check remaining uses
    if (entitlement.remaining_uses <= 0) {
      // Record no remaining uses attempt
      await repo.recordRedemption({
        ticketCode,
        functionCode: request.functionCode,
        venueId,
        operatorId,
        sessionCode,
        terminalDeviceId: request.terminalDeviceId,
        jti,
        result: 'reject',
        reason: 'NO_REMAINING',
        remainingUsesAfter: 0
      });

      return this.createRejectResponse('NO_REMAINING', startTime, request);
    }

    // SUCCESS: Process redemption (update database)
    const success = await repo.decrementEntitlement(ticketCode, request.functionCode);
    if (!success) {
      return this.createRejectResponse('INTERNAL_ERROR', startTime, request);
    }

    const remainingUsesAfter = entitlement.remaining_uses - 1;

    // CRITICAL: Record successful redemption event
    await repo.recordRedemption({
      ticketCode,
      functionCode: request.functionCode,
      venueId,
      operatorId,
      sessionCode,
      terminalDeviceId: request.terminalDeviceId,
      jti,
      result: 'success',
      remainingUsesAfter
    });

    if (venueId === 0) {
      logger.info('venue.scan.no_session_context', {
        ticket_code: ticketCode,
        message: 'Redemption recorded with default venue_id=0 (no session provided)'
      });
    }

    // Fetch updated ticket from database
    const updatedTicket = await repo.getTicketByCode(ticketCode);
    const responseTime = Date.now() - startTime;

    logger.info('venue.scan.success', {
      ticket_code: ticketCode,
      function_code: request.functionCode,
      response_time_ms: responseTime,
      remaining_uses: remainingUsesAfter
    });

    return {
      result: 'success',
      ticket_status: updatedTicket?.status || 'unknown',
      entitlements: updatedTicket?.entitlements || [],
      remaining_uses: remainingUsesAfter,
      performance_metrics: {
        response_time_ms: responseTime,
        fraud_checks_passed: true
      },
      ts: new Date().toISOString()
    };
  }

  private async handleMockModeValidation(
    request: any,
    ticketCode: string,
    jti: string,
    startTime: number
  ): Promise<VenueOperationsResponse> {
    logger.warn('venue.scan.mock_mode', { ticket_code: ticketCode });

    // JTI replay attack prevention
    if (jti && mockStore.hasJti(jti)) {
      return this.createRejectResponse('ALREADY_REDEEMED', startTime, { fraud_detected: true });
    }

    const ticket = mockStore.getTicket(ticketCode);
    if (!ticket) {
      return this.createRejectResponse('TICKET_NOT_FOUND', startTime, request);
    }

    // SECURITY: Validate JTI matches ticket's current_jti (for OTA tickets with raw field)
    const ticketRaw = (ticket as any).raw;
    if (ticketRaw && ticketRaw.jti) {
      const currentJti = ticketRaw.jti.current_jti;
      const preGeneratedJti = ticketRaw.jti.pre_generated_jti;

      if (currentJti && currentJti !== jti) {
        logger.warn('venue.scan.jti_mismatch_mock', {
          ticket_code: ticketCode,
          qr_jti: jti,
          ticket_current_jti: currentJti,
          is_old_pre_generated: jti === preGeneratedJti
        });

        const reason = jti === preGeneratedJti ? 'QR_CODE_OUTDATED' : 'JTI_MISMATCH';
        const message = jti === preGeneratedJti
          ? 'Old pre-generated QR code detected. Please use the QR code received after activation.'
          : 'QR code does not match current ticket JTI.';

        return this.createRejectResponse(reason as any, startTime, {
          ...request,
          message,
          hint: jti === preGeneratedJti ? 'REFRESH_QR_CODE' : undefined
        });
      }
    }

    const entitlement = ticket.entitlements.find(e => e.function_code === request.functionCode);
    if (!entitlement || entitlement.remaining_uses <= 0) {
      return this.createRejectResponse(entitlement ? 'NO_REMAINING' : 'WRONG_FUNCTION', startTime, request);
    }

    // SUCCESS in mock mode
    const success = mockStore.decrementEntitlement(ticketCode, request.functionCode);
    if (!success) {
      return this.createRejectResponse('INTERNAL_ERROR', startTime, request);
    }

    const responseTime = Date.now() - startTime;

    return {
      result: 'success',
      ticket_status: ticket.status,
      entitlements: ticket.entitlements,
      remaining_uses: entitlement.remaining_uses - 1,
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