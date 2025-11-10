import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

// API Keys store (same as OTA auth)
const API_KEYS = new Map<string, { partner_id: string, partner_name: string, permissions: string[], rate_limit: number }>([
  ['ota_test_key_12345', { partner_id: 'test_partner', partner_name: 'Test OTA Partner', permissions: ['inventory:read', 'reserve:create', 'orders:create', 'tickets:bulk-generate', 'tickets:activate'], rate_limit: 100 }],
  ['ota_prod_key_67890', { partner_id: 'prod_partner', partner_name: 'Production OTA Partner', permissions: ['inventory:read', 'reserve:create', 'orders:create'], rate_limit: 1000 }],
  ['dudu_key_12345', { partner_id: 'dudu_partner', partner_name: 'DuDu Travel', permissions: ['inventory:read', 'tickets:bulk-generate', 'tickets:activate', 'orders:read'], rate_limit: 500 }],
  ['ota251103_key_67890', { partner_id: 'ota251103_partner', partner_name: 'OTA251103 Travel Group', permissions: ['inventory:read', 'reserve:create', 'reserve:activate', 'tickets:bulk-generate', 'tickets:activate'], rate_limit: 300 }],
  ['ota_full_access_key_99999', { partner_id: 'full_access', partner_name: 'OTA Full Access Partner', permissions: ['inventory:read', 'reserve:create', 'reserve:activate', 'orders:create', 'tickets:bulk-generate', 'tickets:activate'], rate_limit: 500 }]
]);

// Extend Express Request to include auth type and OTA partner
declare global {
  namespace Express {
    interface Request {
      authType?: 'USER' | 'OTA_PARTNER';
      ota_partner?: {
        id: string;
        name: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Unified authentication middleware
 * Accepts EITHER:
 * - Authorization: Bearer <jwt_token> (for normal users)
 * - X-API-Key: <api_key> (for OTA partners)
 *
 * Sets req.authType to indicate which auth method succeeded
 */
export const unifiedAuth = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Try JWT authentication first (users)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, String(env.JWT_SECRET)) as { id: number; email: string };

        req.user = decoded;
        req.authType = 'USER';

        logger.info('unified.auth.user_success', {
          user_id: decoded.id,
          email: decoded.email,
          path: req.path
        });

        return next();
      } catch (error) {
        // JWT validation failed, will try API key next
        logger.debug('unified.auth.jwt_failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Try API Key authentication (OTA partners)
    if (apiKey) {
      const keyData = API_KEYS.get(apiKey);

      if (keyData) {
        req.ota_partner = {
          id: keyData.partner_id,
          name: keyData.partner_name,
          permissions: keyData.permissions
        };
        req.authType = 'OTA_PARTNER';

        logger.info('unified.auth.partner_success', {
          partner_id: keyData.partner_id,
          partner_name: keyData.partner_name,
          path: req.path
        });

        return next();
      } else {
        logger.info('unified.auth.invalid_api_key', {
          key_prefix: apiKey.substring(0, 8) + '...',
          path: req.path
        });
      }
    }

    // Neither authentication method succeeded
    logger.info('unified.auth.no_valid_credentials', {
      has_bearer: !!authHeader,
      has_api_key: !!apiKey,
      path: req.path,
      ip: req.ip
    });

    res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Valid authentication required. Provide either Bearer token or X-API-Key header.',
      details: {
        bearer_token: 'Authorization: Bearer <user_jwt_token>',
        api_key: 'X-API-Key: <ota_partner_key>'
      }
    });
  };
};

/**
 * Check if request has valid authentication
 */
export function isAuthenticated(req: Request): boolean {
  return !!(req.user || req.ota_partner);
}

/**
 * Get authenticated entity ID (user_id or partner_id)
 */
export function getAuthenticatedId(req: Request): string | number | null {
  if (req.authType === 'USER' && req.user) {
    return req.user.id;
  }
  if (req.authType === 'OTA_PARTNER' && req.ota_partner) {
    return req.ota_partner.id;
  }
  return null;
}

/**
 * Get authentication context for logging
 */
export function getAuthContext(req: Request): Record<string, any> {
  if (req.authType === 'USER' && req.user) {
    return {
      auth_type: 'USER',
      user_id: req.user.id,
      email: req.user.email
    };
  }
  if (req.authType === 'OTA_PARTNER' && req.ota_partner) {
    return {
      auth_type: 'OTA_PARTNER',
      partner_id: req.ota_partner.id,
      partner_name: req.ota_partner.name
    };
  }
  return {
    auth_type: 'NONE'
  };
}
