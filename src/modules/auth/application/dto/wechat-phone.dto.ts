/**
 * WeChat Phone Binding Request DTO
 * POST /auth/wechat/phone
 */
export interface WeChatPhoneBindingRequestDto {
  /** Phone authorization code from getPhoneNumber button */
  code: string;
}

/**
 * WeChat Phone Binding Response DTO
 * Returns phone number and updated user profile
 */
export interface WeChatPhoneBindingResponseDto {
  /** User phone number in E.164 format (e.g., "+8613800138000") */
  phone: string;

  /** Updated user profile */
  user: {
    id: number;
    name: string;
    wechat_openid?: string;
    phone: string;
    auth_type: string;
    created_at: Date;
  };
}

/**
 * Validation helper for WeChatPhoneBindingRequestDto
 */
export function validateWeChatPhoneRequest(body: any): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!body.code) {
    errors.push('code is required');
  } else if (typeof body.code !== 'string') {
    errors.push('code must be a string');
  } else if (body.code.length === 0) {
    errors.push('code cannot be empty');
  } else if (body.code.length > 100) {
    errors.push('code is too long (max 100 characters)');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
