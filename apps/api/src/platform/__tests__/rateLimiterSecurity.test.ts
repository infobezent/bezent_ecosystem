import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { createApp } from '../../app/server/createApp.js';
import {
  getSafeClientIp,
  createSlidingWindowRateLimiter,
  passwordLoginRateLimiter,
} from '../auth/middleware/rateLimiter.middleware.js';
import { parseTrustProxy } from '../../app/config/env.js';

describe('Auth Rate Limiter & Proxy Security', () => {
  beforeEach(() => {
    passwordLoginRateLimiter.reset();
  });

  describe('1. Safe Client IP Extraction (getSafeClientIp)', () => {
    it('uses Express req.ip when available, ignoring raw headers', () => {
      const mockReq = {
        ip: '198.51.100.5',
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': 'spoofed.attacker.ip' },
      } as unknown as Request;

      expect(getSafeClientIp(mockReq)).toBe('198.51.100.5');
    });

    it('falls back to socket remoteAddress when req.ip is empty', () => {
      const mockReq = {
        ip: undefined,
        socket: { remoteAddress: '192.168.1.100' },
        headers: { 'x-forwarded-for': 'spoofed.attacker.ip' },
      } as unknown as Request;

      expect(getSafeClientIp(mockReq)).toBe('192.168.1.100');
    });

    it('normalizes IPv6-mapped IPv4 addresses', () => {
      const mockReq = {
        ip: '::ffff:203.0.113.195',
      } as unknown as Request;

      expect(getSafeClientIp(mockReq)).toBe('203.0.113.195');
    });
  });

  describe('2. Fail-Closed Proxy Trust Parsing', () => {
    it('defaults to false when undefined or "false"', () => {
      expect(parseTrustProxy(undefined)).toBe(false);
      expect(parseTrustProxy('')).toBe(false);
      expect(parseTrustProxy('false')).toBe(false);
    });

    it('parses numeric hop counts safely', () => {
      expect(parseTrustProxy('1')).toBe(1);
      expect(parseTrustProxy('2')).toBe(2);
      expect(parseTrustProxy('0')).toBe('0'); // non-positive integers treated as string/disabled
    });

    it('parses string subnet specifications', () => {
      expect(parseTrustProxy('loopback')).toBe('loopback');
      expect(parseTrustProxy('10.0.0.0/8, 172.16.0.0/12')).toBe('10.0.0.0/8, 172.16.0.0/12');
    });
  });

  describe('3. Local Development (trustProxy: false) — Anti-Spoofing & Rate Limiting', () => {
    const app = createApp({ trustProxy: false });

    it('blocks rate-limit bypass when attacker rotates X-Forwarded-For headers', async () => {
      // Send 10 failed login attempts with completely different spoofed X-Forwarded-For headers
      for (let i = 1; i <= 10; i++) {
        const res = await request(app)
          .post('/api/v1/platform/auth/login')
          .set('X-Forwarded-For', `198.51.100.${i}`)
          .send({
            email: 'rate.limit.test@bezent.example',
            password: 'WrongPassword!',
          });

        // First 10 requests should reach authentication logic (401 or 403 depending on env/user)
        expect(res.status).not.toBe(429);
      }

      // 11th request from same socket (even with another spoofed header) MUST be rejected with 429
      const blockedRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .set('X-Forwarded-For', '203.0.113.99')
        .send({
          email: 'rate.limit.test@bezent.example',
          password: 'WrongPassword!',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error?.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });

  describe('4. Trusted Proxy Topology (trustProxy: 1) — Render 1-Hop Scenario', () => {
    const app = createApp({ trustProxy: 1 });

    it('correctly attributes rate limit to the verified client IP from trusted proxy', async () => {
      const verifiedClientIp = '203.0.113.44';

      // 10 attempts where proxy appends verifiedClientIp to X-Forwarded-For
      for (let i = 1; i <= 10; i++) {
        const res = await request(app)
          .post('/api/v1/platform/auth/login')
          // Attacker injects a fake internal IP, Render proxy appends verifiedClientIp
          .set('X-Forwarded-For', `spoofed-${i}.evil.com, ${verifiedClientIp}`)
          .send({
            email: 'proxy.test@bezent.example',
            password: 'WrongPassword!',
          });

        expect(res.status).not.toBe(429);
      }

      // 11th attempt from same verified client IP is rate limited
      const blockedRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .set('X-Forwarded-For', `spoofed-11.evil.com, ${verifiedClientIp}`)
        .send({
          email: 'proxy.test@bezent.example',
          password: 'WrongPassword!',
        });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error?.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');

      // A different verified client IP is NOT blocked
      const differentClientRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .set('X-Forwarded-For', 'other.spoof.com, 198.51.100.88')
        .send({
          email: 'proxy.test@bezent.example',
          password: 'WrongPassword!',
        });

      expect(differentClientRes.status).not.toBe(429);
    });
  });

  describe('5. Sliding Window Limiter Factory', () => {
    it('supports custom window and request limits', async () => {
      const customLimiter = createSlidingWindowRateLimiter({
        windowMs: 1000,
        maxRequests: 2,
        code: 'TEST_RATE_LIMIT',
      });

      const mockReq = {
        ip: '127.0.0.1',
      } as Request;

      const mockRes = {
        setHeader: () => {},
      } as unknown as Response;

      let nextError: (Error & { statusCode?: number; code?: string }) | undefined;
      const next: NextFunction = (err?: unknown) => {
        nextError = err as (Error & { statusCode?: number; code?: string }) | undefined;
      };

      // Request 1: allowed
      customLimiter(mockReq, mockRes, next);
      expect(nextError).toBeUndefined();

      // Request 2: allowed
      customLimiter(mockReq, mockRes, next);
      expect(nextError).toBeUndefined();

      // Request 3: blocked
      customLimiter(mockReq, mockRes, next);
      expect(nextError).toBeDefined();
      expect(nextError?.statusCode).toBe(429);
      expect(nextError?.code).toBe('TEST_RATE_LIMIT');

      // Reset allows again
      customLimiter.reset();
      nextError = undefined;
      customLimiter(mockReq, mockRes, next);
      expect(nextError).toBeUndefined();
    });
  });
});
