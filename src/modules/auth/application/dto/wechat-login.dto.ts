/**
 * WeChat Login Request DTO
 * POST /auth/wechat/login
 */
export interface WeChatLoginRequestDto {
  /** Temporary code from wx.login() (5-minute validity) */
  code: string;
}

/**
 * WeChat Login Response DTO
 * Returns JWT token and user profile
 */
export interface WeChatLoginResponseDto {
  /** JWT token for authenticated API access (7-day validity) */
  token: string;

  /** User profile information */
  user: {
    id: number;
    name: string;
    wechat_openid?: string;
    phone?: string | null;
    auth_type: string; // 'wechat' | 'email'
    created_at: Date;
  };

  /** Indicates if user needs to bind phone number */
  needs_phone: boolean;
}

/**
 * Validation helper for WeChatLoginRequestDto
 */
export function validateWeChatLoginRequest(body: any): {
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
