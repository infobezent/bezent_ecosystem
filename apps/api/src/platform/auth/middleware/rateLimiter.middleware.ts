import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../app/errors/AppError.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Extracts a safe client IP identifier from Express req.
 * Relies strictly on Express's req.ip (governed by app.set('trust proxy', ...)).
 *
 * Security Rationale:
 * - When trust proxy is disabled (false, default in local/unverified topologies),
 *   req.ip returns socket remoteAddress, completely discarding spoofed X-Forwarded-For headers.
 * - When trust proxy is configured with verified hops (e.g., 1 on Render), Express safely
 *   strips trusted proxy hops from right to left, preventing client header injection.
 * - Raw X-Forwarded-For header values are NEVER read directly or split from the left.
 */
export function getSafeClientIp(req: Request): string {
  let ip = req.ip || req.socket?.remoteAddress || 'unknown_ip';

  // Normalize IPv6-mapped IPv4 addresses (e.g., "::ffff:127.0.0.1" -> "127.0.0.1")
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
}

export interface SlidingWindowRateLimiter {
  (req: Request, res: Response, next: NextFunction): void;
  reset(): void;
}

export function createSlidingWindowRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  code?: string;
  keyGenerator?: (req: Request) => string;
}): SlidingWindowRateLimiter {
  const ipMap = new Map<string, RateLimitRecord>();
  const keyGen = options.keyGenerator || getSafeClientIp;

  // Cleanup old records periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipMap.entries()) {
      if (val.resetAt <= now) {
        ipMap.delete(key);
      }
    }
  }, options.windowMs);

  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const clientKey = keyGen(req);
    const now = Date.now();
    let record = ipMap.get(clientKey);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + options.windowMs };
      ipMap.set(clientKey, record);
      return next();
    }

    record.count++;
    if (record.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return next(
        new AppError(
          options.message || 'Too many requests. Please try again later.',
          429,
          options.code || 'RATE_LIMIT_EXCEEDED',
        ),
      );
    }

    next();
  };

  middleware.reset = () => {
    ipMap.clear();
  };

  return middleware;
}

export const invitationAcceptanceRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // max 20 attempts per minute per IP
  message: 'Too many invitation acceptance attempts. Please try again later.',
  code: 'INVITATION_RATE_LIMIT_EXCEEDED',
});

export const passwordLoginRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // max 10 password login attempts per minute per IP
  message: 'Too many login attempts. Please try again later.',
  code: 'LOGIN_RATE_LIMIT_EXCEEDED',
});

