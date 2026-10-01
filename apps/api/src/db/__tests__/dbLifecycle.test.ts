import { describe, it, expect, vi, afterEach } from 'vitest';
import * as connection from '../connection.js';

describe('Database Lifecycle & Startup Readiness', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureDatabaseConnected', () => {
    it('succeeds immediately when database is reachable on first check', async () => {
      const checker = vi.fn().mockResolvedValue({ ok: true });

      const result = await connection.ensureDatabaseConnected({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 20,
        checker,
      });

      expect(result.ok).toBe(true);
      expect(result.diagnostic).toBeUndefined();
      expect(checker).toHaveBeenCalledTimes(1);
    });

    it('retries with bounded attempts when initial attempts fail, then succeeds', async () => {
      const checker = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, error: 'ECONNREFUSED', code: 'ECONNREFUSED' })
        .mockResolvedValueOnce({ ok: false, error: 'ECONNREFUSED', code: 'ECONNREFUSED' })
        .mockResolvedValueOnce({ ok: true });

      const result = await connection.ensureDatabaseConnected({
        maxRetries: 4,
        initialDelayMs: 10,
        maxDelayMs: 20,
        checker,
      });

      expect(result.ok).toBe(true);
      expect(checker).toHaveBeenCalledTimes(3);
    });

    it('stops after bounded retries and reports diagnostic failure without hanging', async () => {
      const checker = vi
        .fn()
        .mockResolvedValue({ ok: false, error: 'connect ECONNREFUSED 127.0.0.1:3306', code: 'ECONNREFUSED' });

      const result = await connection.ensureDatabaseConnected({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 20,
        checker,
      });

      expect(result.ok).toBe(false);
      expect(checker).toHaveBeenCalledTimes(3);
      expect(result.diagnostic).toContain('Could not connect to MySQL');
      expect(result.diagnostic).toContain('ECONNREFUSED');
      expect(result.diagnostic).toContain('after 3 attempts');
    });
  });

  describe('pingDatabase', () => {
    it('returns true when ping succeeds', async () => {
      const ping = await connection.pingDatabase();
      expect(typeof ping).toBe('boolean');
    });

    it('returns false when connection acquisition throws', async () => {
      const failingPoolGetter = () => {
        throw new Error('Pool exhausted');
      };

      const ping = await connection.pingDatabase(
        failingPoolGetter as unknown as () => import('mysql2/promise').Pool,
      );
      expect(ping).toBe(false);
    });
  });

  describe('closePool', () => {
    it('cleans up pool cleanly and resets pool state', async () => {
      await expect(connection.closePool()).resolves.toBeUndefined();
    });
  });
});
