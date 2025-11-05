import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple API key store - in production this would be in database
const API_KEYS = new Map<string, { partner_name: string, permissions: string[], rate_limit: number }>([
  ['ota_test_key_12345', { partner_name: 'Test OTA Partner', permissions: ['inventory:read', 'reserve:create', 'orders:create', 'tickets:bulk-generate', 'tickets:activate'], rate_limit: 100 }],
  ['ota_prod_key_67890', { partner_name: 'Production OTA Partner', permissions: ['inventory:read', 'reserve:create', 'orders:create'], rate_limit: 1000 }],
  ['ota_full_access_key_99999', { partner_name: 'OTA Full Access Partner', permissions: ['inventory:read', 'reserve:create', 'reserve:activate', 'orders:create', 'tickets:bulk-generate', 'tickets:activate'], rate_limit: 500 }]
]);

// Rate limiting store (in production would use Redis)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

interface AuthenticatedRequest extends Request {
  ota_partner?: {
    name: string;
    permissions: string[];
  };
}

export function otaAuthMiddleware(requiredPermission?: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      logger.info('ota.auth.missing_key', {
        ip: req.ip,
        path: req.path,
        user_agent: req.headers['user-agent']
      });
      return res.status(401).json({
        error: 'API_KEY_REQUIRED',
        message: 'X-API-Key header is required for OTA endpoints'
      });
    }

    const keyData = API_KEYS.get(apiKey);
    if (!keyData) {
      logger.info('ota.auth.invalid_key', {
        ip: req.ip,
        path: req.path,
        key_prefix: apiKey.substring(0, 8) + '...'
      });
      return res.status(401).json({
        error: 'INVALID_API_KEY',
        message: 'The provided API key is not valid'
      });
    }

    // Check rate limiting
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows
    const rateLimitKey = `${apiKey}:${windowStart}`;

    const currentUsage = rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: windowStart + 60000 };

    if (currentUsage.count >= keyData.rate_limit) {
      logger.info('ota.auth.rate_limited', {
        partner: keyData.partner_name,
        limit: keyData.rate_limit,
        window_start: new Date(windowStart).toISOString()
      });
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit of ${keyData.rate_limit} requests per minute exceeded`,
        retry_after: Math.ceil((currentUsage.resetTime - now) / 1000)
      });
    }

    // Update rate limit counter
    currentUsage.count++;
    rateLimitStore.set(rateLimitKey, currentUsage);

    // Check permissions
    if (requiredPermission && !keyData.permissions.includes(requiredPermission)) {
      logger.info('ota.auth.insufficient_permissions', {
        partner: keyData.partner_name,
        required: requiredPermission,
        available: keyData.permissions
      });
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `This API key does not have permission: ${requiredPermission}`
      });
    }

    // Attach partner info to request
    req.ota_partner = {
      name: keyData.partner_name,
      permissions: keyData.permissions
    };

    logger.info('ota.auth.success', {
      partner: keyData.partner_name,
      path: req.path,
      method: req.method
    });

    next();
  };
}

// Clean up old rate limit entries (call periodically)
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Schedule cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);