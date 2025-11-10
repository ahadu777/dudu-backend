import { Request } from 'express';
import { mockDataStore } from '../../core/mock/data';
import { generateSecureQR, EncryptedQRResult } from '../../utils/qr-crypto';
import { logger } from '../../utils/logger';
import { getAuthContext } from '../../middlewares/unified-auth';

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
  authType: 'USER' | 'OTA_PARTNER';
  userId?: number;
  partnerId?: string;
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
      // Fetch from OTA pre-generated tickets
      const otaTicket = mockDataStore.preGeneratedTickets.get(ticketCode);

      if (!otaTicket) {
        logger.info('qr.service.ota_ticket_not_found', { ticket_code: ticketCode });
        return null;
      }

      return {
        ticket_code: otaTicket.ticket_code,
        product_id: otaTicket.product_id,
        status: otaTicket.status,
        ticket_type: 'OTA',
        owner_id: otaTicket.partner_id,
        order_id: otaTicket.order_id,
        batch_id: otaTicket.batch_id,
        channel_id: 'ota', // OTA channel
        partner_id: otaTicket.partner_id
      };
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
      OTA: ['PRE_GENERATED', 'ACTIVE'],
      NORMAL: ['active', 'partially_redeemed']
    };

    const valid = validStatuses[ticket.ticket_type];
    if (!valid.includes(ticket.status)) {
      throw new Error(`INVALID_STATUS: Ticket status "${ticket.status}" cannot generate QR code`);
    }
  }

  /**
   * Generate QR token for a ticket (unified for both OTA and normal tickets)
   * @param ticketCode - Ticket code
   * @param authContext - Authentication context from request
   * @param expiryMinutes - Optional custom expiry time
   * @returns Encrypted QR result with image
   */
  async generateQRToken(
    ticketCode: string,
    authContext: AuthContext,
    expiryMinutes?: number
  ): Promise<EncryptedQRResult> {
    logger.info('qr.service.generate_started', {
      ticket_code: ticketCode,
      auth_type: authContext.authType
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

    // Step 3: Verify ownership
    this.verifyOwnership(ticket, authContext);

    // Step 4: Validate status
    this.validateStatus(ticket);

    // Step 5: Generate encrypted QR code
    const qrResult = await generateSecureQR(
      {
        ticket_code: ticket.ticket_code,
        product_id: ticket.product_id,
        ticket_type: ticket.ticket_type,
        order_id: ticket.order_id,
        batch_id: ticket.batch_id,
        channel_id: ticket.channel_id,
        partner_id: ticket.partner_id
      },
      expiryMinutes
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
   * @param req - Express request with auth context
   * @param ticketCode - Ticket code
   * @param expiryMinutes - Optional custom expiry time
   * @returns Encrypted QR result
   */
  async generateQRFromRequest(
    req: Request,
    ticketCode: string,
    expiryMinutes?: number
  ): Promise<EncryptedQRResult> {
    // Extract auth context from request
    const authContext: AuthContext = {
      authType: req.authType!,
      userId: req.user?.id,
      partnerId: req.ota_partner?.id
    };

    logger.info('qr.service.request_received', {
      ...getAuthContext(req),
      ticket_code: ticketCode,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    return this.generateQRToken(ticketCode, authContext, expiryMinutes);
  }
}

// Singleton instance
export const unifiedQRService = new UnifiedQRService();
