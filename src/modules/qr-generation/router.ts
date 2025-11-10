import { Router, Request, Response, NextFunction } from 'express';
import { unifiedAuth } from '../../middlewares/unified-auth';
import { unifiedQRService } from './service';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /qr/:code
 *
 * Generate secure QR code for a ticket
 * Supports both OTA and normal tickets
 *
 * Authentication:
 * - Users: Authorization: Bearer <jwt_token>
 * - OTA Partners: X-API-Key: <api_key>
 *
 * @param code - Ticket code (e.g., TKT-123-001 or CRUISE-2025-FERRY-123)
 * @returns Encrypted QR code image and metadata
 */
router.post('/:code', unifiedAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketCode = req.params.code;
    const expiryMinutes = req.body?.expiry_minutes; // Optional custom expiry

    logger.info('qr.router.request', {
      ticket_code: ticketCode,
      auth_type: req.authType,
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

    // Generate QR code
    const qrResult = await unifiedQRService.generateQRFromRequest(
      req,
      ticketCode,
      expiryMinutes
    );

    // Calculate remaining time
    const expiresAt = new Date(qrResult.expires_at);
    const now = new Date();
    const validForSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    return res.status(200).json({
      success: true,
      qr_image: qrResult.qr_image,
      ticket_code: qrResult.ticket_code,
      expires_at: qrResult.expires_at,
      valid_for_seconds: validForSeconds,
      issued_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('qr.router.error', {
      ticket_code: req.params.code,
      auth_type: req.authType,
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

      if (message.includes('UNAUTHORIZED')) {
        return res.status(403).json({
          error: 'UNAUTHORIZED',
          message: 'You do not have permission to access this ticket'
        });
      }

      if (message.includes('TICKET_TYPE_MISMATCH')) {
        return res.status(403).json({
          error: 'TICKET_TYPE_MISMATCH',
          message: message.split(': ')[1] || 'Ticket type does not match authentication method'
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

    // This would be similar to generateQR but without actual QR generation
    // For now, return a simple status
    return res.status(200).json({
      success: true,
      ticket_code: ticketCode,
      qr_generation_available: true,
      message: 'Use POST /api/tickets/:code/qr to generate QR code'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
