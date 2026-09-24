import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import * as connection from '../../../db/connection.js';
import { DatabaseConnectionError } from '../../errors/AppError.js';
import { OrganizationRepository } from '../../../applications/hrms/organization/repository/organization.repository.js';
import { OnboardingRepository } from '../../../applications/hrms/onboarding/repository/onboarding.repository.js';
import { OnboardingSettingsRepository } from '../../../applications/hrms/settings/onboarding/repository/settings.repository.js';

describe('Database Failure & Persistence Fallback Removal (P0)', () => {
  const app = createApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Direct Repository Unit Invariants (No Silent In-Memory Fallbacks)
  // ============================================================================
  describe('Repository Unit Invariants', () => {
    it('OrganizationRepository.getMasters fails clearly and does not return fallback masters', async () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      const repo = new OrganizationRepository();
      await expect(repo.getMasters('tenant_demo_01', 'comp_demo_01')).rejects.toThrow(
        DatabaseConnectionError,
      );
    });

    it('OnboardingRepository.listByCompany fails clearly and does not return in-memory cases', async () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      const repo = new OnboardingRepository();
      await expect(repo.listByCompany('tenant_demo_01', 'comp_demo_01')).rejects.toThrow(
        DatabaseConnectionError,
      );
    });

    it('OnboardingRepository.create fails clearly and does not persist in memory', async () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      const repo = new OnboardingRepository();
      await expect(
        repo.create({
          id: 'case_test_01',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_demo_01',
          firstName: 'NoMemory',
        }),
      ).rejects.toThrow(DatabaseConnectionError);
    });

    it('OnboardingSettingsRepository.getGeneralSettings fails clearly and does not return in-memory settings', async () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      const repo = new OnboardingSettingsRepository();
      await expect(repo.getGeneralSettings('tenant_demo_01', 'comp_demo_01')).rejects.toThrow(
        DatabaseConnectionError,
      );
    });

    it('OnboardingSettingsRepository.upsertGeneralSettings fails clearly and does not persist in memory', async () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      const repo = new OnboardingSettingsRepository();
      await expect(
        repo.upsertGeneralSettings('tenant_demo_01', 'comp_demo_01', { onboardingEnabled: false }),
      ).rejects.toThrow(DatabaseConnectionError);
    });
  });

  // ============================================================================
  // 2. HTTP API Error Envelope & Sanitization (Unconfigured Database)
  // ============================================================================
  describe('HTTP API Behavior — Unconfigured Database', () => {
    beforeEach(() => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });
    });

    it('GET /api/v1/hrms/organization/masters fails with 500 DATABASE_UNAVAILABLE and no mock data', async () => {
      const res = await request(app).get('/api/v1/hrms/organization/masters');

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error.message).toBe('Database is not configured');
      expect(res.body.error.stack).toBeUndefined();
    });

    it('POST /api/v1/hrms/onboarding/new-hires fails with 500 DATABASE_UNAVAILABLE', async () => {
      const res = await request(app).post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'Unsaved',
        lastName: 'Candidate',
        email: 'unsaved@example.com',
        companyId: 'comp_demo_01',
        departmentId: 'dept_eng_01',
        designationId: 'desig_se_01',
        joiningDate: '2026-11-01',
        employmentType: 'full_time',
      });

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error.message).toBe('Database is not configured');
      expect(res.body.error.stack).toBeUndefined();
    });

    it('POST /api/v1/hrms/onboarding/cases (draft) fails with 500 DATABASE_UNAVAILABLE', async () => {
      const res = await request(app).post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'DraftFail',
        email: 'draftfail@example.com',
      });

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error.stack).toBeUndefined();
    });

    it('GET /api/v1/hrms/settings/onboarding/general fails with 500 DATABASE_UNAVAILABLE', async () => {
      const res = await request(app).get('/api/v1/hrms/settings/onboarding/general');

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error.stack).toBeUndefined();
    });

    it('PATCH /api/v1/hrms/settings/onboarding/general fails with 500 DATABASE_UNAVAILABLE', async () => {
      const res = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/general')
        .send({ onboardingEnabled: false });

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error.stack).toBeUndefined();
    });
  });

  // ============================================================================
  // 3. HTTP API Behavior — Underlying Network Connection Failure (ECONNREFUSED)
  // ============================================================================
  describe('HTTP API Behavior — Database Driver Connection Failure (ECONNREFUSED)', () => {
    beforeEach(() => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:3306');
        (error as unknown as { code: string }).code = 'ECONNREFUSED';
        throw error;
      });
    });

    it('sanitizes driver errors: returns DATABASE_UNAVAILABLE without leaking connection string, host, or stack', async () => {
      const res = await request(app).get('/api/v1/hrms/organization/masters');

      expect(res.status).toBe(500);
      expect(res.body.data).toBeUndefined();
      expect(res.body.error).toEqual({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service is unavailable',
      });
      // Crucial: do not leak raw driver details or credentials
      expect(JSON.stringify(res.body)).not.toContain('127.0.0.1');
      expect(JSON.stringify(res.body)).not.toContain('3306');
      expect(res.body.error.stack).toBeUndefined();
    });
  });
});
