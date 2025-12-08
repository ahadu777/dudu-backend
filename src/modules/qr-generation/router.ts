import { Router, Request, Response, NextFunction } from 'express';
import { unifiedAuth } from '../../middlewares/unified-auth';
import { unifiedQRService } from './service';
import { logger } from '../../utils/logger';
import { decryptAndVerifyQR } from '../../utils/qr-crypto';
import { mockDataStore } from '../../core/mock/data';
import { AppDataSource } from '../../config/database';
import { VenueRepository } from '../venue/domain/venue.repository';
import { dataSourceConfig } from '../../config/data-source';
import { ProductEntity } from '../ota/domain/product.entity';

const router = Router();

/**
 * POST /qr/decrypt
 *
 * Decrypt and verify QR code with complete ticket information (NO redemption)
 * Used by frontend apps to display ticket details to operators before redemption
 *
 * Enhanced in 2025-11-17: Now returns complete ticket information in single call
 * - No need to call GET /qr/:code/info separately
 * - Includes customer_info, entitlements, product_info
 *
 * @body encrypted_data - Encrypted QR token string
 * @returns Decrypted QR data + complete ticket information
 */
router.post('/decrypt', async (req: Request, res: Response) => {
  try {
    const { encrypted_data } = req.body;

    logger.info('qr.decrypt.request', {
      has_data: !!encrypted_data,
      ip: req.ip
    });

    // Validate input
    if (!encrypted_data || typeof encrypted_data !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'encrypted_data (string) is required'
      });
    }

    // Step 1: Decrypt and verify QR code
    const result = await decryptAndVerifyQR(encrypted_data);
    const ticketCode = result.data.ticket_code;

    logger.info('qr.decrypt.success', {
      jti: result.data.jti,
      ticket_code: ticketCode,
      is_expired: result.is_expired
    });

    // Step 2: Fetch complete ticket information
    // Note: No ownership validation here since encrypted_data itself is the security credential
    // Query tickets from local database (tickets table for miniprogram, pre_generated_tickets for OTA)

    let ticket;
    let ticketType = 'NORMAL';
    let venueRepo: VenueRepository | null = null;

    // Query local database first (OTA pre_generated_tickets + miniprogram tickets)
    if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
      venueRepo = new VenueRepository(AppDataSource);
      ticket = await venueRepo.getTicketByCode(ticketCode);
      if (ticket) {
        ticketType = ticket.ticket_type || (ticketCode.startsWith('MP-') ? 'MINIPROGRAM' : 'OTA');
        logger.info('qr.decrypt.ticket_source', {
          ticket_code: ticketCode,
          source: 'database',
          ticket_type: ticketType
        });
      }
    }

    if (!ticket) {
      return res.status(404).json({
        error: 'TICKET_NOT_FOUND',
        message: 'Ticket not found',
        jti: result.data.jti,
        ticket_code: ticketCode
      });
    }

    // JTI 验证：检查二维码是否已被新码替代（一码失效机制）
    // - OTA 票券：current_jti 存储在 raw.jti.current_jti
    // - 小程序票券：current_jti 存储在 extra.current_jti
    let currentJti: string | undefined;

    // OTA 票券
    if (ticket.raw?.jti?.current_jti) {
      currentJti = ticket.raw.jti.current_jti;
    }
    // 小程序票券
    else if (ticket.extra?.current_jti) {
      currentJti = ticket.extra.current_jti;
    }

    if (currentJti && currentJti !== result.data.jti) {
      logger.warn('qr.decrypt.jti_mismatch', {
        ticket_code: ticketCode,
        qr_jti: result.data.jti,
        current_jti: currentJti,
        ticket_type: ticketType
      });
      return res.status(401).json({
        error: 'QR_SUPERSEDED',
        message: '此二维码已失效，请重新生成',
        jti: result.data.jti,
        ticket_code: ticketCode
      });
    }

    // Get product information (database first, then fallback to mock)
    let product: any = null;
    if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
      const productRepo = AppDataSource.getRepository(ProductEntity);
      const dbProduct = await productRepo.findOne({ where: { id: ticket.product_id } });
      if (dbProduct) {
        product = {
          id: dbProduct.id,
          name: dbProduct.name,
          description: dbProduct.description,
          entitlements: dbProduct.entitlements
        };
      }
    }
    if (!product) {
      product = mockDataStore.getProduct(ticket.product_id);
    }
    const productInfo = product ? {
      id: product.id,
      name: product.name
    } : {
      id: ticket.product_id,
      name: 'Unknown Product'
    };

    // Format entitlements with complete information (with fallback to product entitlements)
    const productEntitlements = product?.entitlements || product?.functions || [];
    const formattedEntitlements = (ticket.entitlements || []).map((e: any) => {
      // Fallback: find description from product entitlements if ticket doesn't have it
      let description = e.description || null;
      let label = e.label || e.function_code;

      if (!description || !e.label) {
        // Try to find matching entitlement in product by function_code/type
        const productEnt = productEntitlements.find((pe: any) =>
          pe.function_code === e.function_code || pe.type === e.function_code
        );
        if (productEnt) {
          if (!description) description = productEnt.description || null;
          if (!e.label) label = productEnt.label || productEnt.type || e.function_code;
        }
      }

      return {
        function_code: e.function_code,
        function_name: label,
        description,
        remaining_uses: e.remaining_uses,
        total_uses: e.total_uses || e.remaining_uses
      };
    });

    // Fetch reservation information for slot_date and slot_time (using TypeORM)
    let reservationInfo: { slot_date: string | null; slot_time: string | null } = {
      slot_date: null,
      slot_time: null
    };

    if (venueRepo) {
      try {
        const slotInfo = await venueRepo.getTicketReservationSlot(ticketCode);
        if (slotInfo) {
          reservationInfo = slotInfo;
          logger.info('qr.decrypt.reservation_found', {
            ticket_code: ticketCode,
            slot_date: reservationInfo.slot_date,
            slot_time: reservationInfo.slot_time
          });
        }
      } catch (error) {
        logger.warn('qr.decrypt.reservation_lookup_failed', {
          ticket_code: ticketCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue without reservation info - not a fatal error
      }
    }

    // Return complete information: QR metadata + ticket details
    return res.status(200).json({
      // QR code metadata (解密信息)
      jti: result.data.jti,
      ticket_code: ticketCode,
      expires_at: result.data.expires_at,
      version: result.data.version,
      is_expired: result.is_expired,
      remaining_seconds: result.remaining_seconds,

      // Complete ticket information (完整票券信息)
      ticket_info: {
        ticket_type: ticketType,
        status: ticket.status,
        // Customer information (顾客信息)
        customer_info: {
          type: ticket.customer_type || null,        // 'adult' | 'child' | 'elderly' (成人/小孩/老人)
          name: ticket.customer_name || null,        // 顾客姓名
          email: ticket.customer_email || null,      // 顾客邮箱
          phone: ticket.customer_phone || null       // 顾客电话
        },
        // Reservation information (预订信息)
        slot_date: reservationInfo.slot_date,        // 预订日期 (e.g., "2025-01-15")
        slot_time: reservationInfo.slot_time,        // 预订时段 (e.g., "10:00 - 12:00")
        entitlements: formattedEntitlements,
        product_info: productInfo,
        // Additional fields for debugging
        product_id: ticket.product_id,
        order_id: ticket.order_id,
        batch_id: ticket.batch_id,
        partner_id: ticket.partner_id
      }
    });

  } catch (error) {
    logger.error('qr.decrypt.error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Handle specific QR errors
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('QR_SIGNATURE_INVALID')) {
        return res.status(401).json({
          error: 'QR_SIGNATURE_INVALID',
          message: 'QR code has been tampered with'
        });
      }

      if (message.includes('QR_DECRYPTION_FAILED')) {
        return res.status(401).json({
          error: 'QR_DECRYPTION_FAILED',
          message: 'Unable to decrypt QR code'
        });
      }

      if (message.includes('QR_INVALID_FORMAT')) {
        return res.status(400).json({
          error: 'QR_INVALID_FORMAT',
          message: 'Invalid QR code format'
        });
      }
    }

    // Generic error
    return res.status(500).json({
      error: 'DECRYPT_ERROR',
      message: 'Failed to decrypt QR code'
    });
  }
});

/**
 * POST /qr/public/:code
 *
 * Generate secure QR code for a ticket (PUBLIC ENDPOINT - NO AUTH REQUIRED)
 * For web customers who access ticket pages without logging in
 *
 * SLOT-AWARE EXPIRY (NEW):
 * - If ticket has a reservation slot: QR expires at slot end_time
 * - Allows customer to generate QR days in advance and use it at venue
 * - No 24-hour limit for public QR codes (unlike authenticated endpoint)
 * - Fallback: 30-minute expiry for tickets without reservation slots
 *
 * Security measures:
 * - Validates ticket exists and has correct status (RESERVED, ACTIVATED, etc.)
 * - Only generates QR for valid tickets
 * - Encrypted JWT with unique JTI for fraud prevention
 *
 * @param code - Ticket code (e.g., TKT-2024-001)
 * @returns Encrypted QR code image, expiry time, and slot information
 */
router.post('/public/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketCode = req.params.code;
    let expiryMinutes = req.body?.expiry_minutes || 30; // Default 30 minutes

    logger.info('qr.public.request', {
      ticket_code: ticketCode,
      requested_expiry: expiryMinutes,
      ip: req.ip
    });

    // Validate ticket code format
    if (!ticketCode || ticketCode.length < 3) {
      return res.status(400).json({
        error: 'INVALID_TICKET_CODE',
        message: 'Ticket code must be at least 3 characters'
      });
    }

    // Try to fetch ticket from all sources to validate it exists
    let ticket;
    let ticketType = 'NORMAL';

    // Try Directus first (primary source for customer-created tickets with reservations)
    try {
      const { DirectusService } = await import('../../utils/directus');
      const directusService = new DirectusService();
      ticket = await directusService.getTicketByNumber(ticketCode);
      if (ticket) {
        ticketType = 'DIRECTUS';
        logger.info('qr.public.ticket_source', {
          ticket_code: ticketCode,
          source: 'directus',
          status: ticket.status
        });
      }
    } catch (error) {
      logger.warn('qr.public.directus_lookup_failed', {
        ticket_code: ticketCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Try database second (if available - OTA tickets)
    if (!ticket && dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
      const venueRepo = new VenueRepository(AppDataSource);
      ticket = await venueRepo.getTicketByCode(ticketCode);
      if (ticket) {
        ticketType = 'OTA';
        logger.info('qr.public.ticket_source', {
          ticket_code: ticketCode,
          source: 'database'
        });
      }
    }

    // Fallback to mock stores if not found in Directus or database
    if (!ticket) {
      ticket = mockDataStore.preGeneratedTickets.get(ticketCode);
      if (ticket) {
        ticketType = 'OTA';
        logger.info('qr.public.ticket_source', {
          ticket_code: ticketCode,
          source: 'mock_pregenerated'
        });
      }
    }

    if (!ticket) {
      ticket = mockDataStore.getTicketByCode(ticketCode);
      if (ticket) {
        logger.info('qr.public.ticket_source', {
          ticket_code: ticketCode,
          source: 'mock_store'
        });
      }
    }

    // Validate ticket exists
    if (!ticket) {
      logger.warn('qr.public.ticket_not_found', { ticket_code: ticketCode });
      return res.status(404).json({
        error: 'TICKET_NOT_FOUND',
        message: 'No ticket found with this code'
      });
    }

    // Validate ticket status - only allow QR generation for valid statuses
    // 统一状态：使用 ACTIVATED（不再使用 ACTIVE）
    const validStatuses = ['RESERVED', 'ACTIVATED', 'PRE_GENERATED', 'active', 'partially_redeemed'];
    if (!validStatuses.includes(ticket.status)) {
      logger.warn('qr.public.invalid_status', {
        ticket_code: ticketCode,
        status: ticket.status
      });
      return res.status(409).json({
        error: 'INVALID_STATUS',
        message: `Ticket status "${ticket.status}" cannot generate QR code. Ticket must be RESERVED or ACTIVATED.`
      });
    }

    // SLOT-AWARE EXPIRY: Calculate expiry based on reservation slot end_time
    let slotEndTime: Date | null = null;
    try {
      // Import DirectusService to fetch reservation
      const { DirectusService } = await import('../../utils/directus');
      const directusService = new DirectusService();

      const reservation = await directusService.getReservationByTicket(ticketCode);

      if (reservation && reservation.slot) {
        // Reservation has slot information
        const slotDate = reservation.slot.date; // YYYY-MM-DD
        const slotEndTimeStr = reservation.slot.end_time; // HH:MM:SS

        // Combine date and end_time to get full datetime
        slotEndTime = new Date(`${slotDate}T${slotEndTimeStr}`);

        const now = new Date();
        const minutesUntilSlotEnd = Math.floor((slotEndTime.getTime() - now.getTime()) / (1000 * 60));

        if (minutesUntilSlotEnd > 0) {
          // Set expiry to slot end_time (no 24-hour limit for public QR)
          expiryMinutes = minutesUntilSlotEnd;

          logger.info('qr.public.slot_aware_expiry', {
            ticket_code: ticketCode,
            slot_date: slotDate,
            slot_end_time: slotEndTimeStr,
            minutes_until_slot_end: minutesUntilSlotEnd,
            calculated_expiry: expiryMinutes
          });
        } else {
          // Slot has already ended, use short expiry
          expiryMinutes = 30;
          logger.warn('qr.public.slot_ended', {
            ticket_code: ticketCode,
            slot_end_time: slotEndTime.toISOString(),
            using_default_expiry: expiryMinutes
          });
        }
      } else {
        logger.info('qr.public.no_reservation_slot', {
          ticket_code: ticketCode,
          using_default_expiry: expiryMinutes
        });
      }
    } catch (error) {
      // If reservation lookup fails, continue with default expiry
      logger.warn('qr.public.reservation_lookup_failed', {
        ticket_code: ticketCode,
        error: error instanceof Error ? error.message : 'Unknown error',
        using_default_expiry: expiryMinutes
      });
    }

    // Import QR generation utility
    const { generateSecureQR } = await import('../../utils/qr-crypto');

    // Get product QR color config (if ticket has product_id)
    let qrColorConfig;
    const productId = (ticket as any).product_id;
    if (productId && dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
      try {
        const productRepo = AppDataSource.getRepository(ProductEntity);
        const product = await productRepo.findOne({ where: { id: productId } });
        if (product?.qr_config) {
          qrColorConfig = {
            dark_color: product.qr_config.dark_color,
            light_color: product.qr_config.light_color
          };
          logger.debug('qr.public.color_config_loaded', {
            ticket_code: ticketCode,
            product_id: productId,
            qr_config: qrColorConfig
          });
        }
      } catch (error) {
        logger.warn('qr.public.color_config_error', {
          ticket_code: ticketCode,
          product_id: productId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Generate QR code with calculated expiry and color config
    const qrResult = await generateSecureQR(ticketCode, expiryMinutes, undefined, qrColorConfig);

    // Calculate remaining time
    const expiresAt = new Date(qrResult.expires_at);
    const now = new Date();
    const validForSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    logger.info('qr.public.success', {
      ticket_code: ticketCode,
      ticket_type: ticketType,
      expiry_minutes: expiryMinutes,
      expires_at: qrResult.expires_at,
      slot_end_time: slotEndTime ? slotEndTime.toISOString() : null
    });

    // Return encrypted QR code
    return res.status(200).json({
      success: true,
      qr_image: qrResult.qr_image,        // For display to user
      encrypted_data: qrResult.encrypted_data,  // For venue scanning API
      ticket_code: qrResult.ticket_code,
      expires_at: qrResult.expires_at,
      valid_for_seconds: validForSeconds,
      issued_at: new Date().toISOString(),
      jti: qrResult.jti,  // JWT ID for tracking
      slot_end_time: slotEndTime ? slotEndTime.toISOString() : undefined // Return slot info
    });
  } catch (error) {
    logger.error('qr.public.error', {
      ticket_code: req.params.code,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Generic error
    next(error);
  }
});

/**
 * POST /qr/:code
 *
 * Generate secure QR code for a ticket
 * Supports both OTA and normal tickets
 *
 * Authentication: NONE (ticket_code itself is sufficient credential)
 * Security:
 * - Ticket code must exist and be in valid status
 * - Rate limiting applied per ticket_code
 * - Generated QR code is encrypted and signed
 *
 * @param code - Ticket code (e.g., TKT-123-001 or CRUISE-2025-FERRY-123)
 * @returns Encrypted QR code image and metadata
 */
router.post('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketCode = req.params.code;
    const expiryMinutes = req.body?.expiry_minutes; // Optional custom expiry

    logger.info('qr.router.request', {
      ticket_code: ticketCode,
      custom_expiry: expiryMinutes,
      ip: req.ip
    });

    // Validate ticket code format
    if (!ticketCode || ticketCode.length < 3) {
      return res.status(400).json({
        error: 'INVALID_TICKET_CODE',
        message: 'Ticket code must be at least 3 characters'
      });
    }

    // Validate custom expiry if provided
    if (expiryMinutes !== undefined) {
      const expiry = Number(expiryMinutes);
      if (isNaN(expiry) || expiry < 1 || expiry > 1440) {
        return res.status(400).json({
          error: 'INVALID_EXPIRY',
          message: 'Expiry must be between 1 and 1440 minutes (24 hours)'
        });
      }
    }

    // Generate QR code (no ownership verification - ticket_code is the credential)
    const qrResult = await unifiedQRService.generateQRToken(
      ticketCode,
      expiryMinutes
    );

    // Calculate remaining time
    const expiresAt = new Date(qrResult.expires_at);
    const now = new Date();
    const validForSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    // Return encrypted QR code for redemption system
    return res.status(200).json({
      success: true,
      qr_image: qrResult.qr_image,        // For display to user
      encrypted_data: qrResult.encrypted_data,  // For venue scanning API
      ticket_code: qrResult.ticket_code,
      expires_at: qrResult.expires_at,
      valid_for_seconds: validForSeconds,
      issued_at: new Date().toISOString(),
      jti: qrResult.jti  // JWT ID for tracking
    });
  } catch (error) {
    logger.error('qr.router.error', {
      ticket_code: req.params.code,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Handle specific errors
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('TICKET_NOT_FOUND')) {
        return res.status(404).json({
          error: 'TICKET_NOT_FOUND',
          message: 'No ticket found with this code'
        });
      }

      if (message.includes('INVALID_STATUS')) {
        return res.status(409).json({
          error: 'INVALID_STATUS',
          message: message.split(': ')[1] || 'Ticket status does not allow QR generation'
        });
      }

      if (message.includes('QR_ENCRYPTION_KEY') || message.includes('QR_SIGNER_SECRET')) {
        logger.error('qr.router.config_error', { error: message });
        return res.status(500).json({
          error: 'CONFIGURATION_ERROR',
          message: 'Server configuration error. Please contact administrator.'
        });
      }
    }

    // Generic error
    next(error);
  }
});

/**
 * GET /qr/:code/info
 *
 * Get ticket information without generating QR code
 * Useful for checking if QR generation is available
 *
 * @param code - Ticket code
 * @returns Ticket status and availability info
 */
router.get('/:code/info', unifiedAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketCode = req.params.code;

    logger.info('qr.router.info_request', {
      ticket_code: ticketCode,
      auth_type: req.authType
    });

    // Get ticket information using the service
    // This validates ownership and returns complete ticket details
    try {
      // Create auth context
      const authContext = {
        authType: req.authType!,
        userId: req.user?.id,
        partnerId: req.ota_partner?.id,
        operatorId: req.operator?.operator_id
      };

      // Try to fetch ticket info - try all sources without prefix-based restrictions
      let ticket;
      let ticketType = 'NORMAL';

      // Try database first (if available)
      if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
        const venueRepo = new VenueRepository(AppDataSource);
        ticket = await venueRepo.getTicketByCode(ticketCode);
        if (ticket) {
          ticketType = 'OTA';
        }
      }

      // Fallback to mock stores if not found in database
      if (!ticket) {
        ticket = mockDataStore.preGeneratedTickets.get(ticketCode);
        if (ticket) {
          ticketType = 'OTA';
        }
      }

      if (!ticket) {
        ticket = mockDataStore.getTicketByCode(ticketCode);
      }

      // Validate ownership based on ticket type (operators can view any ticket)
      if (ticket && authContext.authType !== 'OPERATOR') {
        if (ticketType === 'OTA' && ticket.partner_id !== authContext.partnerId) {
          throw new Error('UNAUTHORIZED');
        } else if (ticketType === 'NORMAL' && ticket.user_id !== authContext.userId) {
          throw new Error('UNAUTHORIZED');
        }
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        });
      }

      // Get product information (database first, then fallback to mock)
      let product: any = null;
      if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
        const productRepo = AppDataSource.getRepository(ProductEntity);
        const dbProduct = await productRepo.findOne({ where: { id: ticket.product_id } });
        if (dbProduct) {
          product = {
            id: dbProduct.id,
            name: dbProduct.name,
            description: dbProduct.description,
            entitlements: dbProduct.entitlements
          };
        }
      }
      if (!product) {
        product = mockDataStore.getProduct(ticket.product_id);
      }
      const productInfo = product ? {
        id: product.id,
        name: product.name
      } : {
        id: ticket.product_id,
        name: 'Unknown Product'
      };

      // Format entitlements with complete information (with fallback to product entitlements)
      const productEntitlements = product?.entitlements || product?.functions || [];
      const formattedEntitlements = (ticket.entitlements || []).map((e: any) => {
        // Fallback: find description from product entitlements if ticket doesn't have it
        let description = e.description || null;
        let label = e.label || e.function_code;

        if (!description || !e.label) {
          // Try to find matching entitlement in product by function_code/type
          const productEnt = productEntitlements.find((pe: any) =>
            pe.function_code === e.function_code || pe.type === e.function_code
          );
          if (productEnt) {
            if (!description) description = productEnt.description || null;
            if (!e.label) label = productEnt.label || productEnt.type || e.function_code;
          }
        }

        return {
          function_code: e.function_code,
          function_name: label,
          description,
          remaining_uses: e.remaining_uses,
          total_uses: e.total_uses || e.remaining_uses
        };
      });

      // Return ticket information with entitlements (aligned with US-012 requirements)
      return res.status(200).json({
        success: true,
        ticket_code: ticketCode,
        ticket_type: ticketType,
        status: ticket.status,
        // Customer information (顾客信息)
        customer_info: {
          type: ticket.customer_type || null,        // 'adult' | 'child' | 'elderly' (成人/小孩/老人)
          name: ticket.customer_name || null,        // 顾客姓名
          email: ticket.customer_email || null,      // 顾客邮箱
          phone: ticket.customer_phone || null       // 顾客电话
        },
        entitlements: formattedEntitlements,
        can_generate_qr: ['PRE_GENERATED', 'ACTIVATED', 'VERIFIED', 'active', 'partially_redeemed'].includes(ticket.status),
        product_info: productInfo,
        // Additional fields for backward compatibility and debugging
        product_id: ticket.product_id,
        order_id: ticket.order_id,
        batch_id: ticket.batch_id,
        partner_id: ticket.partner_id
      });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this ticket'
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
