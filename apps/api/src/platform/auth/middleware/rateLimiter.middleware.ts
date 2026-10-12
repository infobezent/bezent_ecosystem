import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../app/errors/AppError.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createSlidingWindowRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  code?: string;
}) {
  const ipMap = new Map<string, RateLimitRecord>();

  // Cleanup old records periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipMap.entries()) {
      if (val.resetAt <= now) {
        ipMap.delete(key);
      }
    }
  }, options.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown_ip';

    const now = Date.now();
    let record = ipMap.get(clientIp);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + options.windowMs };
      ipMap.set(clientIp, record);
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
}

export const invitationAcceptanceRateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // max 20 attempts per minute per IP
  message: 'Too many invitation acceptance attempts. Please try again later.',
  code: 'INVITATION_RATE_LIMIT_EXCEEDED',
});
