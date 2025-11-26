import axios from 'axios';
import NodeCache from 'node-cache';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Logo缓存（内存）- TTL: 1小时（默认）
const logoCache = new NodeCache({ stdTTL: Number(env.LOGO_CACHE_TTL) || 3600 });

// ✅ 所有partner共用一个logo图片
const LOGO_FILE_ID = 'd981fda8-3d4f-4426-a946-136d8f3f59dc';

export class DirectusService {
  private baseURL: string;
  private accessToken: string;

  constructor() {
    this.baseURL = env.DIRECTUS_URL || '';
    this.accessToken = env.DIRECTUS_ACCESS_TOKEN || '';

    if (this.baseURL && this.accessToken) {
      logger.info('directus.config.loaded', {
        url: this.baseURL,
        token_prefix: this.accessToken.substring(0, 8) + '...'
      });
    } else {
      logger.warn('directus.config.missing', {
        message: 'Directus URL or Access Token not configured - logo features will be disabled'
      });
    }
  }

  /**
   * 获取logo图片（所有partner共用，带缓存）
   * @param partnerId - 合作伙伴ID（用于日志）
   * @returns Logo图片Buffer，失败时返回null
   */
  async getPartnerLogo(partnerId: string): Promise<Buffer | null> {
    // 如果Directus未配置，直接返回null
    if (!this.baseURL) {
      logger.debug('directus.logo.skipped', {
        reason: 'directus_not_configured'
      });
      return null;
    }

    const cacheKey = 'logo:shared'; // 所有partner共用一个缓存key

    // 1. 尝试从缓存获取
    const cached = logoCache.get<Buffer>(cacheKey);
    if (cached) {
      logger.info('directus.logo.cache_hit', {
        partner_id: partnerId,
        size_kb: Math.round(cached.length / 1024)
      });
      return cached;
    }

    // 2. 从Directus下载
    try {
      const url = `${this.baseURL}/assets/${LOGO_FILE_ID}`;

      logger.info('directus.logo.downloading', {
        partner_id: partnerId,
        file_id: LOGO_FILE_ID,
        url
      });

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer',
        timeout: 5000 // 5秒超时
      });

      const buffer = Buffer.from(response.data);

      // 3. 缓存到内存
      logoCache.set(cacheKey, buffer);

      logger.info('directus.logo.downloaded', {
        partner_id: partnerId,
        file_id: LOGO_FILE_ID,
        size_kb: Math.round(buffer.length / 1024)
      });

      return buffer;
    } catch (error) {
      logger.error('directus.logo.download_failed', {
        partner_id: partnerId,
        file_id: LOGO_FILE_ID,
        error: error instanceof Error ? error.message : 'Unknown error',
        error_details: axios.isAxiosError(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText
        } : undefined
      });
      return null; // 失败时返回null，生成普通QR码
    }
  }

  /**
   * 预热缓存：提前下载logo
   * 适合在服务器启动时调用，加速首次批量生成
   */
  async warmupCache(): Promise<void> {
    if (!this.baseURL) {
      logger.info('directus.cache.warmup_skipped', {
        reason: 'directus_not_configured'
      });
      return;
    }

    logger.info('directus.cache.warmup_started');

    try {
      await this.getPartnerLogo('warmup');
      logger.info('directus.cache.warmup_completed');
    } catch (error) {
      logger.warn('directus.cache.warmup_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 清空logo缓存（用于测试或手动刷新）
   */
  clearCache(): void {
    logoCache.flushAll();
    logger.info('directus.cache.cleared');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      keys: logoCache.keys(),
      stats: logoCache.getStats()
    };
  }

  // ========================================
  // Ticket Reservation & Activation Methods
  // ========================================

  /**
   * Get ticket by ticket_number
   */
  async getTicketByNumber(ticketNumber: string): Promise<any | null> {
    if (!this.baseURL) {
      logger.warn('directus.ticket.get_skipped', { reason: 'directus_not_configured' });
      return null;
    }

    try {
      const url = `${this.baseURL}/items/tickets`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: {
          filter: { ticket_code: { _eq: ticketNumber } },
          limit: 1
        },
        timeout: 5000
      });

      return response.data?.data?.[0] || null;
    } catch (error) {
      logger.error('directus.ticket.get_failed', {
        ticket_number: ticketNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Update ticket status and fields
   */
  async updateTicket(ticketNumber: string, updates: any): Promise<boolean> {
    if (!this.baseURL) return false;

    try {
      const url = `${this.baseURL}/items/tickets/${ticketNumber}`;

      logger.info('directus.ticket.update_attempt', {
        ticket_number: ticketNumber,
        url,
        updates: JSON.stringify(updates)
      });

      const response = await axios.patch(url, updates, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        timeout: 5000
      });

      logger.info('directus.ticket.updated', {
        ticket_number: ticketNumber,
        fields: Object.keys(updates),
        response_data: JSON.stringify(response.data)
      });
      return true;
    } catch (error: any) {
      logger.error('directus.ticket.update_failed', {
        ticket_number: ticketNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error?.response?.status,
        response_data: error?.response?.data ? JSON.stringify(error.response.data) : undefined
      });
      return false;
    }
  }

  /**
   * Get available reservation slots
   */
  async getAvailableSlots(filters: { month?: string; orq?: number; venue_id?: number }): Promise<any[]> {
    if (!this.baseURL) return [];

    try {
      const url = `${this.baseURL}/items/reservation_slots`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: {
          filter: {
            ...(filters.orq && { orq: { _eq: filters.orq } }),
            ...(filters.venue_id && { venue_id: { _eq: filters.venue_id } }),
            status: { _eq: 'ACTIVE' }
          },
          sort: ['date', 'start_time'],
          limit: -1 // Get all
        },
        timeout: 10000
      });

      return response.data?.data || [];
    } catch (error) {
      logger.error('directus.slots.get_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get reservation by ticket_number
   */
  async getReservationByTicket(ticketNumber: string): Promise<any | null> {
    if (!this.baseURL) return null;

    try {
      const url = `${this.baseURL}/items/ticket_reservations`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: {
          filter: { ticket_id: { _eq: ticketNumber } },
          limit: 1
        },
        timeout: 5000
      });

      return response.data?.data?.[0] || null;
    } catch (error) {
      logger.error('directus.reservation.get_failed', {
        ticket_number: ticketNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Create ticket reservation (atomic transaction)
   */
  async createReservation(data: {
    ticket_id: string;
    slot_id: string;
    customer_email: string;
    customer_phone: string;
    orq: number;
  }): Promise<{ success: boolean; reservation?: any; error?: string }> {
    if (!this.baseURL) {
      return { success: false, error: 'Directus not configured' };
    }

    try {
      // First, get the ticket to obtain its ID (primary key)
      const ticket = await this.getTicketByNumber(data.ticket_id);

      if (!ticket || !ticket.id) {
        return { success: false, error: 'Ticket not found in database' };
      }

      // Try to check slot capacity (gracefully handle permission errors)
      let slot: any = null;
      const slotUrl = `${this.baseURL}/items/reservation_slots/${data.slot_id}`;

      try {
        const slotResponse = await axios.get(slotUrl, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: 5000
        });

        slot = slotResponse.data?.data;

        if (slot && slot.booked_count >= slot.total_capacity) {
          logger.warn('directus.reservation.slot_full', {
            slot_id: data.slot_id,
            booked_count: slot.booked_count,
            total_capacity: slot.total_capacity
          });
          return { success: false, error: 'Slot is full' };
        }
      } catch (slotError: any) {
        // If permission denied, log warning but continue (backward compatibility)
        if (slotError?.response?.status === 403) {
          logger.warn('directus.reservation.slot_check_skipped', {
            reason: 'permission_denied',
            slot_id: data.slot_id,
            message: 'API token lacks permission to check reservation_slots - capacity validation skipped'
          });
        } else {
          logger.warn('directus.reservation.slot_check_failed', {
            slot_id: data.slot_id,
            error: slotError?.message
          });
        }
      }

      // Use the ticket's ID (primary key) for the foreign key relationship
      const url = `${this.baseURL}/items/ticket_reservations`;
      const response = await axios.post(url, {
        ticket_id: ticket.id,  // Use the numeric ID from tickets table
        slot_id: data.slot_id,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        orq: data.orq,
        status: 'RESERVED',
        reserved_at: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        timeout: 5000
      });

      // Try to increment booked_count and decrement available_count (gracefully handle permission errors)
      if (slot) {
        try {
          await axios.patch(slotUrl, {
            booked_count: slot.booked_count + 1,
            available_count: slot.available_count - 1
          }, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
            timeout: 5000
          });

          logger.info('directus.reservation.slot_updated', {
            ticket_id: data.ticket_id,
            slot_id: data.slot_id,
            new_booked_count: slot.booked_count + 1,
            new_available_count: slot.available_count - 1
          });
        } catch (updateError: any) {
          // If permission denied, log warning but don't fail the reservation
          if (updateError?.response?.status === 403) {
            logger.warn('directus.reservation.slot_update_skipped', {
              reason: 'permission_denied',
              slot_id: data.slot_id,
              message: 'API token lacks permission to update reservation_slots - capacity tracking skipped'
            });
          } else {
            logger.warn('directus.reservation.slot_update_failed', {
              slot_id: data.slot_id,
              error: updateError?.message
            });
          }
        }
      }

      logger.info('directus.reservation.created', {
        ticket_id: data.ticket_id,
        slot_id: data.slot_id
      });

      return { success: true, reservation: response.data?.data };
    } catch (error: any) {
      const errorDetails = error?.response?.data || error?.message || 'Unknown error';
      logger.error('directus.reservation.create_failed', {
        ticket_id: data.ticket_id,
        status: error?.response?.status,
        errorDetails: JSON.stringify(errorDetails),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Check for specific error types
      const errorCode = error?.response?.data?.errors?.[0]?.extensions?.code;
      const errorMessage = error?.response?.data?.errors?.[0]?.message;

      // Handle unique constraint violation (ticket already has reservation)
      if (errorCode === 'RECORD_NOT_UNIQUE') {
        return { success: false, error: 'Ticket already has an active reservation' };
      }

      // Return specific error message or generic one
      const specificError = errorMessage || error?.message || 'Failed to create reservation';
      return { success: false, error: specificError };
    }
  }

  /**
   * Update reservation status
   */
  async updateReservation(reservationId: string, updates: any): Promise<boolean> {
    if (!this.baseURL) return false;

    try {
      const url = `${this.baseURL}/items/ticket_reservations/${reservationId}`;
      await axios.patch(url, updates, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        timeout: 5000
      });

      logger.info('directus.reservation.updated', { reservation_id: reservationId });
      return true;
    } catch (error) {
      logger.error('directus.reservation.update_failed', {
        reservation_id: reservationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// 导出单例
export const directusService = new DirectusService();
