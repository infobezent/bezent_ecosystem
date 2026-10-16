import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  parseCliArgs,
  isLocalDatabaseHost,
  verifyRemoteReviewDatabaseIdentity,
  DISALLOWED_PREVIOUS_PASSWORDS,
} from '../auth/passwordManagement.js';

describe('Password Management Utility & Safety Gates', () => {
  describe('1. Password Strength & Disallowed Reuse', () => {
    it('rejects passwords shorter than 10 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/at least 10 characters/);
    });

    it('rejects passwords without an uppercase letter', () => {
      const result = validatePasswordStrength('lowercase123!@#');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/uppercase/);
    });

    it('rejects passwords without a lowercase letter', () => {
      const result = validatePasswordStrength('UPPERCASE123!@#');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/lowercase/);
    });

    it('rejects passwords without a number', () => {
      const result = validatePasswordStrength('NoNumbersHere!@#');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/number/);
    });

    it('rejects passwords without a special character', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/special character/);
    });

    it('strictly rejects the previously exposed password', () => {
      for (const exposed of DISALLOWED_PREVIOUS_PASSWORDS) {
        const result = validatePasswordStrength(exposed);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/previously exposed/);
      }
    });

    it('accepts a new, unique strong password', () => {
      const result = validatePasswordStrength('ZentramReview#9824Xk');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('2. CLI Arguments Parsing', () => {
    it('defaults to hr@bezent.com and isRemoteReview=false', () => {
      const args = parseCliArgs([]);
      expect(args.targetEmail).toBe('hr@bezent.com');
      expect(args.isRemoteReview).toBe(false);
    });

    it('parses custom target email', () => {
      const args = parseCliArgs(['--email', 'reviewer.admin@bezent.com']);
      expect(args.targetEmail).toBe('reviewer.admin@bezent.com');
      expect(args.isRemoteReview).toBe(false);
    });

    it('parses --remote-review flag', () => {
      const args = parseCliArgs(['--remote-review', '--email', 'hr@bezent.com']);
      expect(args.targetEmail).toBe('hr@bezent.com');
      expect(args.isRemoteReview).toBe(true);
    });
  });

  describe('3. Database Host Isolation Gate (isLocalDatabaseHost)', () => {
    it('identifies localhost variants as local', () => {
      expect(isLocalDatabaseHost('localhost')).toBe(true);
      expect(isLocalDatabaseHost('127.0.0.1')).toBe(true);
      expect(isLocalDatabaseHost('::1')).toBe(true);
      expect(isLocalDatabaseHost('')).toBe(true);
      expect(isLocalDatabaseHost(undefined, 'mysql://root:pass@localhost:3306/db')).toBe(true);
      expect(isLocalDatabaseHost(undefined, 'mysql://root:pass@127.0.0.1:3306/db')).toBe(true);
    });

    it('identifies external cloud hosts as non-local', () => {
      expect(isLocalDatabaseHost('mysql-prod.cloud.example.com')).toBe(false);
      expect(isLocalDatabaseHost('198.51.100.25')).toBe(false);
      expect(
        isLocalDatabaseHost(
          undefined,
          'mysql://user:pass@mysql-3b499d83.aivencloud.com:13415/defaultdb',
        ),
      ).toBe(false);
    });
  });

  describe('4. Remote Review Database Identity Verification Mock', () => {
    it('fails closed when demo tenant is missing', async () => {
      const mockDb = {
        select: () => ({
          from: () => ({
            where: async () => [],
          }),
        }),
      } as unknown as Parameters<typeof verifyRemoteReviewDatabaseIdentity>[0];

      const result = await verifyRemoteReviewDatabaseIdentity(mockDb);
      expect(result.verified).toBe(false);
      expect(result.error).toMatch(/Missing or inactive required review tenant/);
    });

    it('fails closed when demo company is missing', async () => {
      let callCount = 0;
      const mockDb = {
        select: () => ({
          from: () => ({
            where: async () => {
              callCount++;
              if (callCount === 1) {
                return [
                  { id: 'tenant_demo_01', name: 'BEZENT Demo Organization', status: 'active' },
                ];
              }
              return [];
            },
          }),
        }),
      } as unknown as Parameters<typeof verifyRemoteReviewDatabaseIdentity>[0];

      const result = await verifyRemoteReviewDatabaseIdentity(mockDb);
      expect(result.verified).toBe(false);
      expect(result.error).toMatch(/Missing or inactive required review company/);
    });

    it('fails closed when foreign tenants exist', async () => {
      let callCount = 0;
      const mockDb = {
        select: () => ({
          from: () => ({
            where: async () => {
              callCount++;
              if (callCount === 1) {
                return [
                  { id: 'tenant_demo_01', name: 'BEZENT Demo Organization', status: 'active' },
                ];
              }
              if (callCount === 2) {
                return [{ id: 'comp_demo_01', name: 'BEZENT Demo Pvt Ltd', status: 'active' }];
              }
              // foreign tenants found
              return [{ id: 'tenant_prod_foreign' }];
            },
          }),
        }),
      } as unknown as Parameters<typeof verifyRemoteReviewDatabaseIdentity>[0];

      const result = await verifyRemoteReviewDatabaseIdentity(mockDb);
      expect(result.verified).toBe(false);
      expect(result.error).toMatch(/Found 1 non-demo tenant/);
    });

    it('verifies successfully when only demo tenant and company exist', async () => {
      let callCount = 0;
      const mockDb = {
        select: () => ({
          from: () => ({
            where: async () => {
              callCount++;
              if (callCount === 1) {
                return [
                  { id: 'tenant_demo_01', name: 'BEZENT Demo Organization', status: 'active' },
                ];
              }
              if (callCount === 2) {
                return [{ id: 'comp_demo_01', name: 'BEZENT Demo Pvt Ltd', status: 'active' }];
              }
              return []; // 0 foreign tenants
            },
          }),
        }),
      } as unknown as Parameters<typeof verifyRemoteReviewDatabaseIdentity>[0];

      const result = await verifyRemoteReviewDatabaseIdentity(mockDb);
      expect(result.verified).toBe(true);
      expect(result.tenantName).toBe('BEZENT Demo Organization');
      expect(result.companyName).toBe('BEZENT Demo Pvt Ltd');
    });
  });
});
