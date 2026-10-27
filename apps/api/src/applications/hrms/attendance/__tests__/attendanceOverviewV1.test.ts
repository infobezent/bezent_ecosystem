import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  employees,
  departments,
  employeeLeaveRequests,
  attendanceOnDutyRequests,
  attendanceExceptions,
  attendanceRegularizations,
  attendanceMonthlySummaries,
  employeeNotifications,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import { attendanceOverviewService } from '../service/attendanceOverview.service.js';
import type { CompanyAccess } from '../../../../platform/access/types/access.types.js';

describe.skipIf(!isDatabaseConfigured)('BEZENT HRMS — Attendance Overview V1.0 Test Suite', () => {
  const tenantId = 'tenant_overview_v1';
  const companyId = 'comp_overview_v1';
  const otherCompanyId = 'comp_overview_v1_other';

  const dept1 = generateSurrogateId('dept');
  const dept2 = generateSurrogateId('dept');

  const empActive1 = generateSurrogateId('emp'); // Present + Late
  const empActive2 = generateSurrogateId('emp'); // Half-day + Leave
  const empActive3 = generateSurrogateId('emp'); // On-Duty
  const empMidMonthJoiner = generateSurrogateId('emp'); // Joins in future
  const empLeaver = generateSurrogateId('emp'); // Left before test date
  const empOtherComp = generateSurrogateId('emp'); // Different company

  const testDate = '2026-10-10';
  let headers: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    await hrmsTestHeaders(otherCompanyId, tenantId);
    const db = getDb();

    // 0. Clean up prior test runs for tenantId
    await db.delete(employeeAttendance).where(eq(employeeAttendance.tenantId, tenantId));
    await db.delete(attendanceExceptions).where(eq(attendanceExceptions.tenantId, tenantId));
    await db
      .delete(attendanceRegularizations)
      .where(eq(attendanceRegularizations.tenantId, tenantId));
    await db
      .delete(attendanceOnDutyRequests)
      .where(eq(attendanceOnDutyRequests.tenantId, tenantId));
    await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.tenantId, tenantId));
    await db
      .delete(attendanceMonthlySummaries)
      .where(eq(attendanceMonthlySummaries.tenantId, tenantId));
    await db.delete(employeeNotifications).where(eq(employeeNotifications.tenantId, tenantId));
    await db.delete(employees).where(eq(employees.tenantId, tenantId));
    await db.delete(departments).where(eq(departments.tenantId, tenantId));

    // 1. Seed Departments
    await db
      .insert(departments)
      .values([
        { id: dept1, tenantId, companyId, name: 'Engineering', code: 'ENG' },
        { id: dept2, tenantId, companyId, name: 'Operations', code: 'OPS' },
      ])
      .onDuplicateKeyUpdate({ set: { name: 'Engineering' } });

    // 2. Seed Employees
    await db
      .insert(employees)
      .values([
        {
          id: empActive1,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OV-01',
          firstName: 'Alice',
          lastName: 'Dev',
          email: 'alice.dev@example.com',
          departmentId: dept1,
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
        },
        {
          id: empActive2,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OV-02',
          firstName: 'Bob',
          lastName: 'Ops',
          email: 'bob.ops@example.com',
          departmentId: dept2,
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
        },
        {
          id: empActive3,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OV-03',
          firstName: 'Charlie',
          lastName: 'Field',
          email: 'charlie.field@example.com',
          departmentId: dept2,
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
        },
        {
          id: empMidMonthJoiner,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OV-04',
          firstName: 'David',
          lastName: 'Joiner',
          email: 'david.joiner@example.com',
          departmentId: dept1,
          joiningDate: '2026-10-25', // After testDate!
          employmentStatus: 'active',
        },
        {
          id: empLeaver,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OV-05',
          firstName: 'Eve',
          lastName: 'Leaver',
          email: 'eve.leaver@example.com',
          departmentId: dept1,
          joiningDate: '2025-01-01',
          lastWorkingDate: '2026-09-30', // Before testDate!
          employmentStatus: 'resigned',
        },
        {
          id: empOtherComp,
          tenantId,
          companyId: otherCompanyId,
          employeeNumber: 'EMP-OV-99',
          firstName: 'Mallory',
          lastName: 'Foreign',
          email: 'mallory@example.com',
          departmentId: null,
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { firstName: 'Alice' } });

    // 3. Seed Employee Attendance for testDate
    await db
      .insert(employeeAttendance)
      .values([
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: empActive1,
          date: testDate,
          checkInTime: '09:20:00',
          checkOutTime: '18:00:00',
          status: 'present',
          processingState: 'finalized',
          workedMinutes: 520,
          lateMinutes: 20,
          isLate: true,
          isMissingPunch: false,
        },
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: empActive2,
          date: testDate,
          checkInTime: '09:00:00',
          checkOutTime: '13:00:00',
          status: 'half_day',
          processingState: 'finalized',
          workedMinutes: 240,
          lateMinutes: 0,
          isLate: false,
          isMissingPunch: false,
        },
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: empActive3,
          date: testDate,
          checkInTime: '09:00:00',
          checkOutTime: null,
          status: 'present',
          processingState: 'provisional',
          workedMinutes: 480,
          lateMinutes: 0,
          isLate: false,
          isMissingPunch: true, // Missing checkout punch!
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'present' } });

    // 4. Seed Leave for empActive2 on testDate (half-day leave)
    await db
      .insert(employeeLeaveRequests)
      .values({
        id: generateSurrogateId('lv'),
        tenantId,
        companyId,
        employeeId: empActive2,
        leaveType: 'annual',
        startDate: testDate,
        endDate: testDate,
        totalDays: 1,
        status: 'approved',
        reason: 'Personal appointment',
      })
      .onDuplicateKeyUpdate({ set: { status: 'approved' } });

    // 5. Seed Approved On-Duty for empActive3 on testDate
    await db
      .insert(attendanceOnDutyRequests)
      .values({
        id: generateSurrogateId('od'),
        requestNumber: 'OD-2026-90001',
        tenantId,
        companyId,
        employeeId: empActive3,
        odTypeId: 'client_visit',
        odTypeName: 'Client Site Inspection',
        startDate: testDate,
        endDate: testDate,
        durationType: 'full_day',
        reason: 'On-site technical audit',
        status: 'approved',
      })
      .onDuplicateKeyUpdate({ set: { status: 'approved' } });

    // 6. Seed Pending Regularization Request
    await db
      .insert(attendanceRegularizations)
      .values({
        id: generateSurrogateId('reg'),
        requestNumber: 'REG-2026-90001',
        tenantId,
        companyId,
        employeeId: empActive1,
        workday: testDate,
        requestType: 'missing_in',
        approvalStatus: 'submitted',
        reason: 'Biometric reader error',
      })
      .onDuplicateKeyUpdate({ set: { approvalStatus: 'submitted' } });

    // 7. Seed Unresolved Exception
    await db
      .insert(attendanceExceptions)
      .values({
        id: generateSurrogateId('exc'),
        tenantId,
        companyId,
        employeeId: empActive3,
        workday: testDate,
        exceptionType: 'missing_out',
        severity: 'high',
        sourceRecordType: 'attendance',
        sourceRecordId: empActive3,
        title: 'Missing Punch Out',
        status: 'open',
      })
      .onDuplicateKeyUpdate({ set: { status: 'open' } });

    // 8. Seed Monthly Summary
    await db
      .insert(attendanceMonthlySummaries)
      .values({
        id: generateSurrogateId('ams'),
        tenantId,
        companyId,
        employeeId: empActive1,
        month: '2026-10',
        scheduledDays: 22,
        scheduledMinutes: 10560,
        presentDays: '20.00',
        absentDays: '1.00',
        leaveDays: '1.00',
        onDutyDays: '0.00',
        weeklyOffDays: 8,
        holidayDays: 1,
        actualWorkedMinutes: 10200,
        policyCreditedMinutes: 10200,
        lateOccurrences: 1,
        lateMinutes: 20,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 0,
        pendingCorrections: 0,
        reviewState: 'in_review',
        payrollReadiness: 'needs_review',
        isLocked: false,
        version: 1,
      })
      .onDuplicateKeyUpdate({ set: { scheduledDays: 22 } });
  });

  /* ───────────────────────────────────────────────────────────────────
   * 1. TODAY ATTENDANCE KPIS
   * ─────────────────────────────────────────────────────────────────── */

  it('calculates mathematically accurate Today Attendance KPIs respecting joiners/leavers', async () => {
    const kpis = await attendanceOverviewService.getTodayKpis(tenantId, companyId, testDate);

    // Eligible employees: empActive1, empActive2, empActive3 = 3.
    // empMidMonthJoiner (joined 2026-10-25) and empLeaver (left 2026-09-30) are excluded!
    // empOtherComp is excluded due to company isolation!
    expect(kpis.totalEligibleEmployees).toBe(3);

    // empActive1: 1.0 present (late arrivals = 1)
    // empActive2: 0.5 present, 0.5 leave
    // empActive3: 1.0 present, on-duty = 1, missing punch = 1
    // Present equivalents = 1.0 + 0.5 + 1.0 = 2.5
    expect(kpis.presentCount).toBe(2.5);
    expect(kpis.lateArrivalsCount).toBe(1);
    expect(kpis.onLeaveCount).toBe(0.5);
    expect(kpis.onDutyCount).toBe(1.0);
    expect(kpis.missingPunchCount).toBe(1);

    // Attendance rate = (2.5 / 3) * 100 = 83.3%
    expect(kpis.attendanceRate).toBe(83.3);
  });

  it('guarantees future work dates are not marked absent and report upcoming status', async () => {
    const futureDate = '2028-12-01';
    const kpis = await attendanceOverviewService.getTodayKpis(tenantId, companyId, futureDate);

    expect(kpis.isFuture).toBe(true);
    expect(kpis.presentCount).toBe(0);
    expect(kpis.absentCount).toBe(0);
    expect(kpis.attendanceRate).toBeNull();
    expect(kpis.pendingProcessingCount).toBeGreaterThanOrEqual(1);

    const health = await attendanceOverviewService.getProcessingHealth(
      tenantId,
      companyId,
      futureDate,
    );
    expect(health.status).toBe('upcoming');
    expect(health.processingSuccessRate).toBeNull();
  });

  /* ───────────────────────────────────────────────────────────────────
   * 2. ATTENDANCE TRENDS
   * ─────────────────────────────────────────────────────────────────── */

  it('returns date-based trends without fabricating data or dividing by zero', async () => {
    const trends = await attendanceOverviewService.getTrends(tenantId, companyId, {
      date: testDate,
      trendRange: '7d',
    });

    expect(trends.range).toBe('7d');
    expect(trends.items.length).toBe(7);
    expect(trends.totalLateOccurrences).toBeGreaterThanOrEqual(1);

    // Day of testDate
    const testDayItem = trends.items.find((item) => item.date === testDate);
    expect(testDayItem).toBeDefined();
    expect(testDayItem?.scheduledDayEquivalents).toBe(3);
    expect(testDayItem?.presentEquivalentDays).toBe(2.5);
    expect(testDayItem?.attendanceRate).toBe(83.3);
  });

  /* ───────────────────────────────────────────────────────────────────
   * 3. DEPARTMENT COMPARISON
   * ─────────────────────────────────────────────────────────────────── */

  it('groups attendance statistics accurately by authorized department', async () => {
    const depts = await attendanceOverviewService.getDepartmentComparison(
      tenantId,
      companyId,
      testDate,
    );

    expect(depts.length).toBeGreaterThanOrEqual(2);

    const eng = depts.find((d) => d.departmentId === dept1);
    expect(eng).toBeDefined();
    expect(eng?.eligibleEmployees).toBe(1); // empActive1
    expect(eng?.presentEquivalents).toBe(1.0);
    expect(eng?.attendanceRate).toBe(100);

    const ops = depts.find((d) => d.departmentId === dept2);
    expect(ops).toBeDefined();
    expect(ops?.eligibleEmployees).toBe(2); // empActive2, empActive3
    expect(ops?.presentEquivalents).toBe(1.5);
    expect(ops?.attendanceRate).toBe(75);
    expect(ops?.missingPunchCount).toBe(1); // empActive3
  });

  /* ───────────────────────────────────────────────────────────────────
   * 4. ACTION REQUIRED QUEUE
   * ─────────────────────────────────────────────────────────────────── */

  it('aggregates pending action items with severity, age, and valid routes', async () => {
    const queue = await attendanceOverviewService.getActionQueue(tenantId, companyId);

    expect(queue.length).toBe(7);

    const reg = queue.find((q) => q.actionType === 'pending_regularization');
    expect(reg).toBeDefined();
    expect(reg?.authorizedPendingCount).toBeGreaterThanOrEqual(1);
    expect(reg?.targetRoute).toBe('/hrms/attendance/regularization');

    const exc = queue.find((q) => q.actionType === 'unresolved_exceptions');
    expect(exc).toBeDefined();
    expect(exc?.authorizedPendingCount).toBeGreaterThanOrEqual(1);
    expect(exc?.description).toContain('blocking payroll');
    expect(exc?.targetRoute).toBe('/hrms/attendance/exceptions');

    const mp = queue.find((q) => q.actionType === 'missing_punch_issues');
    expect(mp).toBeDefined();
    expect(mp?.targetRoute).toBe('/hrms/attendance/daily-log');

    const ot = queue.find((q) => q.actionType === 'pending_overtime_claims');
    expect(ot).toBeDefined();
    expect(ot?.targetRoute).toBe('/hrms/attendance/overtime');
  });

  /* ───────────────────────────────────────────────────────────────────
   * 5. PROCESSING HEALTH & RECONCILIATION
   * ─────────────────────────────────────────────────────────────────── */

  it('evaluates processing health with documented denominator and pipeline status', async () => {
    const health = await attendanceOverviewService.getProcessingHealth(
      tenantId,
      companyId,
      testDate,
    );

    expect(health.eligibleWorkdays).toBe(3);
    expect(health.processedWorkdays).toBe(2); // empActive1 & empActive2 finalized
    expect(health.pendingWorkdays).toBe(1); // empActive3 provisional
    expect(health.unresolvedBlockingExceptions).toBeGreaterThanOrEqual(1);
    expect(health.workdayBlockingExceptions).toBeGreaterThanOrEqual(1);
    expect(health.cumulativeBlockingExceptions).toBeGreaterThanOrEqual(1);
    expect(typeof health.historicalBlockingExceptions).toBe('number');
    expect(health.denominatorDescription).toContain(
      'Processed Finalized (2) / Eligible Workdays (3)',
    );
  });

  /* ───────────────────────────────────────────────────────────────────
   * 6. MONTHLY PAYROLL READINESS
   * ─────────────────────────────────────────────────────────────────── */

  it('separates readiness, review, and lock as independent dimensions', async () => {
    const adminAccess: CompanyAccess = {
      tenantId,
      companyId,
      companyName: 'Test Company',
      companyCode: 'TC',
      tenantName: 'Test Tenant',
      isMember: true,
      isPlatformOversight: false,
      roles: [],
      permissions: ['hrms.attendance.view', 'hrms.payroll.view'],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['hrms'],
    };

    const readiness = await attendanceOverviewService.getMonthlyPayrollReadiness(
      tenantId,
      companyId,
      '2026-10',
      adminAccess,
    );

    expect(readiness.isAuthorized).toBe(true);
    expect(readiness.totalInScope).toBeGreaterThanOrEqual(1);
    expect(readiness.needsReviewCount).toBeGreaterThanOrEqual(1);
    expect(readiness.pendingReviewCount).toBeGreaterThanOrEqual(1);
    expect(readiness.lockedCount).toBe(0);
    expect(readiness.targetRoute).toBe('/hrms/attendance/monthly-summary');
  });

  /* ───────────────────────────────────────────────────────────────────
   * 7. RBAC & TENANT ISOLATION
   * ─────────────────────────────────────────────────────────────────── */

  it('enforces strict tenant & cross-company isolation against data leakage', async () => {
    // Overview for otherCompanyId
    const otherKpis = await attendanceOverviewService.getTodayKpis(
      tenantId,
      otherCompanyId,
      testDate,
    );

    // Only empOtherComp exists in otherCompanyId
    expect(otherKpis.totalEligibleEmployees).toBe(1);

    // Ensure empActive1, empActive2, empActive3 were NOT leaked into otherCompanyId
    expect(otherKpis.presentCount).toBe(0);
    expect(otherKpis.onDutyCount).toBe(0);
  });

  it('enforces employee self-service scoping where employee sees only own metrics', async () => {
    const employeeAccess: CompanyAccess = {
      tenantId,
      companyId,
      companyName: 'Test Company',
      companyCode: 'TC',
      tenantName: 'Test Tenant',
      isMember: true,
      isPlatformOversight: false,
      roles: [],
      permissions: [], // No admin permissions
      enabledModules: ['hrms'],
      essEligible: true,
      employeeId: empActive1,
      workspaces: ['hrms'],
    };

    const kpis = await attendanceOverviewService.getTodayKpis(
      tenantId,
      companyId,
      testDate,
      employeeAccess,
    );

    // Scoped only to empActive1
    expect(kpis.totalEligibleEmployees).toBe(1);
    expect(kpis.presentCount).toBe(1.0);
    expect(kpis.onLeaveCount).toBe(0);
    expect(kpis.onDutyCount).toBe(0);

    const readiness = await attendanceOverviewService.getMonthlyPayrollReadiness(
      tenantId,
      companyId,
      '2026-10',
      employeeAccess,
    );
    expect(readiness.isAuthorized).toBe(false);
  });

  /* ───────────────────────────────────────────────────────────────────
   * 8. API ENDPOINT INTEGRATION
   * ─────────────────────────────────────────────────────────────────── */

  it('GET /hrms/attendance/overview returns complete consolidated operational payload', async () => {
    const app = createApp();

    const res = await request(app)
      .get(`/api/v1/hrms/attendance/overview?date=${testDate}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.date).toBe(testDate);
    expect(data.dataFreshness).toBe('realtime');
    expect(data.todayKpis).toBeDefined();
    expect(data.todayKpis.totalEligibleEmployees).toBe(3);
    expect(data.todayKpis.presentCount).toBe(2.5);

    expect(data.trends).toBeDefined();
    expect(data.trends.items.length).toBeGreaterThanOrEqual(7);

    expect(data.departments).toBeDefined();
    expect(data.departments.length).toBeGreaterThanOrEqual(2);

    expect(data.actionQueue).toBeDefined();
    expect(data.actionQueue.length).toBe(7);

    expect(data.processingHealth).toBeDefined();
    expect(data.monthlyReadiness).toBeDefined();

    // Backwards-compatible legacy properties
    expect(data.expectedCount).toBe(3);
    expect(data.presentCount).toBe(2.5);
    expect(data.attendanceRate).toBe(83.3);
    expect(data.departmentBreakdown.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /hrms/attendance/overview/today returns today KPIs endpoint', async () => {
    const app = createApp();

    const res = await request(app)
      .get(`/api/v1/hrms/attendance/overview/today?date=${testDate}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.totalEligibleEmployees).toBe(3);
    expect(res.body.data.presentCount).toBe(2.5);
  });

  it('GET /hrms/attendance/overview/trends returns trend series endpoint', async () => {
    const app = createApp();

    const res = await request(app)
      .get(`/api/v1/hrms/attendance/overview/trends?date=${testDate}&trendRange=7d`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.range).toBe('7d');
    expect(res.body.data.items.length).toBe(7);
  });

  it('GET /hrms/attendance/overview/departments returns department comparison endpoint', async () => {
    const app = createApp();

    const res = await request(app)
      .get(`/api/v1/hrms/attendance/overview/departments?date=${testDate}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /hrms/attendance/overview/actions returns action required queue endpoint', async () => {
    const app = createApp();

    const res = await request(app).get('/api/v1/hrms/attendance/overview/actions').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(7);
  });

  it('GET /hrms/attendance/overview/processing-health returns health diagnostics endpoint', async () => {
    const app = createApp();

    const res = await request(app)
      .get(`/api/v1/hrms/attendance/overview/processing-health?date=${testDate}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.eligibleWorkdays).toBe(3);
  });

  it('GET /hrms/attendance/overview/monthly-readiness returns monthly readiness endpoint', async () => {
    const app = createApp();

    const res = await request(app)
      .get('/api/v1/hrms/attendance/overview/monthly-readiness?month=2026-10')
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.month).toBe('2026-10');
    expect(res.body.data.isAuthorized).toBe(true);
  });
});
