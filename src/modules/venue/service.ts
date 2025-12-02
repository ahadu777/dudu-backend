import { AppDataSource } from '../../config/database';
import { VenueRepository } from './domain/venue.repository';
import { logger } from '../../utils/logger';
import { decryptAndVerifyQR } from '../../utils/qr-crypto';

// ============================================================================
// Type Definitions
// ============================================================================

interface Entitlement {
  function_code: string;
  remaining_uses: number;
}

/**
 * 操作员信息（从JWT中间件注入）
 */
interface OperatorInfo {
  operator_id: number;
  username: string;
  roles: string[];
}

/**
 * 核销请求参数
 */
interface ValidationRequest {
  qrToken: string;
  functionCode: string;
  venueCode?: string;  // 可选的场馆代码（新增 2025-11-25）
  operator: OperatorInfo;
}

/**
 * 核销响应
 */
export interface VenueOperationsResponse {
  result: 'success' | 'reject';
  ticket_status?: string;
  entitlements?: Entitlement[];
  reason?: string;
  remaining_uses?: number;
  operator_info?: {
    operator_id: number;
    username: string;
  };
  venue_info?: {
    venue_code: string;
    venue_name: string;
    terminal_device?: string;
  };
  performance_metrics: {
    response_time_ms: number;
    fraud_checks_passed: boolean;
  };
  ts: string;
}

/**
 * 场馆会话响应
 */
export interface VenueSessionResponse {
  session_code: string;
  venue_code: string;
  venue_name: string;
  operator_name: string;
  expires_at: string;
  supported_functions: string[];
}

// ============================================================================
// Venue Operations Service
// ============================================================================

export class VenueOperationsService {
  private repository: VenueRepository;

  constructor() {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database must be initialized before VenueOperationsService');
    }
    this.repository = new VenueRepository(AppDataSource);
  }

  /**
   * 核销票券权益
   *
   * 核心流程：
   * 1. 解密并验证QR码（检查签名、过期时间）
   * 2. 防重放攻击：检查 JTI + function_code 组合是否已使用
   * 3. 验证票据状态和权益
   * 4. 核销权益（减少remaining_uses）
   * 5. 记录redemption事件（关联操作员）
   */
  async validateAndRedeem(request: ValidationRequest): Promise<VenueOperationsResponse> {
    const startTime = Date.now();

    logger.info('venue.scan.started', {
      function_code: request.functionCode,
      operator_id: request.operator.operator_id,
      operator_name: request.operator.username
    });

    try {
      // ========================================
      // Step 1: 解密并验证QR码
      // ========================================
      const decryptResult = await decryptAndVerifyQR(request.qrToken);

      // OTA票券不进行时间过期校验（QR码长期有效）
      // QR加密仍然保留用于防篡改，但不强制过期时间
      logger.info('venue.scan.qr_decryption_success', {
        operator_id: request.operator.operator_id,
        qr_expired: decryptResult.is_expired,
        note: 'OTA tickets do not enforce QR expiry validation'
      });

      const { ticket_code: ticketCode, jti } = decryptResult.data;

      logger.info('venue.scan.qr_decrypted', {
        ticket_code: ticketCode,
        jti,
        operator_id: request.operator.operator_id
      });

      // ========================================
      // Step 2: 防重放攻击 - 检查 JTI + function_code 组合
      // ========================================
      const alreadyUsed = await this.repository.hasJtiBeenUsedForFunction(
        jti,
        request.functionCode
      );

      if (alreadyUsed) {
        logger.warn('venue.scan.fraud_detected', {
          jti,
          ticket_code: ticketCode,
          function_code: request.functionCode,
          operator_id: request.operator.operator_id,
          reason: 'JTI + function_code already used (replay attack)'
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'ALREADY_REDEEMED'
        });

        return this.createRejectResponse('ALREADY_REDEEMED', startTime, request.operator, false);
      }

      // ========================================
      // Step 3: 获取并验证票据
      // ========================================
      const ticket = await this.repository.getTicketByCode(ticketCode);

      if (!ticket) {
        logger.warn('venue.scan.ticket_not_found', {
          ticket_code: ticketCode,
          operator_id: request.operator.operator_id
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'TICKET_NOT_FOUND'
        });

        return this.createRejectResponse('TICKET_NOT_FOUND', startTime, request.operator, true);
      }

      // ========================================
      // Step 3.1: JTI 匹配验证（一码失效机制）
      // - OTA 票券：current_jti 存储在 raw.jti.current_jti
      // - 小程序票券：current_jti 存储在 extra.current_jti
      // ========================================
      let currentJti: string | undefined;

      // OTA 票券：检查 raw.jti.current_jti
      if (ticket.raw?.jti?.current_jti) {
        currentJti = ticket.raw.jti.current_jti;
      }
      // 小程序票券：检查 extra.current_jti
      else if (ticket.extra?.current_jti) {
        currentJti = ticket.extra.current_jti;
      }

      if (currentJti && currentJti !== jti) {
        logger.warn('venue.scan.jti_mismatch', {
          ticket_code: ticketCode,
          qr_jti: jti,
          current_jti: currentJti,
          ticket_type: ticket.ticket_type,
          operator_id: request.operator.operator_id,
          reason: 'QR code superseded by newer one'
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'QR_SUPERSEDED'
        });

        return this.createRejectResponse('QR_SUPERSEDED', startTime, request.operator, false);
      }

      logger.info('venue.scan.ticket_found', {
        ticket_code: ticketCode,
        status: ticket.status,
        ticket_type: ticket.ticket_type,
        operator_id: request.operator.operator_id
      });

      // 验证票据状态 - OTA票券必须先激活才能核销
      const validStatuses = ['ACTIVE'];  // 只允许已激活的票券核销
      if (!validStatuses.includes(ticket.status)) {
        logger.warn('venue.scan.invalid_status', {
          ticket_code: ticketCode,
          status: ticket.status,
          valid_statuses: validStatuses,
          operator_id: request.operator.operator_id,
          reason: ticket.status === 'PRE_GENERATED' ? 'Ticket not activated yet' : 'Invalid ticket status'
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'TICKET_INVALID_STATUS'
        });

        return this.createRejectResponse('TICKET_INVALID_STATUS', startTime, request.operator, true);
      }

      // ========================================
      // Step 3.5: 验证场馆（如果提供了 venue_code）
      // ========================================
      if (request.venueCode) {
        logger.info('venue.scan.venue_validation_started', {
          venue_code: request.venueCode,
          function_code: request.functionCode,
          operator_id: request.operator.operator_id
        });

        const venue = await this.repository.findVenueByCode(request.venueCode);

        if (!venue) {
          logger.warn('venue.scan.venue_not_found', {
            venue_code: request.venueCode,
            operator_id: request.operator.operator_id
          });

          await this.recordRedemption({
            ticketCode,
            jti,
            functionCode: request.functionCode,
            operator: request.operator,
            result: 'reject',
            reason: 'VENUE_NOT_FOUND'
          });

          return this.createRejectResponse('VENUE_NOT_FOUND', startTime, request.operator, true);
        }

        // 验证场馆是否支持该功能
        const supportedFunctions = venue.supported_functions || [];
        if (!supportedFunctions.includes(request.functionCode)) {
          logger.warn('venue.scan.wrong_venue_function', {
            venue_code: request.venueCode,
            venue_name: venue.venue_name,
            function_code: request.functionCode,
            supported_functions: supportedFunctions,
            operator_id: request.operator.operator_id
          });

          await this.recordRedemption({
            ticketCode,
            jti,
            functionCode: request.functionCode,
            operator: request.operator,
            result: 'reject',
            reason: 'WRONG_VENUE_FUNCTION'
          });

          return this.createRejectResponse('WRONG_VENUE_FUNCTION', startTime, request.operator, true);
        }

        logger.info('venue.scan.venue_validation_passed', {
          venue_code: request.venueCode,
          venue_name: venue.venue_name,
          function_code: request.functionCode,
          operator_id: request.operator.operator_id
        });
      }

      // ========================================
      // Step 4: 验证权益
      // ========================================
      const entitlement = ticket.entitlements.find(
        (e: Entitlement) => e.function_code === request.functionCode
      );

      if (!entitlement) {
        logger.warn('venue.scan.wrong_function', {
          ticket_code: ticketCode,
          requested_function: request.functionCode,
          available_functions: ticket.entitlements.map((e: Entitlement) => e.function_code),
          operator_id: request.operator.operator_id
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'WRONG_FUNCTION'
        });

        return this.createRejectResponse('WRONG_FUNCTION', startTime, request.operator, true);
      }

      if (entitlement.remaining_uses <= 0) {
        logger.warn('venue.scan.no_remaining', {
          ticket_code: ticketCode,
          function_code: request.functionCode,
          remaining_uses: entitlement.remaining_uses,
          operator_id: request.operator.operator_id
        });

        await this.recordRedemption({
          ticketCode,
          jti,
          functionCode: request.functionCode,
          operator: request.operator,
          result: 'reject',
          reason: 'NO_REMAINING'
        });

        return this.createRejectResponse('NO_REMAINING', startTime, request.operator, true);
      }

      // ========================================
      // Step 5: 核销权益
      // ========================================
      const success = await this.repository.decrementEntitlement(ticketCode, request.functionCode);

      if (!success) {
        logger.error('venue.scan.decrement_failed', {
          ticket_code: ticketCode,
          function_code: request.functionCode,
          operator_id: request.operator.operator_id
        });

        return this.createRejectResponse('INTERNAL_ERROR', startTime, request.operator, true);
      }

      const remainingUsesAfter = entitlement.remaining_uses - 1;

      // ========================================
      // Step 6: 记录成功的redemption事件（关联操作员）
      // ========================================
      await this.recordRedemption({
        ticketCode,
        jti,
        functionCode: request.functionCode,
        operator: request.operator,
        result: 'success',
        remainingUsesAfter
      });

      // ========================================
      // Step 7: 返回成功响应
      // ========================================
      const responseTime = Date.now() - startTime;

      logger.info('venue.scan.success', {
        ticket_code: ticketCode,
        function_code: request.functionCode,
        operator_id: request.operator.operator_id,
        operator_name: request.operator.username,
        response_time_ms: responseTime,
        remaining_uses: remainingUsesAfter
      });

      // 更新内存中的entitlement（避免再次查询数据库）
      entitlement.remaining_uses = remainingUsesAfter;

      return {
        result: 'success',
        ticket_status: ticket.status,
        entitlements: ticket.entitlements,
        remaining_uses: remainingUsesAfter,
        operator_info: {
          operator_id: request.operator.operator_id,
          username: request.operator.username
        },
        performance_metrics: {
          response_time_ms: responseTime,
          fraud_checks_passed: true
        },
        ts: new Date().toISOString()
      };

    } catch (error) {
      logger.error('venue.scan.error', {
        function_code: request.functionCode,
        operator_id: request.operator.operator_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 根据错误类型返回不同的拒绝原因
      const errorMsg = error instanceof Error ? error.message : '';
      let reason = 'INTERNAL_ERROR';

      if (errorMsg.includes('QR_SIGNATURE_INVALID')) {
        reason = 'QR_TAMPERED';
      } else if (errorMsg.includes('QR_DECRYPTION_FAILED')) {
        reason = 'QR_INVALID';
      } else if (errorMsg.includes('QR_INVALID_FORMAT')) {
        reason = 'QR_FORMAT_INVALID';
      }

      return this.createRejectResponse(reason, startTime, request.operator, false);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createRejectResponse(
    reason: string,
    startTime: number,
    operator: OperatorInfo,
    fraudChecksPassed: boolean
  ): VenueOperationsResponse {
    return {
      result: 'reject',
      reason,
      operator_info: {
        operator_id: operator.operator_id,
        username: operator.username
      },
      performance_metrics: {
        response_time_ms: Date.now() - startTime,
        fraud_checks_passed: fraudChecksPassed
      },
      ts: new Date().toISOString()
    };
  }

  private async recordRedemption(params: {
    ticketCode: string;
    jti: string;
    functionCode: string;
    operator: OperatorInfo;
    result: 'success' | 'reject';
    reason?: string;
    remainingUsesAfter?: number;
  }): Promise<void> {
    try {
      await this.repository.recordRedemption({
        ticketCode: params.ticketCode,
        functionCode: params.functionCode,
        venueId: 0, // 默认场馆ID（无session情况）
        operatorId: params.operator.operator_id,
        sessionCode: '', // 无session code
        terminalDeviceId: undefined,
        jti: params.jti,
        result: params.result,
        reason: params.reason,
        remainingUsesAfter: params.remainingUsesAfter
      });
    } catch (error) {
      // 记录失败不应该影响主流程
      logger.error('venue.scan.record_redemption_failed', {
        ticket_code: params.ticketCode,
        jti: params.jti,
        operator_id: params.operator.operator_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============================================================================
  // Venue Session Management
  // ============================================================================

  async createVenueSession(sessionData: {
    venueCode: string;
    operatorId: number;
    operatorName: string;
    terminalDeviceId?: string;
    durationHours?: number;
  }): Promise<VenueSessionResponse> {
    logger.info('venue.session.create.started', sessionData);

    const session = await this.repository.createVenueSession({
      venueCode: sessionData.venueCode,
      operatorId: sessionData.operatorId,
      operatorName: sessionData.operatorName,
      terminalDeviceId: sessionData.terminalDeviceId,
      durationSeconds: (sessionData.durationHours || 8) * 3600
    });

    if (!session) {
      throw new Error(`Venue ${sessionData.venueCode} not found`);
    }

    const venue = await this.repository.findVenueByCode(sessionData.venueCode);
    const expiresAt = new Date(
      session.started_at.getTime() + session.session_duration_seconds * 1000
    );

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
      supported_functions: venue?.supported_functions || [
        'ferry_boarding',
        'gift_redemption',
        'playground_token'
      ]
    };
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getVenueAnalytics(venueCode: string, hours: number = 24) {
    const venue = await this.repository.findVenueByCode(venueCode);

    if (!venue) {
      throw new Error(`Venue ${venueCode} not found`);
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    return this.repository.getVenueAnalytics(venue.venue_id, startDate, endDate);
  }

  /**
   * Get venues list
   * - With partnerId: return only that partner's venues (OTA)
   * - Without partnerId: return all venues (miniprogram)
   */
  async getAllVenues(options: { includeInactive?: boolean; partnerId?: string } | boolean = false) {
    // Support legacy boolean parameter for backward compatibility
    const opts = typeof options === 'boolean'
      ? { includeInactive: options }
      : options;

    const venues = await this.repository.findAllVenues(opts);

    return {
      venues: venues.map(v => ({
        venue_id: v.venue_id,
        venue_code: v.venue_code,
        venue_name: v.venue_name,
        venue_type: v.venue_type,
        location_address: v.location_address,
        supported_functions: v.supported_functions || [],
        is_active: v.is_active,
        partner_id: v.partner_id,
        created_at: v.created_at,
        updated_at: v.updated_at
      }))
    };
  }

  // ============================================================================
  // Venue CRUD Operations
  // ============================================================================

  /**
   * Create a new venue
   */
  async createVenue(venueData: {
    venue_code: string;
    venue_name: string;
    venue_type: string;
    location_address?: string;
    supported_functions?: string[];
    is_active?: boolean;
    partner_id?: string | null;
  }) {
    logger.info('venue.create.started', { venue_code: venueData.venue_code });

    // Check venue_code uniqueness
    const isUnique = await this.repository.isVenueCodeUnique(venueData.venue_code);
    if (!isUnique) {
      throw new Error(`Venue code '${venueData.venue_code}' already exists`);
    }

    const venue = await this.repository.createVenue({
      venue_code: venueData.venue_code,
      venue_name: venueData.venue_name,
      venue_type: venueData.venue_type,
      location_address: venueData.location_address,
      supported_functions: venueData.supported_functions || [],
      is_active: venueData.is_active !== false
    });

    logger.info('venue.create.success', { venue_id: venue.venue_id, venue_code: venue.venue_code });

    return {
      venue_id: venue.venue_id,
      venue_code: venue.venue_code,
      venue_name: venue.venue_name,
      venue_type: venue.venue_type,
      location_address: venue.location_address,
      supported_functions: venue.supported_functions || [],
      is_active: venue.is_active,
      created_at: venue.created_at,
      updated_at: venue.updated_at
    };
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: number) {
    const venue = await this.repository.findVenueById(venueId);

    if (!venue) {
      return null;
    }

    return {
      venue_id: venue.venue_id,
      venue_code: venue.venue_code,
      venue_name: venue.venue_name,
      venue_type: venue.venue_type,
      location_address: venue.location_address,
      supported_functions: venue.supported_functions || [],
      is_active: venue.is_active,
      created_at: venue.created_at,
      updated_at: venue.updated_at
    };
  }

  /**
   * Update venue
   */
  async updateVenue(venueId: number, updateData: {
    venue_code?: string;
    venue_name?: string;
    venue_type?: string;
    location_address?: string;
    supported_functions?: string[];
    is_active?: boolean;
  }) {
    logger.info('venue.update.started', { venue_id: venueId });

    // Check if venue exists
    const existing = await this.repository.findVenueById(venueId);
    if (!existing) {
      return null;
    }

    // If venue_code is being changed, check uniqueness
    if (updateData.venue_code && updateData.venue_code !== existing.venue_code) {
      const isUnique = await this.repository.isVenueCodeUnique(updateData.venue_code, venueId);
      if (!isUnique) {
        throw new Error(`Venue code '${updateData.venue_code}' already exists`);
      }
    }

    // Filter out undefined values to only update provided fields
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
    }

    const venue = await this.repository.updateVenue(venueId, filteredData);

    if (!venue) {
      return null;
    }

    logger.info('venue.update.success', { venue_id: venue.venue_id, venue_code: venue.venue_code });

    return {
      venue_id: venue.venue_id,
      venue_code: venue.venue_code,
      venue_name: venue.venue_name,
      venue_type: venue.venue_type,
      location_address: venue.location_address,
      supported_functions: venue.supported_functions || [],
      is_active: venue.is_active,
      created_at: venue.created_at,
      updated_at: venue.updated_at
    };
  }

  /**
   * Delete venue (soft delete)
   */
  async deleteVenue(venueId: number) {
    logger.info('venue.delete.started', { venue_id: venueId });

    const success = await this.repository.deleteVenue(venueId);

    if (success) {
      logger.info('venue.delete.success', { venue_id: venueId });
    } else {
      logger.warn('venue.delete.not_found', { venue_id: venueId });
    }

    return success;
  }
}

// 延迟实例化 - 仅在数据库初始化后创建（避免启动时强制要求数据库）
let venueOperationsServiceInstance: VenueOperationsService | null = null;

export const getVenueOperationsService = (): VenueOperationsService => {
  if (!venueOperationsServiceInstance) {
    venueOperationsServiceInstance = new VenueOperationsService();
  }
  return venueOperationsServiceInstance;
};

// 向后兼容的导出（仅在数据库模式下使用）
export const venueOperationsService = new Proxy({} as VenueOperationsService, {
  get(_target, prop) {
    return getVenueOperationsService()[prop as keyof VenueOperationsService];
  }
});
