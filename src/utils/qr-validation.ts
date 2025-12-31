/**
 * QR 票据验证共享服务
 *
 * 提供统一的 QR 验证逻辑，被以下 API 共用：
 * - POST /qr/decrypt - 解密 QR 码并返回票据信息
 * - POST /venue/scan - 验证并核销票据权益
 *
 * 验证步骤（共享）：
 * 1. 解密并验证 QR 签名
 * 2. 查询票据
 * 3. OTA 范围检查
 * 4. 小程序 QR 过期检查
 * 5. JTI 验证（一码失效）
 *
 * 注意：不包含 /venue/scan 特有的逻辑：
 * - 防重放检查（JTI + function_code）
 * - 权益核销
 */

import { decryptAndVerifyQR, DecryptedQRResult } from './qr-crypto';
import { logger } from './logger';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * QR 解密结果（从 qr-crypto.ts 重新导出，便于使用）
 */
export interface QRDecryptResult {
  jti: string;
  ticket_code: string;
  expires_at: string;
  version: number;
  is_expired: boolean;
  remaining_seconds: number;
}

/**
 * 票据信息（统一 OTA 和小程序票券）
 */
export interface TicketInfo {
  ticket_code: string;
  product_id: number | null;
  status: string;
  entitlements: Array<{ function_code: string; remaining_uses: number }>;
  ticket_type: 'OTA' | 'MINIPROGRAM';
  partner_id?: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_type?: string | null;
  raw?: any;
  extra?: any;
}

/**
 * 操作员上下文（从 JWT 中间件注入）
 */
export interface OperatorContext {
  operator_id?: number;
  operator_type?: 'INTERNAL' | 'OTA';
  partner_id?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  success: boolean;
  qr?: QRDecryptResult;
  ticket?: TicketInfo;
  error?: ValidationError;
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * 验证错误码
 */
export type ValidationErrorCode =
  | 'QR_DECRYPTION_FAILED'
  | 'QR_SIGNATURE_INVALID'
  | 'QR_INVALID_FORMAT'
  | 'TICKET_NOT_FOUND'
  | 'OTA_SCOPE_MISMATCH'
  | 'QR_EXPIRED'
  | 'QR_SUPERSEDED';

/**
 * 票据查询函数类型
 * 用于依赖注入，解耦与 VenueRepository 的直接依赖
 */
export type GetTicketByCodeFn = (ticketCode: string) => Promise<TicketInfo | null>;

// ============================================================================
// Core Validation Function
// ============================================================================

/**
 * 统一验证 QR 票据
 *
 * 执行 5 步验证：
 * 1. 解密并验证 QR 签名
 * 2. 查询票据
 * 3. OTA 范围检查
 * 4. 小程序 QR 过期检查
 * 5. JTI 验证（一码失效）
 *
 * @param encryptedData - 加密的 QR 数据
 * @param getTicketByCode - 票据查询函数（依赖注入）
 * @param operator - 可选的操作员上下文（用于 OTA 范围检查）
 * @returns ValidationResult
 */
export async function validateTicketQR(
  encryptedData: string,
  getTicketByCode: GetTicketByCodeFn,
  operator?: OperatorContext
): Promise<ValidationResult> {
  logger.info('qr.validation.started', {
    has_operator: !!operator,
    operator_type: operator?.operator_type
  });

  // ========================================
  // Step 1: 解密并验证 QR 签名
  // ========================================
  let decryptResult: DecryptedQRResult;
  try {
    decryptResult = await decryptAndVerifyQR(encryptedData);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    logger.warn('qr.validation.decrypt_failed', { error: errorMsg });

    // 根据错误类型返回对应的错误码
    if (errorMsg.includes('QR_SIGNATURE_INVALID')) {
      return createErrorResult('QR_SIGNATURE_INVALID', 'QR code has been tampered with');
    }
    if (errorMsg.includes('QR_INVALID_FORMAT')) {
      return createErrorResult('QR_INVALID_FORMAT', 'Invalid QR code format');
    }
    return createErrorResult('QR_DECRYPTION_FAILED', 'Unable to decrypt QR code');
  }

  const { ticket_code: ticketCode, jti } = decryptResult.data;

  const qrDecryptResult: QRDecryptResult = {
    jti,
    ticket_code: ticketCode,
    expires_at: decryptResult.data.expires_at,
    version: decryptResult.data.version,
    is_expired: decryptResult.is_expired,
    remaining_seconds: decryptResult.remaining_seconds
  };

  logger.info('qr.validation.decrypted', {
    ticket_code: ticketCode,
    jti,
    qr_expired: decryptResult.is_expired
  });

  // ========================================
  // Step 2: 查询票据
  // ========================================
  const ticket = await getTicketByCode(ticketCode);

  if (!ticket) {
    logger.warn('qr.validation.ticket_not_found', { ticket_code: ticketCode });
    return createErrorResult('TICKET_NOT_FOUND', 'Ticket not found', {
      jti,
      ticket_code: ticketCode
    });
  }

  logger.info('qr.validation.ticket_found', {
    ticket_code: ticketCode,
    ticket_type: ticket.ticket_type,
    status: ticket.status
  });

  // ========================================
  // Step 3: OTA 范围检查
  // - 如果操作员是 OTA 类型，验证票券 partner_id 是否匹配
  // - 不匹配则返回错误（无权访问此票券）
  // ========================================
  if (operator?.operator_type === 'OTA' && operator.partner_id) {
    const ticketPartnerId = ticket.partner_id;
    if (ticketPartnerId && ticketPartnerId !== operator.partner_id) {
      logger.warn('qr.validation.ota_scope_mismatch', {
        ticket_code: ticketCode,
        ticket_partner_id: ticketPartnerId,
        operator_partner_id: operator.partner_id,
        reason: 'OTA operator cannot access ticket from another OTA'
      });

      return createErrorResult('OTA_SCOPE_MISMATCH', 'OTA operator cannot access ticket from another OTA', {
        jti,
        ticket_code: ticketCode,
        ticket_partner_id: ticketPartnerId,
        operator_partner_id: operator.partner_id
      });
    }
  }

  // ========================================
  // Step 4: 小程序 QR 过期检查
  // - OTA 票券：QR 码长期有效，不检查过期
  // - 小程序票券：QR 码有 30 分钟有效期，过期后需重新生成
  // ========================================
  if (ticket.ticket_type === 'MINIPROGRAM' && decryptResult.is_expired) {
    logger.warn('qr.validation.qr_expired', {
      ticket_code: ticketCode,
      ticket_type: ticket.ticket_type,
      qr_expires_at: decryptResult.data.expires_at,
      reason: 'Miniprogram QR code has expired'
    });

    return createErrorResult('QR_EXPIRED', 'QR code has expired', {
      jti,
      ticket_code: ticketCode,
      expires_at: decryptResult.data.expires_at,
      remaining_seconds: decryptResult.remaining_seconds
    });
  }

  // ========================================
  // Step 5: JTI 验证（一码失效机制）
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
    logger.warn('qr.validation.jti_mismatch', {
      ticket_code: ticketCode,
      qr_jti: jti,
      current_jti: currentJti,
      ticket_type: ticket.ticket_type,
      reason: 'QR code superseded by newer one'
    });

    return createErrorResult('QR_SUPERSEDED', 'QR code has been superseded by a newer one', {
      jti,
      ticket_code: ticketCode,
      current_jti: currentJti
    });
  }

  // ========================================
  // 验证通过
  // ========================================
  logger.info('qr.validation.success', {
    ticket_code: ticketCode,
    jti,
    ticket_type: ticket.ticket_type
  });

  return {
    success: true,
    qr: qrDecryptResult,
    ticket
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建验证失败结果
 */
function createErrorResult(
  code: ValidationErrorCode,
  message: string,
  details?: Record<string, any>
): ValidationResult {
  return {
    success: false,
    error: { code, message, details }
  };
}

/**
 * 将验证错误码映射到 HTTP 状态码
 *
 * 用于 /qr/decrypt API（保持向后兼容）
 */
export function mapErrorCodeToHttpStatus(code: ValidationErrorCode): number {
  const statusMap: Record<ValidationErrorCode, number> = {
    'QR_DECRYPTION_FAILED': 401,
    'QR_SIGNATURE_INVALID': 401,
    'QR_INVALID_FORMAT': 400,
    'TICKET_NOT_FOUND': 404,
    'OTA_SCOPE_MISMATCH': 403,
    'QR_EXPIRED': 401,
    'QR_SUPERSEDED': 401
  };
  return statusMap[code] || 500;
}

/**
 * 将验证错误码映射到 /venue/scan 的拒绝原因
 *
 * /venue/scan 使用 422 状态码 + reason 字段
 */
export function mapErrorCodeToRejectReason(code: ValidationErrorCode): string {
  const reasonMap: Record<ValidationErrorCode, string> = {
    'QR_DECRYPTION_FAILED': 'QR_INVALID',
    'QR_SIGNATURE_INVALID': 'QR_TAMPERED',
    'QR_INVALID_FORMAT': 'QR_FORMAT_INVALID',
    'TICKET_NOT_FOUND': 'TICKET_NOT_FOUND',
    'OTA_SCOPE_MISMATCH': 'OTA_SCOPE_MISMATCH',
    'QR_EXPIRED': 'QR_EXPIRED',
    'QR_SUPERSEDED': 'QR_SUPERSEDED'
  };
  return reasonMap[code] || 'INTERNAL_ERROR';
}
