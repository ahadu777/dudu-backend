import { customAlphabet } from 'nanoid';
import { logger } from './logger';

// 纯字母数字字母表，避免生成 DT--xxx 或 DT-_xxx 这样的票券码
const SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface TicketCodeGenerator {
  generate(prefix?: string): string;
  generateWithRetry(checkExists: (code: string) => Promise<boolean>, prefix?: string): Promise<string>;
}

/**
 * Secure ticket code generator using nanoid
 *
 * Collision probability with nanoid(12) using 63-char alphabet:
 * - 1,000 tickets: 0.0000000001%
 * - 1,000,000 tickets: 0.00001%
 * - 1,000,000,000 tickets: 0.01%
 *
 * Database UNIQUE constraints provide final protection against the astronomically unlikely collision.
 */
class SecureTicketCodeGenerator implements TicketCodeGenerator {
  private readonly ID_LENGTH = 12; // 62^12 ≈ 3.2 × 10^21 combinations
  private readonly nanoid = customAlphabet(SAFE_ALPHABET, this.ID_LENGTH);

  /**
   * Generate secure ticket code
   * @param prefix Prefix string (default 'TKT')
   * @returns Ticket code (e.g., 'TKT-V1StGXR8_Z5j')
   */
  generate(prefix: string = 'TKT'): string {
    return `${prefix}-${this.nanoid()}`;
  }

  /**
   * Generate ticket code with duplicate check (extra safety layer)
   * @param checkExists Function to check if code already exists
   * @param prefix Prefix string (default 'TKT')
   * @returns Guaranteed unique ticket code
   */
  async generateWithRetry(
    checkExists: (code: string) => Promise<boolean>,
    prefix: string = 'TKT'
  ): Promise<string> {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const ticketCode = this.generate(prefix);
      const exists = await checkExists(ticketCode);

      if (!exists) {
        return ticketCode;
      }

      // Log collision (this should theoretically never happen)
      logger.warn('ticket_code.collision_detected', {
        ticketCode,
        attempt,
        probability: '< 0.01% for 1 billion tickets',
        message: 'This is extremely rare. Please investigate if this appears frequently.'
      });
    }

    // If all 3 attempts collide (astronomically unlikely), throw error
    throw new Error('Failed to generate unique ticket code after 3 attempts. This should never happen.');
  }
}

export const ticketCodeGenerator = new SecureTicketCodeGenerator();
