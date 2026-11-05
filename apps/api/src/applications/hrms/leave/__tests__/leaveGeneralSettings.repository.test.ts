import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, isDatabaseConfigured, closePool } from '../../../../db/connection.js';
import {
  companies,
  leaveGeneralSettings,
  leaveGeneralSettingsVersions,
} from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { leaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import { ConflictError } from '../../../../app/errors/AppError.js';

describe.skipIf(!isDatabaseConfigured)(
  'LeaveGeneralSettingsRepository — Isolated Database Suite',
  () => {
    const db = getDb();
    const testTenantId = 'tenant_demo_01';
    const testCompanyId = `comp_iso_${Date.now()}`;

    beforeAll(async () => {
      // Create isolated test company to ensure zero impact on comp_demo_01
      await db.insert(companies).values({
        id: testCompanyId,
        tenantId: testTenantId,
        name: 'Isolated Settings Test Company',
        code: `ISO_${Date.now().toString().slice(-6)}`,
        status: 'active',
      });
    });

    afterAll(async () => {
      // Clean up isolated test data completely
      await db
        .delete(leaveGeneralSettingsVersions)
        .where(eq(leaveGeneralSettingsVersions.companyId, testCompanyId));
      await db
        .delete(leaveGeneralSettings)
        .where(eq(leaveGeneralSettings.companyId, testCompanyId));
      await db.delete(companies).where(eq(companies.id, testCompanyId));
      await closePool();
    });

    it('creates Version 1 with default settings for a newly provisioned company', async () => {
      const settings = await leaveGeneralSettingsRepository.ensureDefaultSettings(
        testTenantId,
        testCompanyId,
        'usr_test_init',
      );

      expect(settings).toBeDefined();
      expect(settings.currentVersionNumber).toBe(1);
      expect(settings.leaveYearCycle).toBe('calendar_year');
      expect(settings.dayCountingMethod).toBe('working_days');
      expect(settings.status).toBe('pre_activation');

      const versions = await leaveGeneralSettingsRepository.getVersionHistory(
        testTenantId,
        testCompanyId,
      );
      expect(versions).toHaveLength(1);
      expect(versions[0]!.versionNumber).toBe(1);
      expect(versions[0]!.changeReason).toContain('Initial company leave general settings');
    });

    it('saves a valid change, creating Version 2 while preserving Version 1 immutably', async () => {
      const now = new Date();
      const effectiveDate = new Date(now.getTime() + 60000); // 1 minute in future

      const result = await leaveGeneralSettingsRepository.publishNewVersion(
        testTenantId,
        testCompanyId,
        {
          leaveYearCycle: 'calendar_year',
          goLiveDate: '2026-11-01',
          dayCountingMethod: 'calendar_days',
          balancePrecision: 'half',
          balanceRoundingRule: 'round_up',
          maxBackdatedDays: 14,
          maxAdvanceBookingDays: 90,
          changeReason: 'Switching to calendar days counting for upcoming quarter',
          effectiveFrom: effectiveDate.toISOString(),
          expectedCurrentVersionNumber: 1,
        },
        'usr_test_operator',
      );

      expect(result.version).toBeDefined();
      expect(result.version.versionNumber).toBe(2);
      expect(result.version.changeReason).toBe(
        'Switching to calendar days counting for upcoming quarter',
      );
      expect(result.version.createdByUserId).toBe('usr_test_operator');

      // Verify that Version 1 is still preserved in history
      const history = await leaveGeneralSettingsRepository.getVersionHistory(
        testTenantId,
        testCompanyId,
      );
      expect(history).toHaveLength(2);
      expect(history[0]!.versionNumber).toBe(2);
      expect(history[1]!.versionNumber).toBe(1);
      expect(history[1]!.changeReason).toContain('Initial company leave general settings');
    });

    it('rejects stale updates with ConflictError when expectedCurrentVersionNumber does not match', async () => {
      await expect(
        leaveGeneralSettingsRepository.publishNewVersion(
          testTenantId,
          testCompanyId,
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Concurrent update attempt from stale tab',
            expectedCurrentVersionNumber: 1, // Current in DB is 2
          },
          'usr_test_operator',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects out-of-order effective timestamps with ConflictError', async () => {
      const latest = await leaveGeneralSettingsRepository.getLatestPublishedVersion(
        testTenantId,
        testCompanyId,
      );
      expect(latest).toBeDefined();

      // Timestamp earlier than latest published version
      const pastTimestamp = new Date(new Date(latest!.effectiveFrom).getTime() - 10000);

      await expect(
        leaveGeneralSettingsRepository.publishNewVersion(
          testTenantId,
          testCompanyId,
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Out of order effective timestamp attempt',
            effectiveFrom: pastTimestamp.toISOString(),
            expectedCurrentVersionNumber: 2,
          },
          'usr_test_operator',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects a duplicate effective timestamp with DUPLICATE_EFFECTIVE_TIMESTAMP', async () => {
      const latest = await leaveGeneralSettingsRepository.getLatestPublishedVersion(
        testTenantId,
        testCompanyId,
      );

      await expect(
        leaveGeneralSettingsRepository.publishNewVersion(
          testTenantId,
          testCompanyId,
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Duplicate effective timestamp attempt',
            effectiveFrom: new Date(latest!.effectiveFrom).toISOString(),
            expectedCurrentVersionNumber: 2,
          },
          'usr_test_operator',
        ),
      ).rejects.toMatchObject({ code: 'DUPLICATE_EFFECTIVE_TIMESTAMP' });
    });

    it('serialises concurrent publishes: exactly one wins, the other gets a 409', async () => {
      const base = {
        leaveYearCycle: 'calendar_year' as const,
        goLiveDate: '2026-11-01',
        dayCountingMethod: 'working_days' as const,
        balancePrecision: 'two_decimals' as const,
        balanceRoundingRule: 'nearest' as const,
        maxBackdatedDays: 7,
        maxAdvanceBookingDays: 180,
        changeReason: 'Concurrent publish from two admin tabs',
        effectiveFrom: new Date(Date.now() + 3_600_000).toISOString(),
        expectedCurrentVersionNumber: 2,
      };

      const results = await Promise.allSettled([
        leaveGeneralSettingsRepository.publishNewVersion(testTenantId, testCompanyId, base, 'u_a'),
        leaveGeneralSettingsRepository.publishNewVersion(testTenantId, testCompanyId, base, 'u_b'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    });
  },
);
