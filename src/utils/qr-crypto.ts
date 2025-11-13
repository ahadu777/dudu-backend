import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * QR Code Data Structure (Minimized for optimal QR density)
 *
 * Only essential data is stored in QR code.
 * All other ticket details (product_id, ticket_type, order_id, etc.)
 * are retrieved via ticket_code lookup during verification.
 */
export interface QRTicketData {
  jti: string;         // JWT ID - Unique identifier for replay attack prevention
  ticket_code: string; // Ticket code - Used to lookup full ticket details
  expires_at: string;  // ISO 8601 - QR expiration time (independent from ticket validity)
  version: number;     // Format version for future compatibility
}

/**
 * Encrypted QR Result
 */
export interface EncryptedQRResult {
  encrypted_data: string;  // Format: iv:encrypted:authTag:signature
  qr_image: string;       // data:image/png;base64,...
  expires_at: string;     // ISO 8601
  ticket_code: string;
  jti: string;            // JWT ID for tracking and logging
}

/**
 * Decrypted QR Result
 */
export interface DecryptedQRResult {
  data: QRTicketData;
  is_expired: boolean;
  remaining_seconds: number;
}

// Constants
const IV_LENGTH = 12; // GCM recommends 12 bytes
const AUTH_TAG_LENGTH = 16; // GCM auth tag is 16 bytes
const SIGNATURE_LENGTH = 16; // Use first 16 chars of HMAC

/**
 * Get encryption key from environment (must be 32 bytes for AES-256)
 */
function getEncryptionKey(): Buffer {
  const keyHex = env.QR_ENCRYPTION_KEY || '';
  if (keyHex.length !== 64) {
    throw new Error('QR_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Get signing secret from environment
 */
function getSignerSecret(): string {
  const secret = env.QR_SIGNER_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('QR_SIGNER_SECRET must be at least 32 characters');
  }
  return secret;
}

/**
 * Encrypt QR ticket data using AES-256-GCM
 * @param data - Ticket data to encrypt
 * @returns Encrypted string in format: iv:encrypted:authTag
 */
function encryptData(data: QRTicketData): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(data);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt QR ticket data using AES-256-GCM
 * @param encryptedString - Encrypted string in format: iv:encrypted:authTag
 * @returns Decrypted ticket data
 */
function decryptData(encryptedString: string): QRTicketData {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, encryptedHex, authTagHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as QRTicketData;
}

/**
 * Sign data using HMAC-SHA256
 * @param data - Data to sign
 * @returns Signature (first 16 chars of hex)
 */
function signData(data: string): string {
  const secret = getSignerSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex').substring(0, SIGNATURE_LENGTH);
}

/**
 * Verify HMAC signature
 * @param data - Data that was signed
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
function verifySignature(data: string, signature: string): boolean {
  const expected = signData(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Generate PNG QR code image from encrypted data
 * @param encryptedData - Encrypted data string
 * @returns Base64-encoded PNG image (data:image/png;base64,...)
 */
async function generateQRImage(encryptedData: string): Promise<string> {
  const options = {
    errorCorrectionLevel: 'M' as const, // Medium error correction (better for dense data)
    type: 'image/png' as const,
    margin: 2, // Larger margin for better scanning
    width: 150, 
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  try {
    const qrImage = await QRCode.toDataURL(encryptedData, options);
    return qrImage;
  } catch (error) {
    logger.error('qr.generation.failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to generate QR code image');
  }
}

/**
 * Check if QR code has expired
 * @param data - Decrypted QR ticket data
 * @returns True if expired
 */
export function isQrExpired(data: QRTicketData): boolean {
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  return now > expiresAt;
}

/**
 * Get remaining seconds until expiration
 * @param data - Decrypted QR ticket data
 * @returns Remaining seconds (negative if expired)
 */
export function getRemainingSeconds(data: QRTicketData): number {
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  return Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
}

/**
 * Generate secure QR code (encrypt + sign + generate image)
 * @param ticketCode - Ticket code (only essential data stored in QR)
 * @param expiryMinutes - QR code expiration time in minutes (default from env)
 * @returns Encrypted QR result with image
 */
export async function generateSecureQR(
  ticketCode: string,
  expiryMinutes?: number
): Promise<EncryptedQRResult> {
  const now = new Date();
  const expiryTime = expiryMinutes || Number(env.QR_EXPIRY_MINUTES) || 30;
  const expiresAt = new Date(now.getTime() + expiryTime * 60 * 1000);

  // Generate unique JTI for tracking and replay attack prevention
  const jti = crypto.randomUUID();

  // Minimized QR data structure (only essential fields)
  const qrData: QRTicketData = {
    jti,
    ticket_code: ticketCode,
    expires_at: expiresAt.toISOString(),
    version: 1 // Format version for future compatibility
  };

  logger.info('qr.generation.started', {
    jti,
    ticket_code: ticketCode,
    expires_in_minutes: expiryTime
  });

  // Step 1: Encrypt minimal data
  const encrypted = encryptData(qrData);

  // Step 2: Sign encrypted data
  const signature = signData(encrypted);

  // Step 3: Combine: encrypted:signature
  const signedData = `${encrypted}:${signature}`;

  // Step 4: Generate QR image
  const qrImage = await generateQRImage(signedData);

  logger.info('qr.generation.success', {
    jti,
    ticket_code: ticketCode,
    expires_at: expiresAt.toISOString()
  });

  return {
    encrypted_data: signedData,
    qr_image: qrImage,
    expires_at: expiresAt.toISOString(),
    ticket_code: ticketCode,
    jti
  };
}

/**
 * Decrypt and verify QR code
 * @param encryptedData - Encrypted data string (iv:encrypted:authTag:signature)
 * @returns Decrypted ticket data with expiration info
 * @throws Error if signature invalid or decryption fails
 */
export async function decryptAndVerifyQR(
  encryptedData: string
): Promise<DecryptedQRResult> {
  logger.info('qr.verification.started');

  // Step 1: Split signature from encrypted data
  const lastColonIndex = encryptedData.lastIndexOf(':');
  if (lastColonIndex === -1) {
    throw new Error('QR_INVALID_FORMAT: Missing signature');
  }

  const encrypted = encryptedData.substring(0, lastColonIndex);
  const signature = encryptedData.substring(lastColonIndex + 1);

  // Step 2: Verify signature
  if (!verifySignature(encrypted, signature)) {
    logger.warn('qr.verification.signature_failed');
    throw new Error('QR_SIGNATURE_INVALID: QR code has been tampered with');
  }

  // Step 3: Decrypt data
  let data: QRTicketData;
  try {
    data = decryptData(encrypted);
  } catch (error) {
    logger.error('qr.verification.decryption_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('QR_DECRYPTION_FAILED: Unable to decrypt QR code');
  }

  // Step 4: Check expiration
  const expired = isQrExpired(data);
  const remaining = getRemainingSeconds(data);

  logger.info('qr.verification.success', {
    jti: data.jti,
    ticket_code: data.ticket_code,
    is_expired: expired,
    remaining_seconds: remaining
  });

  return {
    data,
    is_expired: expired,
    remaining_seconds: remaining
  };
}

/**
 * Validate QR format without full decryption (quick check)
 * @param qrString - QR code string
 * @returns True if format is valid
 */
export function isValidQRFormat(qrString: string): boolean {
  // Expected format: iv:encrypted:authTag:signature
  // At least 4 parts separated by colons
  const parts = qrString.split(':');
  return parts.length >= 4;
}

/**
 * Extract QR data from data URI if needed
 * @param qrInput - QR input (can be data URI or plain string)
 * @returns Plain encrypted string
 */
export function extractQRData(qrInput: string): string {
  // If it's a data URI (data:image/png;base64,...), this would need QR decoding
  // For now, we assume the encrypted string is passed directly
  if (qrInput.startsWith('data:image/png;base64,')) {
    throw new Error('QR_SCAN_REQUIRED: Image-based QR codes must be scanned first');
  }
  return qrInput;
}
