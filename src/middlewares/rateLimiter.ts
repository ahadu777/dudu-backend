/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse by limiting request frequency per operator/session/IP.
 * Uses in-memory store (can be upgraded to Redis for multi-instance deployments).
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  message?: string;      // Custom error message
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (key: identifier, value: count and reset time)
const rateLimitStore = new Map<string, RateLimitStore>();

// Default rate limit configuration
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,     // 100 requests per minute
  message: 'Rate limit exceeded. Please try again later.'
};

/**
 * Get rate limit identifier from request
 * Priority: session_code > operator_id > IP address
 */
function getRateLimitKey(req: Request): string {
  // Try session_code first (most specific)
  if (req.body?.session_code) {
    return `session:${req.body.session_code}`;
  }
  
  // Try operator from auth token
  if ((req as any).operator_id) {
    return `operator:${(req as any).operator_id}`;
  }
  
  // Fallback to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory
 */
export function rateLimiter(config: Partial<RateLimitConfig> = {}) {
  const limitConfig: RateLimitConfig = {
    ...DEFAULT_RATE_LIMIT,
    ...config
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Reset window
      entry = {
        count: 0,
        resetTime: now + limitConfig.windowMs
      };
      rateLimitStore.set(key, entry);
    }
    
    // Increment count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > limitConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      logger.warn('rate.limit.exceeded', {
        key,
        count: entry.count,
        limit: limitConfig.maxRequests,
        retry_after_seconds: retryAfter
      });
      
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: limitConfig.message || 'Rate limit exceeded',
        retry_after_seconds: retryAfter
      });
      return;
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limitConfig.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limitConfig.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    next();
  };
}

/**
 * Venue scanning specific rate limiter
 * More restrictive: 200 requests per minute per session
 */
export const venueScanRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  message: 'Scanning rate limit exceeded. Please slow down.'
});


