import net from 'node:net';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendancePeriods,
  attendancePunches,
  attendanceRegularizations,
  employeeAttendance,
  employeeNotifications,
  employeeRequests,
  employees,
  locations,
  memberships,
  users,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import {
  hrmsTestHeaders,
  removeHrmsTestAccess,
  signInForTest,
} from '../../../../platform/__tests__/support/testSession.js';
import {
  distanceMeters,
  ipMatchesAllowlist,
  readCoordinates,
} from '../service/attendanceSecurity.service.js';
import {
  actorSettingsRoles,
  resolveManualEntryMethod,
} from '../service/attendanceManualEntry.service.js';
import { subtractDays, summarizeByMonth } from '../service/attendanceEmployeeView.service.js';
import { isCorrectionTypeAllowed } from '../service/attendanceRegularizationEligibility.service.js';
import { attendanceRegularizationService } from '../service/attendanceRegularization.service.js';
import {
  boundaryToMilliseconds,
  resolveWorkday,
  formatDateInTimezone,
} from '../service/attendanceWorkday.service.js';
import { isProbeableHost, probeTcp } from '../service/attendanceDeviceProbe.js';
import { attendanceAutoLockService } from '../service/attendanceAutoLock.service.js';
import { attendanceService } from '../service/attendance.service.js';
import {
  computePeriodBounds,
  daysBetweenInclusive,
  periodCodeForDate,
} from '../service/attendancePeriodCalendar.js';

const isoDaysAgo = (days: number): string => {
  const todayStr = formatDateInTimezone(new Date(), 'Asia/Kolkata');
  return subtractDays(todayStr, days);
};

describe('Attendance settings helpers (pure)', () => {
  it('matches exact IPs, IPv4-mapped IPv6 and CIDR ranges', () => {
    expect(ipMatchesAllowlist('::ffff:10.1.2.3', ['10.0.0.0/8'])).toBe(true);
    expect(ipMatchesAllowlist('192.168.1.20', ['192.168.1.0/24'])).toBe(true);
    expect(ipMatchesAllowlist('192.168.2.20', ['192.168.1.0/24'])).toBe(false);
    expect(ipMatchesAllowlist('203.0.113.9', ['203.0.113.9'])).toBe(true);
    expect(ipMatchesAllowlist('203.0.113.10', ['203.0.113.9'])).toBe(false);
    expect(ipMatchesAllowlist('1.2.3.4', ['not-an-ip/99'])).toBe(false);
  });

  it('computes great-circle distance and validates coordinates', () => {
    const chennai = { latitude: 12.9716, longitude: 80.2437 };
    const near = { latitude: 12.9718, longitude: 80.2439 };
    expect(distanceMeters(chennai, near)).toBeLessThan(50);
    expect(distanceMeters(chennai, { latitude: 28.6139, longitude: 77.209 })).toBeGreaterThan(
      1_700_000,
    );
    expect(readCoordinates({ latitude: 91, longitude: 0 })).toBeNull();
    expect(readCoordinates({ latitude: 'x', longitude: 0 })).toBeNull();
    expect(readCoordinates({ latitude: 12.9, longitude: 80.2 })).toEqual({
      latitude: 12.9,
      longitude: 80.2,
    });
  });

  it('maps system roles to the manual-entry settings roles', () => {
    expect(
      actorSettingsRoles({ roleCodes: ['hr_manager'], isSuperAdmin: false, isTenantAdmin: false }),
    ).toEqual(['hr']);
    expect(
      actorSettingsRoles({ roleCodes: ['manager'], isSuperAdmin: false, isTenantAdmin: false }),
    ).toEqual(['reporting_manager']);
    expect(
      actorSettingsRoles({ roleCodes: [], isSuperAdmin: true, isTenantAdmin: true }).sort(),
    ).toEqual(['company_admin', 'super_admin']);
    expect(
      actorSettingsRoles({ roleCodes: ['employee'], isSuperAdmin: false, isTenantAdmin: false }),
    ).toEqual([]);
  });

  it('classifies a manual correction as actual times, full day or half day', () => {
    const base = { employeeId: 'e', date: '2026-01-01', reason: 'r' };
    expect(resolveManualEntryMethod({ ...base, checkInTime: '09:00' })).toBe('actual_times');
    expect(resolveManualEntryMethod({ ...base, status: 'half_day' })).toBe('half_day_admin');
    expect(resolveManualEntryMethod({ ...base, status: 'present' })).toBe('full_day_admin');
  });

  it('summarises daily records per month and subtracts days across month ends', () => {
    expect(subtractDays('2026-03-01', 1)).toBe('2026-02-28');
    const rows = [
      { date: '2026-10-02', status: 'present', isLate: true, workedMinutes: 480 },
      { date: '2026-10-01', status: 'half_day', isLate: false, workedMinutes: 240 },
      { date: '2026-09-30', status: 'absent', isLate: false, workedMinutes: 0 },
    ] as unknown as Parameters<typeof summarizeByMonth>[0];
    const summary = summarizeByMonth(rows);
    expect(summary.map((m) => m.month)).toEqual(['2026-10', '2026-09']);
    expect(summary[0]).toMatchObject({ present: 1, halfDay: 1, lateDays: 1, workedMinutes: 720 });
    expect(summary[1]).toMatchObject({ absent: 1 });
  });

  it('computes payroll period boundaries for calendar and custom-cutoff cycles', () => {
    expect(computePeriodBounds('2026-02', 'calendar_month', 25)).toEqual({
      periodCode: '2026-02',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
    expect(computePeriodBounds('2026-10', 'custom_cutoff', 25)).toMatchObject({
      startDate: '2026-09-26',
      endDate: '2026-10-25',
    });
    expect(computePeriodBounds('2026-01', 'custom_cutoff', 25)).toMatchObject({
      startDate: '2025-12-26',
      endDate: '2026-01-25',
    });
    // A cutoff day beyond the month length clamps to the month end.
    expect(computePeriodBounds('2026-02', 'custom_cutoff', 31)).toMatchObject({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
    expect(computePeriodBounds('2026-03', 'custom_cutoff', 31)).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });
    expect(computePeriodBounds('not-a-code', 'calendar_month', 25)).toBeNull();
  });

  it('assigns a date to the right payroll period', () => {
    expect(periodCodeForDate('2026-10-25', 'custom_cutoff', 25)).toBe('2026-10');
    expect(periodCodeForDate('2026-10-26', 'custom_cutoff', 25)).toBe('2026-11');
    expect(periodCodeForDate('2026-12-30', 'custom_cutoff', 25)).toBe('2027-01');
    expect(periodCodeForDate('2026-10-26', 'calendar_month', 25)).toBe('2026-10');
    expect(daysBetweenInclusive('2026-09-26', '2026-10-25')).toBe(30);
  });

  it('applies the allowed correction categories to request types', () => {
    expect(isCorrectionTypeAllowed([], 'missing_out')).toBe(true);
    expect(isCorrectionTypeAllowed(undefined, 'both_missing')).toBe(true);
    expect(isCorrectionTypeAllowed(['missed_check_in'], 'missing_in')).toBe(true);
    expect(isCorrectionTypeAllowed(['missed_check_in'], 'missing_out')).toBe(false);
    expect(isCorrectionTypeAllowed(['late_arrival'], 'incorrect_time')).toBe(true);
    expect(isCorrectionTypeAllowed(['both_punches'], 'incorrect_time')).toBe(false);
    // Request types with no category on the settings screen are never restricted.
    expect(isCorrectionTypeAllowed(['missed_check_in'], 'status_correction')).toBe(true);
    // Companies created with the legacy default ids keep working.
    const legacyDefault = ['missed_in', 'missed_out', 'time_adjustment', 'both_missing'];
    for (const type of ['missing_in', 'missing_out', 'incorrect_time', 'both_missing'] as const) {
      expect(isCorrectionTypeAllowed(legacyDefault, type)).toBe(true);
    }
    // A list with no recognised category does not lock everything out.
    expect(isCorrectionTypeAllowed(['something_unknown'], 'missing_in')).toBe(true);
  });

  it('resolves the attendance workday from the day boundary', () => {
    expect(boundaryToMilliseconds('04:00:00')).toBe(4 * 3600 * 1000);
    expect(boundaryToMilliseconds('00:00')).toBe(0);
    expect(boundaryToMilliseconds('garbage')).toBe(0);
    expect(boundaryToMilliseconds('25:00:00')).toBe(0);

    const earlyMorning = new Date(2026, 9, 16, 1, 30, 0);
    const midMorning = new Date(2026, 9, 16, 5, 0, 0);
    expect(resolveWorkday(earlyMorning, '04:00:00')).toBe('2026-10-15');
    expect(resolveWorkday(midMorning, '04:00:00')).toBe('2026-10-16');
    expect(resolveWorkday(earlyMorning, '00:00:00')).toBe('2026-10-16');
    expect(resolveWorkday(earlyMorning, undefined)).toBe('2026-10-16');
    // Rolls back across a month end too.
    expect(resolveWorkday(new Date(2026, 10, 1, 2, 0, 0), '04:00:00')).toBe('2026-10-31');
  });

  it('only probes addresses that can be terminals', async () => {
    expect(isProbeableHost('192.168.1.50')).toBe(true);
    expect(isProbeableHost('terminal-01.office.local')).toBe(true);
    expect(isProbeableHost('169.254.169.254')).toBe(false);
    expect(isProbeableHost('0.0.0.0')).toBe(false);
    expect(isProbeableHost('')).toBe(false);
    expect((await probeTcp('169.254.169.254', 80)).error).toBe('blocked');
    expect((await probeTcp('127.0.0.1', 70000)).error).toBe('blocked');
  });

  it('reports reachability and latency of a real TCP endpoint', async () => {
    const server = net.createServer((socket) => socket.end());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as net.AddressInfo).port;
    const up = await probeTcp('127.0.0.1', port);
    expect(up.reachable).toBe(true);
    expect(up.latencyMs).toBeGreaterThan(0);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const down = await probeTcp('127.0.0.1', port);
    expect(down.reachable).toBe(false);
    expect(down.error).toBe('refused');
  });
});

describe.skipIf(!isDatabaseConfigured)(
  'Attendance settings are enforced by the Attendance module',
  () => {
    const app = createApp();
    const tenantId = 'tenant_enf_01';
    const companyId = 'comp_enf_01';
    const employeeId = 'emp_enf_01';
    const userId = 'usr_enf_emp_01';
    const email = 'enf_emp@test.example';

    let hr: Record<string, string>;
    let essHeaders: Record<string, string>;

    const hrPut = (path: string, body: unknown) =>
      request(app)
        .put(`/api/v1/hrms/attendance/settings/${path}`)
        .set(hr)
        .send(body as object);
    const hrPost = (path: string, body: unknown = {}) =>
      request(app)
        .post(`/api/v1/hrms/attendance/${path}`)
        .set(hr)
        .send(body as object);
    const checkIn = (body: object = { workLocation: 'office' }) =>
      request(app).post('/api/v1/ess/attendance/check-in').set(essHeaders).send(body);
    const checkOut = (body: object = {}) =>
      request(app).post('/api/v1/ess/attendance/check-out').set(essHeaders).send(body);
    const regularize = (date: string) =>
      request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set(essHeaders)
        .send({ date, checkInTime: '09:00', checkOutTime: '18:00', reason: 'Enforcement test' });

    async function resetPunchesAndAttendance() {
      const db = getDb();
      await db.delete(attendancePunches).where(eq(attendancePunches.employeeId, employeeId));
      await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, employeeId));
    }

    async function resetRegularizations() {
      const db = getDb();
      await db
        .delete(attendanceRegularizations)
        .where(eq(attendanceRegularizations.employeeId, employeeId));
      await db.delete(employeeRequests).where(eq(employeeRequests.employeeId, employeeId));
    }

    async function resetSecurity() {
      await hrPut('security', {
        enableGps: true,
        geofenceConfigs: [],
        ipAllowlist: [],
        enforceIpRestriction: false,
        rapidPunchThrottlingSeconds: 0,
        detectMockLocation: true,
        detectImpossibleTravel: true,
      });
    }

    beforeAll(async () => {
      hr = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();
      const pass = hashPassword('not-used-by-otp');
      await db.insert(users).ignore().values({
        id: userId,
        email,
        passwordHash: pass.hash,
        salt: pass.salt,
        firstName: 'Enforce',
        lastName: 'Tester',
        status: 'active',
        isSuperAdmin: false,
      });
      await db
        .insert(employees)
        .values({
          id: employeeId,
          tenantId,
          companyId,
          userId,
          employeeNumber: 'EMP-ENF-01',
          firstName: 'Enforce',
          lastName: 'Tester',
          email,
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });
      await db
        .insert(memberships)
        .values({
          id: 'mem_enf_emp_01',
          tenantId,
          companyId,
          userId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });
      essHeaders = {
        authorization: `Bearer ${(await signInForTest(email)).token}`,
        'x-company-id': companyId,
      };
      await resetSecurity();
      await resetRegularizations();
    });

    afterAll(async () => {
      if (!isDatabaseConfigured) return;
      await resetPunchesAndAttendance();
      await resetRegularizations();
      await removeHrmsTestAccess([companyId]);
    });

    describe('Regularization settings apply to ESS submissions', () => {
      it('rejects submissions while regularization is disabled, accepts once re-enabled', async () => {
        await hrPut('regularization', { isEnabled: false });
        const blocked = await regularize(isoDaysAgo(1));
        expect(blocked.status).toBe(400);
        expect(blocked.body.error.message).toContain('disabled');

        await hrPut('regularization', { isEnabled: true, submissionWindowDays: 7 });
        const allowed = await regularize(isoDaysAgo(1));
        expect(allowed.status).toBe(201);
      });

      it('enforces the configured submission window', async () => {
        await hrPut('regularization', { isEnabled: true, submissionWindowDays: 2 });
        const tooOld = await regularize(isoDaysAgo(20));
        expect(tooOld.status).toBe(400);
        expect(tooOld.body.error.message).toContain('window');
        await hrPut('regularization', { submissionWindowDays: 7 });
      });
    });

    describe('Payroll lock setting for regularization', () => {
      it('blocks eligibility in a locked period by default and only warns when blockOnPayrollLock=false', async () => {
        const workday = isoDaysAgo(3);
        const periodCode = workday.slice(0, 7);
        await hrPut('payroll', {
          cycleType: 'calendar_month',
          requireApprovalBeforeLock: false,
          blockingSeverity: 'warning_only',
        });
        const lock = await hrPost(`settings/payroll/periods/${periodCode}/lock`);
        expect(lock.status).toBe(200);

        try {
          const eligibility = () =>
            hrPost('regularization/eligibility', {
              employeeId,
              workday,
              requestType: 'incorrect_time',
              proposedCheckIn: '09:00:00',
              proposedCheckOut: '18:00:00',
              reason: 'Lock behaviour test',
            });

          await hrPut('regularization', {
            isEnabled: true,
            submissionWindowDays: 7,
            blockOnPayrollLock: true,
          });
          const blocked = await eligibility();
          expect(blocked.body.data.eligible).toBe(false);
          expect(blocked.body.data.reasons.join(' ')).toContain('locked');

          await hrPut('regularization', { blockOnPayrollLock: false });
          const warned = await eligibility();
          expect(warned.body.data.reasons.join(' ')).not.toContain('locked');
          expect(warned.body.data.warnings.join(' ')).toContain('locked');
          expect(warned.body.data.isHighRisk).toBe(true);
        } finally {
          await hrPut('regularization', { blockOnPayrollLock: true });
          await hrPost(`settings/payroll/periods/${periodCode}/unlock`, {
            reason: 'Enforcement test cleanup',
          });
        }
      });
    });

    describe('Location & Security settings apply to ESS punches', () => {
      const campus = {
        locationId: 'loc_enf_campus',
        name: 'Enforcement Campus',
        latitude: 12.9716,
        longitude: 80.2437,
        radiusMeters: 200,
      };
      const inside = { latitude: 12.9718, longitude: 80.2439, accuracy: 8 };
      const faraway = { latitude: 28.6139, longitude: 77.209, accuracy: 8 };

      it("keeps today's behaviour for an unconfigured company (no strict rules)", async () => {
        await resetPunchesAndAttendance();
        await resetSecurity();
        const res = await checkIn();
        expect(res.status).toBe(200);
      });

      it('asks for location when a strict geofence exists, then accepts a punch inside it', async () => {
        await resetPunchesAndAttendance();
        await hrPut('security', { geofenceConfigs: [{ ...campus, enforceStrict: true }] });

        const missing = await checkIn();
        expect(missing.status).toBe(400);
        expect(missing.body.error.code).toBe('LOCATION_REQUIRED');

        const outside = await checkIn({ workLocation: 'office', deviceMetadata: faraway });
        expect(outside.status).toBe(403);
        expect(outside.body.error.code).toBe('OUTSIDE_GEOFENCE');

        const ok = await checkIn({ workLocation: 'office', deviceMetadata: inside });
        expect(ok.status).toBe(200);

        const outAway = await checkOut({ deviceMetadata: faraway });
        expect(outAway.status).toBe(403);
        const outOk = await checkOut({ deviceMetadata: inside });
        expect(outOk.status).toBe(200);
      });

      it('blocked punches leave no punch record behind', async () => {
        await resetPunchesAndAttendance();
        await checkIn({ workLocation: 'office', deviceMetadata: faraway });
        const rows = await getDb()
          .select({ id: attendancePunches.id })
          .from(attendancePunches)
          .where(and(eq(attendancePunches.employeeId, employeeId)));
        expect(rows).toHaveLength(0);
      });

      it('only flags (does not block) a punch outside an advisory geofence', async () => {
        await resetPunchesAndAttendance();
        await hrPut('security', { geofenceConfigs: [{ ...campus, enforceStrict: false }] });
        const res = await checkIn({ workLocation: 'office', deviceMetadata: faraway });
        expect(res.status).toBe(200);
        const [punch] = await getDb()
          .select()
          .from(attendancePunches)
          .where(eq(attendancePunches.employeeId, employeeId));
        expect((punch?.deviceMetadata as { securityFlags?: string[] }).securityFlags).toContain(
          'outside_geofence',
        );
      });

      it('strictly enforces employee assigned work location geofence', async () => {
        await resetPunchesAndAttendance();
        const db = getDb();

        const locAId = 'loc_test_branch_a';
        const locBId = 'loc_test_branch_b';
        const locRemoteId = 'loc_test_remote';

        // Insert test work locations
        await db
          .insert(locations)
          .ignore()
          .values([
            { id: locAId, tenantId, companyId, name: 'Branch A', type: 'office' },
            { id: locBId, tenantId, companyId, name: 'Branch B', type: 'office' },
            { id: locRemoteId, tenantId, companyId, name: 'Remote Office', type: 'remote' },
          ]);

        const fenceA = {
          locationId: locAId,
          name: 'Branch A',
          latitude: 12.9716,
          longitude: 80.2437,
          radiusMeters: 100,
          enforceStrict: true,
        };
        const fenceB = {
          locationId: locBId,
          name: 'Branch B',
          latitude: 13.0827,
          longitude: 80.2707,
          radiusMeters: 100,
          enforceStrict: true,
        };

        await hrPut('security', { geofenceConfigs: [fenceA, fenceB] });

        // 1. Assign employee to Branch A
        await db.update(employees).set({ locationId: locAId }).where(eq(employees.id, employeeId));

        // Punching inside Branch A succeeds
        const inA = await checkIn({
          workLocation: 'office',
          deviceMetadata: { latitude: 12.9716, longitude: 80.2437 },
        });
        expect(inA.status).toBe(200);

        await resetPunchesAndAttendance();

        // Punching inside Branch B (even though Branch B has a valid geofence) fails because employee is assigned to Branch A
        const inB = await checkIn({
          workLocation: 'office',
          deviceMetadata: { latitude: 13.0827, longitude: 80.2707 },
        });
        expect(inB.status).toBe(403);
        expect(inB.body.error.code).toBe('OUTSIDE_GEOFENCE');

        await resetPunchesAndAttendance();

        // 2. Assign employee to Remote
        await db
          .update(employees)
          .set({ locationId: locRemoteId })
          .where(eq(employees.id, employeeId));
        const remotePunch = await checkIn({ workLocation: 'remote', deviceMetadata: {} });
        expect(remotePunch.status).toBe(200);

        // Reset employee location back to null
        await db.update(employees).set({ locationId: null }).where(eq(employees.id, employeeId));
      });

      it('enforces the office IP allowlist only when enforcement is on', async () => {
        await resetPunchesAndAttendance();
        await resetSecurity();
        await hrPut('security', { ipAllowlist: ['10.99.0.0/16'], enforceIpRestriction: true });
        const blocked = await checkIn();
        expect(blocked.status).toBe(403);
        expect(blocked.body.error.code).toBe('IP_NOT_ALLOWED');

        await hrPut('security', {
          ipAllowlist: ['127.0.0.0/8', '::1'],
          enforceIpRestriction: true,
        });
        const allowed = await checkIn();
        expect(allowed.status).toBe(200);

        await resetPunchesAndAttendance();
        await hrPut('security', { ipAllowlist: ['10.99.0.0/16'], enforceIpRestriction: false });
        const advisory = await checkIn();
        expect(advisory.status).toBe(200);
      });

      it('throttles a repeated punch of the same type within the configured seconds', async () => {
        await resetPunchesAndAttendance();
        await resetSecurity();
        await hrPut('security', { rapidPunchThrottlingSeconds: 600 });
        const first = await checkIn();
        expect(first.status).toBe(200);
        const second = await checkIn();
        expect(second.status).toBe(400);
        expect(second.body.error.code).toBe('PUNCH_THROTTLED');
        const out = await checkOut();
        expect(out.status).toBe(200);
        await resetSecurity();
      });

      it('flags impossible travel and suspected mock location without blocking', async () => {
        await resetPunchesAndAttendance();
        await resetSecurity();
        const first = await checkIn({ workLocation: 'office', deviceMetadata: inside });
        expect(first.status).toBe(200);
        const out = await checkOut({
          deviceMetadata: { ...faraway, mockLocation: true },
        });
        expect(out.status).toBe(200);
        const punches = await getDb()
          .select()
          .from(attendancePunches)
          .where(eq(attendancePunches.employeeId, employeeId));
        const flags = punches.flatMap(
          (p) => (p.deviceMetadata as { securityFlags?: string[] } | null)?.securityFlags ?? [],
        );
        expect(flags).toContain('impossible_travel');
        expect(flags).toContain('mock_location_suspected');
      });
    });

    describe('Manual attendance entry settings apply to HR corrections', () => {
      const correction = (extra: object = {}) =>
        request(app)
          .post('/api/v1/hrms/attendance/manual-correction')
          .set(hr)
          .send({
            employeeId,
            date: isoDaysAgo(5),
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'Manual entry test',
            ...extra,
          });
      const config = (over: object = {}) => ({
        allowedRoles: ['hr', 'company_admin'],
        allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
        approvalMode: 'direct_finalization',
        requireReason: true,
        ...over,
      });
      const setGeneral = (body: object) => hrPut('general', body);

      afterAll(async () => {
        await setGeneral({ manualEntryAllowed: true, manualEntryConfig: config() });
      });

      it('blocks manual entry when it is switched off and allows it when switched on', async () => {
        await setGeneral({ manualEntryAllowed: false });
        const blocked = await correction();
        expect(blocked.status).toBe(403);
        expect(blocked.body.error.code).toBe('MANUAL_ENTRY_DISABLED');

        await setGeneral({ manualEntryAllowed: true, manualEntryConfig: config() });
        expect((await correction()).status).toBe(200);
      });

      it('only lets the configured roles enter attendance manually', async () => {
        await setGeneral({
          manualEntryAllowed: true,
          manualEntryConfig: config({ allowedRoles: ['company_admin'] }),
        });
        const blocked = await correction();
        expect(blocked.status).toBe(403);
        expect(blocked.body.error.code).toBe('MANUAL_ENTRY_ROLE_NOT_ALLOWED');

        await setGeneral({ manualEntryConfig: config({ allowedRoles: ['hr'] }) });
        expect((await correction()).status).toBe(200);
      });

      it('only allows the configured entry methods', async () => {
        await setGeneral({
          manualEntryAllowed: true,
          manualEntryConfig: config({ allowedMethods: ['actual_times'] }),
        });
        const dayOnly = await correction({
          checkInTime: undefined,
          checkOutTime: undefined,
          status: 'present',
        });
        expect(dayOnly.status).toBe(403);
        expect(dayOnly.body.error.code).toBe('MANUAL_ENTRY_METHOD_NOT_ALLOWED');
        expect((await correction()).status).toBe(200);

        await setGeneral({ manualEntryConfig: config() });
        const fullDay = await correction({
          checkInTime: undefined,
          checkOutTime: undefined,
          status: 'present',
        });
        expect(fullDay.status).toBe(200);
      });

      it('requires a reason only when the setting says so', async () => {
        await setGeneral({
          manualEntryAllowed: true,
          manualEntryConfig: config({ requireReason: true }),
        });
        expect((await correction({ reason: undefined })).status).toBe(400);

        await setGeneral({ manualEntryConfig: config({ requireReason: false }) });
        expect((await correction({ reason: undefined })).status).toBe(200);
      });
    });

    describe('Employee visibility and default history settings apply to the ESS view', () => {
      const essAttendance = () => request(app).get('/api/v1/ess/attendance').set(essHeaders);
      const seedDay = (daysAgo: number) =>
        request(app)
          .post('/api/v1/hrms/attendance/manual-correction')
          .set(hr)
          .send({
            employeeId,
            date: isoDaysAgo(daysAgo),
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'History seed',
          });

      beforeAll(async () => {
        await getDb()
          .delete(employeeAttendance)
          .where(eq(employeeAttendance.employeeId, employeeId));
        await hrPut('general', {
          manualEntryAllowed: true,
          manualEntryConfig: {
            allowedRoles: ['hr'],
            allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
            approvalMode: 'direct_finalization',
            requireReason: true,
          },
        });
        for (const d of [1, 2, 10, 20]) await seedDay(d);
      });

      afterAll(async () => {
        await hrPut('general', {
          employeeVisibility: 'daily_and_monthly',
          defaultHistoryView: 'last_30_days',
        });
      });

      it('persists the fine-grained employee visibility choice', async () => {
        for (const value of ['daily_only', 'monthly_summary_only', 'daily_and_monthly']) {
          await hrPut('general', { employeeVisibility: value });
          const res = await request(app).get('/api/v1/hrms/attendance/settings/general').set(hr);
          expect(res.body.data.employeeVisibility).toBe(value);
        }
      });

      it('limits the ESS history to the configured number of days', async () => {
        await hrPut('general', {
          employeeVisibility: 'daily_and_monthly',
          defaultHistoryView: 'custom',
          defaultHistoryViewDays: 3,
        });
        const res = await essAttendance();
        expect(res.status).toBe(200);
        expect(res.body.data.view.historyDays).toBe(3);
        const dates: string[] = res.body.data.history.map((r: { date: string }) => r.date);
        expect(dates).toContain(isoDaysAgo(1));
        expect(dates).toContain(isoDaysAgo(2));
        expect(dates).not.toContain(isoDaysAgo(10));

        await hrPut('general', { defaultHistoryView: 'last_30_days' });
        const wider = await essAttendance();
        const widerDates: string[] = wider.body.data.history.map((r: { date: string }) => r.date);
        expect(widerDates).toContain(isoDaysAgo(20));
      });

      it('shows only the monthly summary, or only daily rows, as configured', async () => {
        await hrPut('general', { employeeVisibility: 'monthly_summary_only' });
        const summaryOnly = await essAttendance();
        expect(summaryOnly.body.data.history).toEqual([]);
        expect(summaryOnly.body.data.monthlySummary.length).toBeGreaterThan(0);

        await hrPut('general', { employeeVisibility: 'daily_only' });
        const dailyOnly = await essAttendance();
        expect(dailyOnly.body.data.history.length).toBeGreaterThan(0);
        expect(dailyOnly.body.data.monthlySummary).toEqual([]);

        await hrPut('general', { employeeVisibility: 'daily_and_monthly' });
        const both = await essAttendance();
        expect(both.body.data.history.length).toBeGreaterThan(0);
        expect(both.body.data.monthlySummary.length).toBeGreaterThan(0);
      });
    });

    describe('Payroll cycle and approval-before-lock settings apply to periods', () => {
      const lock = (code: string) => hrPost(`settings/payroll/periods/${code}/lock`);
      const unlock = (code: string) =>
        hrPost(`settings/payroll/periods/${code}/unlock`, { reason: 'Enforcement test cleanup' });
      const correctionOn = (date: string) =>
        request(app).post('/api/v1/hrms/attendance/manual-correction').set(hr).send({
          employeeId,
          date,
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Cycle boundary test',
        });

      afterAll(async () => {
        await hrPut('payroll', {
          cycleType: 'calendar_month',
          cutoffDay: 30,
          requireApprovalBeforeLock: true,
          blockingSeverity: 'hard_block',
        });
      });

      it('locks a custom-cutoff period over its own boundaries, not the calendar month', async () => {
        await hrPut('general', {
          manualEntryAllowed: true,
          manualEntryConfig: {
            allowedRoles: ['hr'],
            allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
            approvalMode: 'direct_finalization',
            requireReason: true,
          },
        });
        await hrPut('payroll', {
          cycleType: 'custom_cutoff',
          cutoffDay: 25,
          requireApprovalBeforeLock: false,
          blockingSeverity: 'warning_only',
        });
        try {
          const locked = await lock('2026-06');
          expect(locked.status).toBe(200);
          expect(locked.body.data.startDate).toBe('2026-05-26');
          expect(locked.body.data.endDate).toBe('2026-06-25');

          expect((await correctionOn('2026-05-30')).status).toBe(400);
          expect((await correctionOn('2026-06-25')).status).toBe(400);
          expect((await correctionOn('2026-06-26')).status).toBe(200);
          expect((await correctionOn('2026-05-25')).status).toBe(200);
        } finally {
          await unlock('2026-06');
        }
      });

      it('re-aligns an open period when the cycle setting changes', async () => {
        await hrPut('payroll', {
          cycleType: 'calendar_month',
          requireApprovalBeforeLock: false,
          blockingSeverity: 'warning_only',
        });
        const asCalendar = await request(app)
          .get('/api/v1/hrms/attendance/settings/payroll/periods')
          .set(hr);
        const june = asCalendar.body.data.find(
          (p: { periodCode: string }) => p.periodCode === '2026-06',
        );
        expect(june).toMatchObject({ startDate: '2026-06-01', endDate: '2026-06-30' });

        await hrPut('payroll', { cycleType: 'custom_cutoff', cutoffDay: 25 });
        const asCutoff = await request(app)
          .get('/api/v1/hrms/attendance/settings/payroll/periods')
          .set(hr);
        const juneCutoff = asCutoff.body.data.find(
          (p: { periodCode: string }) => p.periodCode === '2026-06',
        );
        expect(juneCutoff).toMatchObject({ startDate: '2026-05-26', endDate: '2026-06-25' });
      });

      it('refuses to lock until the monthly summary is reviewed when approval is required', async () => {
        await hrPut('payroll', {
          cycleType: 'calendar_month',
          requireApprovalBeforeLock: true,
          blockingSeverity: 'warning_only',
        });
        const readiness = await request(app)
          .get('/api/v1/hrms/attendance/settings/payroll/periods/2026-04/readiness')
          .set(hr);
        expect(readiness.status).toBe(200);
        expect(readiness.body.data.canLock).toBe(false);
        expect(readiness.body.data.warnings.join(' ')).toContain('review');

        const refused = await lock('2026-04');
        expect(refused.status).toBe(400);

        await hrPut('payroll', { requireApprovalBeforeLock: false });
        try {
          expect((await lock('2026-04')).status).toBe(200);
        } finally {
          await unlock('2026-04');
        }
      });
    });

    describe('Regularization workflow settings apply to HR submissions', () => {
      const submit = (workday: string, extra: object = {}) =>
        request(app)
          .post('/api/v1/hrms/attendance/regularization')
          .set(hr)
          .send({
            employeeId,
            workday,
            requestType: 'incorrect_time',
            proposedCheckIn: '09:00',
            proposedCheckOut: '18:00',
            reason: 'Workflow settings test',
            ...extra,
          });
      const setRegularization = (body: object) => hrPut('regularization', body);
      const baseline = {
        isEnabled: true,
        submissionWindowDays: 30,
        maxRequestsPerMonth: 50,
        requireReason: true,
        requireEvidence: false,
        blockOnPayrollLock: true,
        allowWithdrawal: true,
        allowedCorrectionTypes: [] as string[],
        approvalHierarchy: 'manager_then_hr',
        autoApproveGraceMinutes: 0,
      };

      beforeAll(async () => {
        await getDb()
          .insert(employees)
          .values({
            id: 'emp_enf_mgr',
            tenantId,
            companyId,
            employeeNumber: 'EMP-ENF-MGR',
            firstName: 'Enforce',
            lastName: 'Manager',
            email: 'enf_mgr@test.example',
            joiningDate: '2024-01-01',
            employmentStatus: 'active',
            employmentType: 'full_time',
          })
          .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });
        await getDb()
          .update(employees)
          .set({ reportingManagerId: 'emp_enf_mgr' })
          .where(eq(employees.id, employeeId));
        await setRegularization(baseline);
      });

      afterAll(async () => {
        await setRegularization(baseline);
      });

      it('only accepts the correction categories enabled in settings', async () => {
        await setRegularization({ allowedCorrectionTypes: ['missed_check_in'] });
        const blocked = await submit(isoDaysAgo(2), {
          requestType: 'missing_out',
          proposedCheckIn: undefined,
        });
        expect(blocked.status).toBe(400);
        expect(blocked.body.error.message).toContain('not enabled');

        const allowed = await submit(isoDaysAgo(3), {
          requestType: 'missing_in',
          proposedCheckOut: undefined,
        });
        expect(allowed.status).toBe(201);
        await setRegularization({ allowedCorrectionTypes: [] });
      });

      it('requires a reason only when the setting says so', async () => {
        const missing = await submit(isoDaysAgo(4), { reason: '' });
        expect(missing.status).toBe(400);

        await setRegularization({ requireReason: false });
        const optional = await submit(isoDaysAgo(4), { reason: '' });
        expect(optional.status).toBe(201);
        expect(optional.body.data.reason).toBe('No reason provided');
        await setRegularization({ requireReason: true });
      });

      it('routes to the reporting manager, or straight to HR for an HR-only hierarchy', async () => {
        const viaManager = await submit(isoDaysAgo(5));
        expect(viaManager.status).toBe(201);
        expect(viaManager.body.data.assignedTo).toBe('emp_enf_mgr');
        expect(viaManager.body.data.assignedQueue).toBe('manager_queue');

        await setRegularization({ approvalHierarchy: 'hr_only' });
        const viaHr = await submit(isoDaysAgo(6));
        expect(viaHr.status).toBe(201);
        expect(viaHr.body.data.assignedTo).toBeNull();
        expect(viaHr.body.data.assignedQueue).toBe('hr_unassigned');
        await setRegularization({ approvalHierarchy: 'manager_then_hr' });
      });

      it('auto-approves every request for a zero-touch hierarchy', async () => {
        await setRegularization({ approvalHierarchy: 'auto_approve' });
        const res = await submit(isoDaysAgo(7));
        expect(res.status).toBe(201);
        expect(res.body.data.approvalStatus).toBe('approved');
        expect(res.body.data.decidedByUserId).toBe('system:auto-approval');
        await setRegularization({ approvalHierarchy: 'manager_then_hr' });
      });

      it('auto-approves a time correction within the grace minutes only', async () => {
        const day = isoDaysAgo(8);
        await request(app).post('/api/v1/hrms/attendance/manual-correction').set(hr).send({
          employeeId,
          date: day,
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Seed recorded times',
        });
        await setRegularization({ autoApproveGraceMinutes: 10 });

        const within = await submit(day, { proposedCheckIn: '09:05', proposedCheckOut: '18:00' });
        expect(within.status).toBe(201);
        expect(within.body.data.approvalStatus).toBe('approved');

        const outside = await submit(isoDaysAgo(9), {
          proposedCheckIn: '09:40',
          proposedCheckOut: '18:00',
        });
        expect(outside.status).toBe(201);
        expect(outside.body.data.approvalStatus).toBe('submitted');
        await setRegularization({ autoApproveGraceMinutes: 0 });
      });

      it('blocks the employee from withdrawing a request when withdrawal is disabled', async () => {
        const created = await submit(isoDaysAgo(10));
        expect(created.status).toBe(201);
        const id = created.body.data.id as string;

        await setRegularization({ allowWithdrawal: false });
        await expect(
          attendanceRegularizationService.cancelRequest(
            tenantId,
            companyId,
            id,
            'changed mind',
            userId,
          ),
        ).rejects.toMatchObject({ code: 'WITHDRAWAL_DISABLED' });

        // HR can still cancel it, and the employee can once withdrawal is allowed again.
        await setRegularization({ allowWithdrawal: true });
        const cancelled = await attendanceRegularizationService.cancelRequest(
          tenantId,
          companyId,
          id,
          'changed mind',
          userId,
        );
        expect(cancelled.approvalStatus).toBe('cancelled');
      });
    });

    describe('Day boundary setting applies to the ESS workday', () => {
      const todayRecord = async () => {
        const res = await request(app).get('/api/v1/ess/attendance').set(essHeaders);
        return res.body.data.today.date as string;
      };

      afterAll(async () => {
        await hrPut('general', { dayBoundaryTime: '00:00:00' });
      });

      it('books a punch to the workday defined by the boundary, and checks out against it', async () => {
        await resetPunchesAndAttendance();
        await resetSecurity();

        await hrPut('general', { dayBoundaryTime: '00:00:00' });
        const genRes = await request(app).get('/api/v1/hrms/attendance/settings/general').set(hr);
        const tz = genRes.body.data?.timezone ?? 'Asia/Kolkata';
        expect(await todayRecord()).toBe(resolveWorkday(new Date(), '00:00:00', tz));

        // A boundary just before midnight makes "today" still belong to the previous workday.
        await hrPut('general', { dayBoundaryTime: '23:59:00' });
        const expected = resolveWorkday(new Date(), '23:59:00', tz);
        expect(await todayRecord()).toBe(expected);

        const checkedIn = await checkIn();
        expect(checkedIn.status).toBe(200);
        expect(checkedIn.body.data.date).toBe(expected);

        const checkedOut = await checkOut();
        expect(checkedOut.status).toBe(200);
        expect(checkedOut.body.data.date).toBe(expected);
      });
    });

    describe('Lock readiness counts pending regularizations of the period only', () => {
      const readiness = (code: string) =>
        request(app)
          .get(`/api/v1/hrms/attendance/settings/payroll/periods/${code}/readiness`)
          .set(hr);

      it('does not count requests that belong to other periods', async () => {
        await hrPut('payroll', { cycleType: 'calendar_month' });
        const db = getDb();
        await db.delete(employeeRequests).where(eq(employeeRequests.employeeId, employeeId));
        await db.insert(employeeRequests).values({
          id: 'req_enf_period_01',
          tenantId,
          companyId,
          employeeId,
          requestType: 'attendance_regularization',
          subject: 'Period scoped request',
          details: { date: '2026-02-12', checkInTime: '09:00', checkOutTime: '18:00', reason: 'x' },
          status: 'pending',
        });
        try {
          expect((await readiness('2026-02')).body.data.pendingRegularizations).toBe(1);
          expect((await readiness('2026-03')).body.data.pendingRegularizations).toBe(0);
        } finally {
          await db.delete(employeeRequests).where(eq(employeeRequests.id, 'req_enf_period_01'));
        }
      });
    });

    describe('Auto-lock on cutoff', () => {
      const autoTenant = 'tenant_autolock_01';
      const autoCompany = 'comp_autolock_01';
      let autoHr: Record<string, string>;
      const putPayroll = (body: object) =>
        request(app).put('/api/v1/hrms/attendance/settings/payroll').set(autoHr).send(body);
      const periodStatus = async (code: string) => {
        const res = await request(app)
          .get('/api/v1/hrms/attendance/settings/payroll/periods')
          .set(autoHr);
        return res.body.data.find((p: { periodCode: string }) => p.periodCode === code);
      };
      const sweep = (now: string) =>
        attendanceAutoLockService.runSweep({ now: new Date(now), companyId: autoCompany });

      beforeAll(async () => {
        autoHr = await hrmsTestHeaders(autoCompany, autoTenant);
        await getDb().delete(attendancePeriods).where(eq(attendancePeriods.companyId, autoCompany));
      });

      afterAll(async () => {
        await putPayroll({ autoLockOnCutoff: false, cycleType: 'calendar_month' });
        await getDb().delete(attendancePeriods).where(eq(attendancePeriods.companyId, autoCompany));
        await removeHrmsTestAccess([autoCompany]);
      });

      it('does nothing for a company that has not switched it on', async () => {
        await putPayroll({
          autoLockOnCutoff: false,
          cycleType: 'calendar_month',
          requireApprovalBeforeLock: false,
          blockingSeverity: 'warning_only',
        });
        expect(await sweep('2026-03-05T10:00:00Z')).toEqual([]);
      });

      it('locks the period that has just ended, once, and never the current one', async () => {
        await putPayroll({ autoLockOnCutoff: true });
        const first = await sweep('2026-03-05T10:00:00Z');
        expect(first).toEqual([
          expect.objectContaining({ periodCode: '2026-02', outcome: 'locked' }),
        ]);
        expect((await periodStatus('2026-02')).status).toBe('locked');
        expect(await periodStatus('2026-03')).toBeUndefined();

        const again = await sweep('2026-03-06T10:00:00Z');
        expect(again[0]).toMatchObject({ periodCode: '2026-02', outcome: 'already_locked' });
      });

      it('respects a period an administrator re-opened', async () => {
        await request(app)
          .post('/api/v1/hrms/attendance/settings/payroll/periods/2026-02/unlock')
          .set(autoHr)
          .send({ reason: 'Late corrections needed' });
        const result = await sweep('2026-03-07T10:00:00Z');
        expect(result[0]).toMatchObject({ periodCode: '2026-02', outcome: 'reopened_by_admin' });
        expect((await periodStatus('2026-02')).status).toBe('open');
      });

      it('follows a custom cutoff day', async () => {
        await putPayroll({ cycleType: 'custom_cutoff', cutoffDay: 25 });
        // 2026-04-20 is still inside period 2026-04 (26 Mar - 25 Apr), so 2026-03 has just ended.
        const before = await sweep('2026-04-20T10:00:00Z');
        expect(before[0]).toMatchObject({ periodCode: '2026-03', outcome: 'locked' });
        const locked = await periodStatus('2026-03');
        expect(locked).toMatchObject({ startDate: '2026-02-26', endDate: '2026-03-25' });
      });

      it('leaves a period open while the lock rules are not met', async () => {
        await putPayroll({ cycleType: 'calendar_month', requireApprovalBeforeLock: true });
        const result = await sweep('2026-07-05T10:00:00Z');
        expect(result[0]).toMatchObject({ periodCode: '2026-06', outcome: 'not_ready' });
        expect((await periodStatus('2026-06'))?.status ?? 'open').toBe('open');
      });
    });

    describe('Attendance alerts reach the in-app notification feed', () => {
      const alertConfig = (lateArrival: object, regularizationPending?: object) => ({
        alertSettings: {
          events: {
            lateArrival,
            regularizationPending: regularizationPending ?? {
              enabled: false,
              recipients: [],
              channels: ['in_app'],
            },
          },
          timing: { digestFrequency: 'instant' },
          escalation: { enabled: false },
        },
      });
      const notificationsFor = (id: string, title: string) =>
        getDb()
          .select()
          .from(employeeNotifications)
          .where(
            and(eq(employeeNotifications.employeeId, id), eq(employeeNotifications.title, title)),
          );
      const clearNotifications = async () => {
        for (const id of [employeeId, 'emp_enf_mgr']) {
          await getDb()
            .delete(employeeNotifications)
            .where(eq(employeeNotifications.employeeId, id));
        }
      };

      beforeAll(async () => {
        await getDb()
          .insert(employees)
          .values({
            id: 'emp_enf_mgr',
            tenantId,
            companyId,
            employeeNumber: 'EMP-ENF-MGR',
            firstName: 'Enforce',
            lastName: 'Manager',
            email: 'enf_mgr@test.example',
            joiningDate: '2024-01-01',
            employmentStatus: 'active',
            employmentType: 'full_time',
          })
          .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });
        await getDb()
          .update(employees)
          .set({ reportingManagerId: 'emp_enf_mgr' })
          .where(eq(employees.id, employeeId));
      });

      afterAll(async () => {
        vi.restoreAllMocks();
        await clearNotifications();
        await hrPut(
          'general',
          alertConfig({ enabled: true, recipients: ['employee'], channels: ['in_app'] }),
        );
      });

      it('notifies the employee and manager of a late arrival, when enabled for in-app', async () => {
        vi.spyOn(attendanceService, 'getCurrentTimeString').mockReturnValue('11:30');
        await clearNotifications();
        await resetPunchesAndAttendance();
        await resetSecurity();
        await hrPut(
          'general',
          alertConfig({
            enabled: true,
            recipients: ['employee', 'reporting_manager'],
            channels: ['in_app'],
          }),
        );

        expect((await checkIn()).status).toBe(200);
        const own = await notificationsFor(employeeId, 'Late arrival');
        const manager = await notificationsFor('emp_enf_mgr', 'Late arrival');
        expect(own).toHaveLength(1);
        expect(own[0]?.message).toContain('11:30');
        expect(manager).toHaveLength(1);
        expect(manager[0]?.message).toContain('Enforce Tester');
      });

      it('stays quiet when the event is off or in-app is not selected', async () => {
        vi.spyOn(attendanceService, 'getCurrentTimeString').mockReturnValue('11:30');
        for (const config of [
          { enabled: false, recipients: ['employee'], channels: ['in_app'] },
          { enabled: true, recipients: ['employee'], channels: ['email'] },
        ]) {
          await clearNotifications();
          await resetPunchesAndAttendance();
          await hrPut('general', alertConfig(config));
          expect((await checkIn()).status).toBe(200);
          expect(await notificationsFor(employeeId, 'Late arrival')).toHaveLength(0);
        }
      });

      it('tells the assigned approver about a pending regularization, once', async () => {
        await clearNotifications();
        await resetRegularizations();
        await hrPut('regularization', {
          isEnabled: true,
          submissionWindowDays: 30,
          maxRequestsPerMonth: 50,
          requireReason: true,
          approvalHierarchy: 'manager_then_hr',
          autoApproveGraceMinutes: 0,
          allowedCorrectionTypes: [],
        });
        await hrPut(
          'general',
          alertConfig(
            { enabled: false, recipients: [], channels: ['in_app'] },
            {
              enabled: true,
              recipients: ['assigned_approver', 'reporting_manager', 'employee'],
              channels: ['in_app'],
            },
          ),
        );

        const res = await request(app)
          .post('/api/v1/hrms/attendance/regularization')
          .set(hr)
          .send({
            employeeId,
            workday: isoDaysAgo(3),
            requestType: 'incorrect_time',
            proposedCheckIn: '09:00',
            proposedCheckOut: '18:00',
            reason: 'Alert test',
          });
        expect(res.status).toBe(201);

        const approverNotes = await notificationsFor(
          'emp_enf_mgr',
          'Regularization request pending',
        );
        expect(approverNotes).toHaveLength(1);
        expect(approverNotes[0]?.type).toBe('action_required');
        // The submitter already gets their own confirmation, so no duplicate alert.
        expect(await notificationsFor(employeeId, 'Regularization request pending')).toHaveLength(
          0,
        );
      });
    });
  },
);
