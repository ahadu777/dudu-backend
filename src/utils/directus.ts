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
}

// 导出单例
export const directusService = new DirectusService();
