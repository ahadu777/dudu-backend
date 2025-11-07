import axios, { AxiosError } from 'axios';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';

/**
 * WeChat API Client
 * Handles communication with WeChat Mini-Program APIs
 *
 * Security Note: ❌ Do NOT store session_key (WeChat guideline)
 * Only store openid and decrypted user data
 */

// WeChat API endpoints
const WECHAT_API_BASE = 'https://api.weixin.qq.com';

// WeChat API response interfaces
interface Code2SessionResponse {
  openid: string;
  session_key: string; // ❌ Do NOT store this
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number; // seconds (usually 7200 = 2 hours)
  errcode?: number;
  errmsg?: string;
}

interface PhoneNumberResponse {
  errcode: number;
  errmsg: string;
  phone_info?: {
    phoneNumber: string; // E.164 format: +8613800138000
    purePhoneNumber: string; // Without country code: 13800138000
    countryCode: string; // Country code: 86
    watermark: {
      timestamp: number;
      appid: string;
    };
  };
}

/**
 * WeChat Access Token Cache
 * WeChat access_token is valid for 2 hours (7200 seconds)
 * Cached to avoid hitting rate limits (2000 calls/day)
 */
class WeChatAccessTokenCache {
  private token: string | null = null;
  private expiresAt: Date | null = null;

  get(): string | null {
    if (!this.token || !this.expiresAt) {
      return null;
    }

    // Check if token is expired
    if (new Date() >= this.expiresAt) {
      logger.info('wechat.access_token.expired', {
        expired_at: this.expiresAt.toISOString(),
      });
      this.token = null;
      return null;
    }

    return this.token;
  }

  set(token: string, expiresIn: number): void {
    this.token = token;
    // Set expiry 5 minutes before actual expiry (buffer for clock skew)
    const expiryBuffer = 300; // 5 minutes
    this.expiresAt = new Date(Date.now() + (expiresIn - expiryBuffer) * 1000);

    logger.info('wechat.access_token.cached', {
      expires_at: this.expiresAt.toISOString(),
      expires_in_seconds: expiresIn,
    });
  }

  clear(): void {
    this.token = null;
    this.expiresAt = null;
    logger.info('wechat.access_token.cleared');
  }
}

// Singleton access token cache
const accessTokenCache = new WeChatAccessTokenCache();

/**
 * Exchange WeChat temporary code for openid (code2Session)
 *
 * @param code - Temporary code from wx.login() (5-minute validity)
 * @returns openid (user identifier) - ❌ session_key is discarded
 * @throws Error if WeChat API call fails
 *
 * WeChat API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
 */
export async function code2Session(code: string): Promise<string> {
  const startTime = Date.now();

  try {
    logger.info('wechat.code2session.start', { code_length: code.length });

    const response = await axios.get<Code2SessionResponse>(
      `${WECHAT_API_BASE}/sns/jscode2session`,
      {
        params: {
          appid: env.WECHAT_APPID,
          secret: env.WECHAT_APP_SECRET,
          js_code: code,
          grant_type: 'authorization_code',
        },
        timeout: 5000, // 5-second timeout
      }
    );

    const duration = Date.now() - startTime;

    // Check for WeChat API errors
    if (response.data.errcode) {
      logger.error('wechat.code2session.error', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        duration_ms: duration,
      });

      // Map WeChat error codes to application errors
      if (response.data.errcode === 40029) {
        throw new Error('WECHAT_CODE_INVALID'); // Code expired or already used
      } else if (response.data.errcode === 40163) {
        throw new Error('WECHAT_CODE_FORMAT_INVALID'); // Invalid code format
      } else {
        throw new Error(`WECHAT_API_ERROR: ${response.data.errmsg}`);
      }
    }

    const { openid } = response.data;

    if (!openid) {
      logger.error('wechat.code2session.no_openid', {
        response: response.data,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NO_OPENID');
    }

    logger.info('wechat.code2session.success', {
      openid_length: openid.length,
      has_unionid: !!response.data.unionid,
      duration_ms: duration,
    });

    // ❌ session_key is intentionally NOT returned (security best practice)
    return openid;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('wechat.code2session.network_error', {
        message: axiosError.message,
        code: axiosError.code,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NETWORK_ERROR');
    }

    throw error;
  }
}

/**
 * Get WeChat access_token (required for getPhoneNumber API)
 *
 * @returns access_token (2-hour validity)
 * @throws Error if WeChat API call fails
 *
 * WeChat API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html
 */
async function getAccessToken(): Promise<string> {
  // Check cache first
  const cachedToken = accessTokenCache.get();
  if (cachedToken) {
    logger.info('wechat.access_token.cache_hit');
    return cachedToken;
  }

  // Cache miss - fetch new token
  logger.info('wechat.access_token.cache_miss');
  const startTime = Date.now();

  try {
    const response = await axios.get<AccessTokenResponse>(
      `${WECHAT_API_BASE}/cgi-bin/token`,
      {
        params: {
          grant_type: 'client_credential',
          appid: env.WECHAT_APPID,
          secret: env.WECHAT_APP_SECRET,
        },
        timeout: 5000,
      }
    );

    const duration = Date.now() - startTime;

    if (response.data.errcode) {
      logger.error('wechat.access_token.error', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        duration_ms: duration,
      });
      throw new Error(`WECHAT_ACCESS_TOKEN_ERROR: ${response.data.errmsg}`);
    }

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      logger.error('wechat.access_token.no_token', {
        response: response.data,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NO_ACCESS_TOKEN');
    }

    // Cache the token
    accessTokenCache.set(access_token, expires_in);

    logger.info('wechat.access_token.success', {
      expires_in,
      duration_ms: duration,
    });

    return access_token;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('wechat.access_token.network_error', {
        message: axiosError.message,
        code: axiosError.code,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NETWORK_ERROR');
    }

    throw error;
  }
}

/**
 * Get user phone number from WeChat (new 2021+ API)
 *
 * @param code - Phone authorization code from getPhoneNumber button
 * @returns phone number in E.164 format (e.g., "+8613800138000")
 * @throws Error if WeChat API call fails
 *
 * Security Note: Uses new API that returns plaintext phone (no session_key decryption needed)
 * WeChat API: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
 */
export async function getPhoneNumber(code: string): Promise<{
  phone: string;
  countryCode: string;
}> {
  const startTime = Date.now();

  try {
    logger.info('wechat.get_phone_number.start', { code_length: code.length });

    // Get access_token first (cached for 2 hours)
    const accessToken = await getAccessToken();

    // Call getPhoneNumber API
    const response = await axios.post<PhoneNumberResponse>(
      `${WECHAT_API_BASE}/wxa/business/getuserphonenumber`,
      { code },
      {
        params: { access_token: accessToken },
        timeout: 5000,
      }
    );

    const duration = Date.now() - startTime;

    // Check for WeChat API errors
    if (response.data.errcode !== 0) {
      logger.error('wechat.get_phone_number.error', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        duration_ms: duration,
      });

      // Map common error codes
      if (response.data.errcode === 40029) {
        throw new Error('WECHAT_PHONE_CODE_INVALID'); // Code expired or already used
      } else if (response.data.errcode === 47001) {
        throw new Error('WECHAT_PHONE_UNAUTHORIZED'); // POST data format error
      } else {
        throw new Error(`WECHAT_PHONE_API_ERROR: ${response.data.errmsg}`);
      }
    }

    const phoneInfo = response.data.phone_info;

    if (!phoneInfo) {
      logger.error('wechat.get_phone_number.no_phone_info', {
        response: response.data,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NO_PHONE_INFO');
    }

    const { phoneNumber, countryCode } = phoneInfo;

    logger.info('wechat.get_phone_number.success', {
      country_code: countryCode,
      phone_length: phoneNumber.length,
      duration_ms: duration,
    });

    return {
      phone: phoneNumber, // E.164 format: +8613800138000
      countryCode,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('wechat.get_phone_number.network_error', {
        message: axiosError.message,
        code: axiosError.code,
        duration_ms: duration,
      });
      throw new Error('WECHAT_NETWORK_ERROR');
    }

    throw error;
  }
}

/**
 * Clear access token cache (for testing or manual refresh)
 */
export function clearAccessTokenCache(): void {
  accessTokenCache.clear();
}
