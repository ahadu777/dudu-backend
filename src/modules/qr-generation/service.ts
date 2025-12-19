import { Request } from 'express';
import { mockDataStore } from '../../core/mock/data';
import { generateSecureQR, EncryptedQRResult, QRColorConfig } from '../../utils/qr-crypto';
import { logger } from '../../utils/logger';
import { getAuthContext } from '../../middlewares/unified-auth';
import { AppDataSource } from '../../config/database';
import { dataSourceConfig } from '../../config/data-source';
import { OTARepository } from '../ota/domain/ota.repository';
import { ProductEntity } from '../../models';

/**
 * Ticket type detection result
 */
interface TicketInfo {
  ticket_code: string;
  product_id: number;
  status: string;
  ticket_type: 'OTA' | 'NORMAL';
  owner_id: string | number; // user_id or partner_id
  order_id?: string;
  batch_id?: string;
  channel_id?: string;
  partner_id?: string;
}

/**
 * Authentication context
 */
interface AuthContext {
  authType: 'USER' | 'OTA_PARTNER' | 'OPERATOR';
  userId?: number;
  partnerId?: string;
  operatorId?: number;
}

/**
 * Unified QR Generation Service
 */
export class UnifiedQRService {
  /**
   * Detect ticket type from ticket code pattern
   * @param ticketCode - Ticket code string
   * @returns 'OTA' or 'NORMAL'
   */
  private detectTicketType(ticketCode: string): 'OTA' | 'NORMAL' {
    // OTA ticket patterns:
    // - CRUISE-2025-FERRY-xxx
    // - BATCH-xxx
    // - Any ticket starting with known OTA prefixes

    const otaPatterns = [
      /^CRUISE-/i,
      /^BATCH-/i,
      /^FERRY-/i,
      /^OTA-/i
    ];

    for (const pattern of otaPatterns) {
      if (pattern.test(ticketCode)) {
        return 'OTA';
      }
    }

    return 'NORMAL';
  }

  /**
   * Fetch ticket from appropriate data source
   * @param ticketCode - Ticket code
   * @param ticketType - OTA or NORMAL
   * @returns Ticket information
   */
  private async fetchTicket(ticketCode: string, ticketType: 'OTA' | 'NORMAL'): Promise<TicketInfo | null> {
    if (ticketType === 'OTA') {
      // Dual-mode: Database or Mock
      if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
        // Database mode: Query from pre_generated_tickets table
        const otaRepo = new OTARepository(AppDataSource);
        const otaTicket = await otaRepo.findPreGeneratedTicket(ticketCode);

        if (!otaTicket) {
          logger.info('qr.service.ota_ticket_not_found_db', {
            ticket_code: ticketCode,
            mode: 'database'
          });
          return null;
        }

        return {
          ticket_code: otaTicket.ticket_code,
          product_id: otaTicket.product_id,
          status: otaTicket.status,
          ticket_type: 'OTA',
          owner_id: otaTicket.partner_id || 'unknown',
          order_id: otaTicket.order_no,  // 使用统一的 order_no
          batch_id: otaTicket.batch_id,
          channel_id: 'ota',
          partner_id: otaTicket.partner_id
        };
      } else {
        // Mock mode: Fetch from in-memory store
        const otaTicket = mockDataStore.preGeneratedTickets.get(ticketCode);

        if (!otaTicket) {
          logger.info('qr.service.ota_ticket_not_found_mock', {
            ticket_code: ticketCode,
            mode: 'mock'
          });
          return null;
        }

        return {
          ticket_code: otaTicket.code,
          product_id: otaTicket.product_id,
          status: otaTicket.status,
          ticket_type: 'OTA',
          owner_id: otaTicket.partner_id || 'unknown',
          order_id: otaTicket.order_id,  // Mock 数据结构保持不变
          batch_id: otaTicket.batch_id,
          channel_id: 'ota',
          partner_id: otaTicket.partner_id
        };
      }
    } else {
      // Fetch from normal tickets
      const normalTicket = mockDataStore.getTicketByCode(ticketCode);

      if (!normalTicket) {
        logger.info('qr.service.normal_ticket_not_found', { ticket_code: ticketCode });
        return null;
      }

      return {
        ticket_code: normalTicket.code,
        product_id: 0, // Product ID not stored in MockTicket, will be derived from order if needed
        status: normalTicket.status,
        ticket_type: 'NORMAL',
        owner_id: normalTicket.user_id,
        order_id: normalTicket.order_id?.toString(),
        channel_id: 'direct' // Direct sales channel
      };
    }
  }

  /**
   * Verify ticket ownership based on auth context
   * @param ticket - Ticket information
   * @param authContext - Authentication context
   * @throws Error if ownership verification fails
   */
  private verifyOwnership(ticket: TicketInfo, authContext: AuthContext): void {
    if (authContext.authType === 'USER') {
      // Normal ticket: verify user_id
      if (ticket.ticket_type !== 'NORMAL') {
        throw new Error('TICKET_TYPE_MISMATCH: User authentication cannot access OTA tickets');
      }
      if (ticket.owner_id !== authContext.userId) {
        throw new Error('UNAUTHORIZED: Ticket not owned by user');
      }
    } else if (authContext.authType === 'OTA_PARTNER') {
      // OTA ticket: verify partner_id
      if (ticket.ticket_type !== 'OTA') {
        throw new Error('TICKET_TYPE_MISMATCH: OTA authentication cannot access normal tickets');
      }
      if (ticket.owner_id !== authContext.partnerId) {
        throw new Error('UNAUTHORIZED: Ticket not owned by partner');
      }
    }
  }

  /**
   * Validate ticket status for QR generation
   * @param ticket - Ticket information
   * @throws Error if status is invalid
   */
  private validateStatus(ticket: TicketInfo): void {
    const validStatuses: Record<'OTA' | 'NORMAL', string[]> = {
      OTA: ['PRE_GENERATED', 'ACTIVATED'],  // 使用统一内部状态
      NORMAL: ['active', 'partially_redeemed', 'ACTIVATED']  // 兼容两种状态格式
    };

    const valid = validStatuses[ticket.ticket_type];
    if (!valid.includes(ticket.status)) {
      throw new Error(`INVALID_STATUS: Ticket status "${ticket.status}" cannot generate QR code`);
    }
  }

  /**
   * Get QR color configuration from product
   * @param productId - Product ID
   * @returns QR color config or undefined
   */
  private async getProductQRConfig(productId: number): Promise<QRColorConfig | undefined> {
    if (!productId || productId <= 0) {
      return undefined;
    }

    try {
      if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
        const productRepo = AppDataSource.getRepository(ProductEntity);
        const product = await productRepo.findOne({ where: { id: productId } });

        if (product?.qr_config) {
          logger.debug('qr.service.product_qr_config_found', {
            product_id: productId,
            qr_config: product.qr_config
          });
          return {
            dark_color: product.qr_config.dark_color,
            light_color: product.qr_config.light_color
          };
        }
      }
    } catch (error) {
      logger.warn('qr.service.product_qr_config_error', {
        product_id: productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return undefined;
  }

  /**
   * Generate QR token for a ticket (unified for both OTA and normal tickets)
   * No authentication required - ticket_code itself is the credential
   *
   * @param ticketCode - Ticket code
   * @param expiryMinutes - Optional custom expiry time
   * @returns Encrypted QR result with image
   */
  async generateQRToken(
    ticketCode: string,
    expiryMinutes?: number
  ): Promise<EncryptedQRResult> {
    logger.info('qr.service.generate_started', {
      ticket_code: ticketCode
    });

    // Step 1: Detect ticket type
    const ticketType = this.detectTicketType(ticketCode);
    logger.debug('qr.service.ticket_type_detected', {
      ticket_code: ticketCode,
      ticket_type: ticketType
    });

    // Step 2: Fetch ticket
    const ticket = await this.fetchTicket(ticketCode, ticketType);
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND: No ticket found with this code');
    }

    // Step 3: Validate status (ownership verification removed - ticket_code is sufficient credential)
    this.validateStatus(ticket);

    // Step 4: Get product QR color config
    const qrColorConfig = await this.getProductQRConfig(ticket.product_id);

    // Step 5: Generate encrypted QR code with appropriate expiry time
    // OTA tickets: Permanent QR codes (100 years = 52,560,000 minutes)
    //   - QR validity is determined by ticket status, not expiry time
    //   - Ticket status (PRE_GENERATED, ACTIVE, USED, EXPIRED, CANCELLED) controls usability
    // Normal tickets: Short-lived for security (30 minutes default)
    const qrExpiryMinutes = expiryMinutes || (ticketType === 'OTA' ? 52560000 : undefined);

    const qrResult = await generateSecureQR(
      ticket.ticket_code,
      qrExpiryMinutes,
      undefined, // logoBuffer
      qrColorConfig
    );

    logger.info('qr.service.generate_success', {
      ticket_code: ticketCode,
      ticket_type: ticketType,
      expires_at: qrResult.expires_at
    });

    return qrResult;
  }

  /**
   * Generate QR token from Express request (convenience method)
   * @deprecated No longer uses authentication - use generateQRToken directly
   * @param req - Express request (for logging only)
   * @param ticketCode - Ticket code
   * @param expiryMinutes - Optional custom expiry time
   * @returns Encrypted QR result
   */
  async generateQRFromRequest(
    req: Request,
    ticketCode: string,
    expiryMinutes?: number
  ): Promise<EncryptedQRResult> {
    logger.info('qr.service.request_received', {
      ticket_code: ticketCode,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    // No authentication required - just pass through to generateQRToken
    return this.generateQRToken(ticketCode, expiryMinutes);
  }
}

// Singleton instance
export const unifiedQRService = new UnifiedQRService();
