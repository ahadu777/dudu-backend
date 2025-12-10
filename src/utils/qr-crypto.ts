import crypto from 'crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';
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

/**
 * QR Color Configuration
 */
export interface QRColorConfig {
  dark_color?: string;   // QR foreground color (default: #CC0000)
  light_color?: string;  // QR background color (default: #FFFFFF)
}

// Default QR colors
const DEFAULT_QR_DARK_COLOR = '#CC0000';
const DEFAULT_QR_LIGHT_COLOR = '#FFFFFF';

// QR size constant (shared between functions)
const QR_SIZE = 180;

// Pre-processed logo cache (for bulk generation optimization)
let cachedProcessedLogo: { buffer: Buffer; sourceHash: string } | null = null;

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
 * Pre-process logo for bulk QR generation (call once before generating many QRs)
 * This avoids re-processing the same logo for each QR code
 * @param logoBuffer - Raw logo image buffer
 * @returns Processed logo buffer ready for compositing, or null if no logo
 */
export async function preprocessLogoForBulk(logoBuffer: Buffer | null | undefined): Promise<Buffer | null> {
  if (!logoBuffer) {
    return null;
  }

  // Create hash of source buffer for cache validation
  const sourceHash = crypto.createHash('md5').update(logoBuffer).digest('hex');

  // Check cache
  if (cachedProcessedLogo && cachedProcessedLogo.sourceHash === sourceHash) {
    logger.info('qr.logo.cache_hit', { hash: sourceHash.substring(0, 8) });
    return cachedProcessedLogo.buffer;
  }

  const logoSize = Math.floor(QR_SIZE * 0.15); // Logo occupies 15%

  logger.info('qr.logo.preprocessing', {
    qr_size: QR_SIZE,
    logo_size: logoSize,
    source_size_kb: Math.round(logoBuffer.length / 1024)
  });

  // Process logo once: resize and add white border for contrast
  const processedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .extend({
      top: 3,
      bottom: 3,
      left: 3,
      right: 3,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toBuffer();

  // Cache the result
  cachedProcessedLogo = { buffer: processedLogo, sourceHash };

  logger.info('qr.logo.preprocessed', {
    processed_size_bytes: processedLogo.length,
    cached: true
  });

  return processedLogo;
}

/**
 * Clear the logo cache (call when logo changes or after bulk operation)
 */
export function clearLogoCache(): void {
  cachedProcessedLogo = null;
  logger.info('qr.logo.cache_cleared');
}

/**
 * Generate PNG QR code image from encrypted data with optional logo overlay
 * @param encryptedData - Encrypted data string
 * @param logoBuffer - Optional logo image buffer to overlay in center (can be pre-processed or raw)
 * @param colorConfig - Optional color configuration for QR code
 * @param isPreprocessed - If true, logoBuffer is already processed and won't be resized again
 * @returns Base64-encoded PNG image (data:image/png;base64,...)
 */
async function generateQRImage(
  encryptedData: string,
  logoBuffer?: Buffer,
  colorConfig?: QRColorConfig,
  isPreprocessed: boolean = false
): Promise<string> {
  const darkColor = colorConfig?.dark_color || DEFAULT_QR_DARK_COLOR;
  const lightColor = colorConfig?.light_color || DEFAULT_QR_LIGHT_COLOR;

  const options = {
    errorCorrectionLevel: logoBuffer ? ('H' as const) : ('M' as const), // High correction when logo present
    type: 'png' as const,
    margin: 2,
    width: QR_SIZE,
    color: {
      dark: darkColor,
      light: lightColor
    }
  };

  try {
    // Step 1: Generate base QR code
    const qrBuffer = await QRCode.toBuffer(encryptedData, options);

    // Step 2: If logo provided, overlay it in center
    if (logoBuffer) {
      const logoSize = Math.floor(QR_SIZE * 0.15);
      const position = Math.floor((QR_SIZE - logoSize) / 2); // Center position

      let processedLogo: Buffer;

      if (isPreprocessed) {
        // Logo already processed, use directly
        processedLogo = logoBuffer;
      } else {
        // Process logo: resize and add white border for contrast
        logger.info('qr.generation.logo_processing', {
          qr_size: QR_SIZE,
          logo_size: logoSize,
          coverage_percent: 15
        });

        processedLogo = await sharp(logoBuffer)
          .resize(logoSize, logoSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .extend({
            top: 3,
            bottom: 3,
            left: 3,
            right: 3,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toBuffer();
      }

      // Overlay logo onto QR code with PNG compression
      // Using compressionLevel: 6 for better performance (9 is too slow for bulk generation)
      // For 180x180 QR codes, the file size difference is minimal (~5-10%)
      const qrWithLogo = await sharp(qrBuffer).composite([
        {
          input: processedLogo,
          top: position,
          left: position,
          blend: 'over'
        }
      ])
      .png({ compressionLevel: 6, quality: 90 })
      .toBuffer();

      // Convert to base64 data URI
      const base64 = qrWithLogo.toString('base64');
      if (!isPreprocessed) {
        logger.info('qr.generation.logo_applied', {
          final_size_kb: Math.round(qrWithLogo.length / 1024)
        });
      }
      return `data:image/png;base64,${base64}`;
    }

    // Step 3: No logo - return plain QR code
    const base64 = Buffer.from(qrBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    logger.error('qr.generation.failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      has_logo: !!logoBuffer
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
 * @param logoBuffer - Optional logo image buffer to overlay (for branded QR codes)
 * @param colorConfig - Optional color configuration for QR code
 * @param isLogoPreprocessed - If true, logoBuffer is already processed (for bulk generation)
 * @returns Encrypted QR result with image
 */
export async function generateSecureQR(
  ticketCode: string,
  expiryMinutes?: number,
  logoBuffer?: Buffer,
  colorConfig?: QRColorConfig,
  isLogoPreprocessed: boolean = false
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

  // Only log for non-bulk operations to reduce log noise
  if (!isLogoPreprocessed) {
    logger.info('qr.generation.started', {
      jti,
      ticket_code: ticketCode,
      expires_in_minutes: expiryTime
    });
  }

  // Step 1: Encrypt minimal data
  const encrypted = encryptData(qrData);

  // Step 2: Sign encrypted data
  const signature = signData(encrypted);

  // Step 3: Combine: encrypted:signature
  const signedData = `${encrypted}:${signature}`;

  // Step 4: Generate QR image with optional logo and colors
  const qrImage = await generateQRImage(signedData, logoBuffer, colorConfig, isLogoPreprocessed);

  if (!isLogoPreprocessed) {
    logger.info('qr.generation.success', {
      jti,
      ticket_code: ticketCode,
      expires_at: expiresAt.toISOString()
    });
  }

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
