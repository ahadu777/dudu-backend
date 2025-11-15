import { Router, Request, Response, NextFunction } from 'express';
import { unifiedAuth } from '../../middlewares/unified-auth';
import { unifiedQRService } from './service';
import { logger } from '../../utils/logger';
import { decryptAndVerifyQR } from '../../utils/qr-crypto';
import { mockDataStore } from '../../core/mock/data';
import { AppDataSource } from '../../config/database';
import { VenueRepository } from '../venue/domain/venue.repository';
import { dataSourceConfig } from '../../config/data-source';

const router = Router();

/**
 * POST /qr/decrypt
 *
 * Decrypt and verify QR code without redemption
 * Used by frontend apps to validate QR before showing to operators
 *
 * @body encrypted_data - Encrypted QR token string
 * @returns Decrypted ticket data with expiration status
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

    // Decrypt and verify QR code
    const result = await decryptAndVerifyQR(encrypted_data);

    logger.info('qr.decrypt.success', {
      jti: result.data.jti,
      ticket_code: result.data.ticket_code,
      is_expired: result.is_expired
    });

    // Return decrypted data
    return res.status(200).json({
      jti: result.data.jti,
      ticket_code: result.data.ticket_code,
      expires_at: result.data.expires_at,
      version: result.data.version,
      is_expired: result.is_expired,
      remaining_seconds: result.remaining_seconds
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

      // Try to fetch ticket info
      const ticketType = ticketCode.match(/^(CRUISE-|BATCH-|FERRY-|OTA-)/i) ? 'OTA' : 'NORMAL';

      let ticket;
      if (ticketType === 'OTA') {
        // Try database first for OTA tickets
        if (dataSourceConfig.useDatabase && AppDataSource.isInitialized) {
          const venueRepo = new VenueRepository(AppDataSource);
          ticket = await venueRepo.getTicketByCode(ticketCode);
        } else {
          // Fallback to mock store
          ticket = mockDataStore.preGeneratedTickets.get(ticketCode);
        }

        // Validate ownership (operators can view any ticket)
        if (ticket && authContext.authType !== 'OPERATOR' && ticket.partner_id !== authContext.partnerId) {
          throw new Error('UNAUTHORIZED');
        }
      } else {
        ticket = mockDataStore.getTicketByCode(ticketCode);

        // Validate ownership (operators can view any ticket)
        if (ticket && authContext.authType !== 'OPERATOR' && ticket.user_id !== authContext.userId) {
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

      // Get product information
      const product = mockDataStore.getProduct(ticket.product_id);
      const productInfo = product ? {
        id: product.id,
        name: product.name
      } : {
        id: ticket.product_id,
        name: 'Unknown Product'
      };

      // Format entitlements with complete information
      const formattedEntitlements = (ticket.entitlements || []).map((e: any) => ({
        function_code: e.function_code,
        function_name: e.label || e.function_code,
        remaining_uses: e.remaining_uses,
        total_uses: e.total_uses || e.remaining_uses
      }));

      // Return ticket information with entitlements (aligned with US-012 requirements)
      return res.status(200).json({
        success: true,
        ticket_code: ticketCode,
        ticket_type: ticketType,
        status: ticket.status,
        entitlements: formattedEntitlements,
        can_generate_qr: ['PRE_GENERATED', 'ACTIVE', 'USED', 'active', 'partially_redeemed'].includes(ticket.status),
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

/**
 * GET /qr/verify
 *
 * Verify ticket QR code scanned by WeChat
 * This endpoint is designed for WeChat in-app browser display
 *
 * @query t - Encrypted token (contains all ticket info)
 * @returns HTML page showing ticket verification status
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const encryptedToken = req.query.t as string;

    logger.info('qr.verify.request', {
      has_token: !!encryptedToken,
      user_agent: req.headers['user-agent'],
      ip: req.ip
    });

    // Validate parameters
    if (!encryptedToken) {
      return res.status(400).send(generateErrorHTML(
        '参数错误',
        '二维码格式不正确，请重新扫描',
        'INVALID_PARAMETERS'
      ));
    }

    // Decrypt and verify token (contains all info including ticket_code)
    let decryptResult;
    try {
      decryptResult = await decryptAndVerifyQR(encryptedToken);
    } catch (error) {
      logger.warn('qr.verify.decryption_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(401).send(generateErrorHTML(
        '验证失败',
        '二维码已过期或无效，请重新生成',
        'TOKEN_EXPIRED_OR_INVALID'
      ));
    }

    const decryptedData = decryptResult.data;
    const ticketCode = decryptedData.ticket_code; // Get ticket code from decrypted data

    // Check token expiration
    if (decryptResult.is_expired) {
      const expiredAt = new Date(decryptedData.expires_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      return res.status(401).send(generateErrorHTML(
        '二维码已过期',
        `此二维码已于 ${expiredAt} 过期，请重新生成`,
        'QR_EXPIRED'
      ));
    }

    // Fetch ticket information
    let ticket;
    let ticketType = 'NORMAL';

    // Try OTA tickets first
    const otaTicket = mockDataStore.preGeneratedTickets.get(ticketCode);
    if (otaTicket) {
      ticket = {
        code: otaTicket.ticket_code,
        product_id: otaTicket.product_id,
        status: otaTicket.status,
        order_id: otaTicket.order_id,
        batch_id: otaTicket.batch_id,
        partner_id: otaTicket.partner_id
      };
      ticketType = 'OTA';
    } else {
      // Try normal tickets
      const normalTicket = mockDataStore.getTicketByCode(ticketCode);
      if (normalTicket) {
        ticket = {
          code: normalTicket.code,
          status: normalTicket.status,
          order_id: normalTicket.order_id?.toString()
        };
      }
    }

    if (!ticket) {
      return res.status(404).send(generateErrorHTML(
        '票券不存在',
        '未找到此票券，请联系客服',
        'TICKET_NOT_FOUND'
      ));
    }

    // Get product information
    const product = mockDataStore.getProduct(ticket.product_id || 0);

    // Generate success HTML
    const expiresAt = new Date(decryptedData.expires_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const timeRemaining = decryptResult.remaining_seconds > 0
      ? Math.floor(decryptResult.remaining_seconds / 60)
      : 0;

    logger.info('qr.verify.success', {
      ticket_code: ticketCode,
      ticket_type: ticketType,
      status: ticket.status,
      product_name: product?.name
    });

    return res.status(200).send(generateSuccessHTML(
      ticketCode,
      ticket,
      product,
      expiresAt,
      timeRemaining,
      ticketType
    ));

  } catch (error) {
    logger.error('qr.verify.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).send(generateErrorHTML(
      '系统错误',
      '验证过程中发生错误，请稍后重试',
      'INTERNAL_ERROR'
    ));
  }
});

// Helper functions for HTML generation
function generateSuccessHTML(
  ticketCode: string,
  ticket: any,
  product: any,
  expiresAt: string,
  timeRemaining: number,
  ticketType: string
): string {
  const statusText = getStatusText(ticket.status);
  const statusColor = getStatusColor(ticket.status);

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>票券验证成功</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 20px 20px 0 0;
    }
    .checkmark {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: white;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
    }
    .content {
      padding: 30px;
    }
    .ticket-code {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 20px;
      font-family: monospace;
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #667eea;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .label { color: #666; font-size: 14px; }
    .value { color: #333; font-weight: 600; font-size: 16px; text-align: right; }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .status-active { background: #d4edda; color: #155724; }
    .status-used { background: #f8d7da; color: #721c24; }
    .status-pending { background: #fff3cd; color: #856404; }
    .timer {
      background: #e7f3ff;
      color: #0066cc;
      padding: 10px;
      border-radius: 8px;
      text-align: center;
      margin-top: 15px;
      font-size: 14px;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      background: #f8f9fa;
      border-radius: 0 0 20px 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="checkmark">✓</div>
      <h1>票券验证成功</h1>
    </div>
    <div class="content">
      <div class="ticket-code">${ticketCode}</div>
      ${product ? `<div class="info-row"><span class="label">产品名称</span><span class="value">${product.name}</span></div>` : ''}
      <div class="info-row"><span class="label">票券状态</span><span class="value"><span class="status ${statusColor}">${statusText}</span></span></div>
      <div class="info-row"><span class="label">票券类型</span><span class="value">${ticketType === 'OTA' ? 'OTA合作伙伴' : '直销票券'}</span></div>
      ${ticket.order_id ? `<div class="info-row"><span class="label">订单编号</span><span class="value">${ticket.order_id}</span></div>` : ''}
      <div class="info-row"><span class="label">验证时间</span><span class="value">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span></div>
      ${timeRemaining > 0 ? `<div class="timer">⏱️ 此二维码将在 ${timeRemaining} 分钟后过期</div>` : ''}
    </div>
    <div class="footer">
      <p>此页面仅供验证使用</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateErrorHTML(title: string, message: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 30px;
      border-radius: 20px 20px 0 0;
    }
    .error-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: white;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
    }
    .content { padding: 30px; }
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .error-code {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #999;
    }
    .footer {
      padding: 20px;
      background: #f8f9fa;
      color: #999;
      font-size: 12px;
      border-radius: 0 0 20px 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="error-icon">✕</div>
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p class="message">${message}</p>
      <div class="error-code">错误代码: ${code}</div>
    </div>
    <div class="footer">
      <p>如有疑问，请联系客服</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'PRE_GENERATED': '待激活',
    'ACTIVE': '可使用',
    'pending': '待激活',
    'active': '可使用',
    'used': '已使用',
    'expired': '已过期',
    'partially_redeemed': '部分使用'
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'PRE_GENERATED': 'status-pending',
    'ACTIVE': 'status-active',
    'pending': 'status-pending',
    'active': 'status-active',
    'used': 'status-used',
    'expired': 'status-used',
    'partially_redeemed': 'status-active'
  };
  return colorMap[status] || 'status-pending';
}

export default router;
