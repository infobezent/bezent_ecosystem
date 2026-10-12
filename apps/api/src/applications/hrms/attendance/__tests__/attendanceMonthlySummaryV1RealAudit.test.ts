import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendanceMonthlySummaries,
  attendanceMonthlyReviews,
  attendanceMonthlyReadinessEvaluations,
  attendanceMonthlyAudits,
  employeeAttendance,
  employeeLeaveRequests,
  attendanceOnDutyRequests,
  attendanceOnDutyWorkdays,
  attendanceRegularizations,
  attendanceExceptions,
  employeeNotifications,
  employeeWorkSchedules,
  employees,
  users,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('BEZENT HRMS — Attendance Monthly Summary V1.0 Real DB & API Audit', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const foreignTenantId = 'tenant_foreign_99';
  const foreignCompanyId = 'comp_foreign_99';

  let headers: Record<string, string>;
  let foreignHeaders: Record<string, string>;

  const empId1 = 'emp_ms_audit_001';
  const empId2 = 'emp_ms_audit_002';
  const reviewerUserId = 'usr_ms_reviewer_001';
  const emp1UserId = 'usr_ms_emp1_001';
  const emp2UserId = 'usr_ms_emp2_002';

  const testMonth = '2026-09'; // 30 days in September 2026

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    foreignHeaders = await hrmsTestHeaders(foreignCompanyId, foreignTenantId);
    const db = getDb();

    // 1. Clean up fixtures from previous runs
    await db.delete(attendanceMonthlyAudits).where(inArray(attendanceMonthlyAudits.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlyReadinessEvaluations).where(inArray(attendanceMonthlyReadinessEvaluations.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlyReviews).where(inArray(attendanceMonthlyReviews.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlySummaries).where(inArray(attendanceMonthlySummaries.employeeId, [empId1, empId2]));
    await db.delete(employeeAttendance).where(inArray(employeeAttendance.employeeId, [empId1, empId2]));
    await db.delete(employeeLeaveRequests).where(inArray(employeeLeaveRequests.employeeId, [empId1, empId2]));
    await db.delete(attendanceOnDutyWorkdays).where(inArray(attendanceOnDutyWorkdays.employeeId, [empId1, empId2]));
    await db.delete(attendanceOnDutyRequests).where(inArray(attendanceOnDutyRequests.employeeId, [empId1, empId2]));
    await db.delete(attendanceRegularizations).where(inArray(attendanceRegularizations.employeeId, [empId1, empId2]));
    await db.delete(attendanceExceptions).where(inArray(attendanceExceptions.employeeId, [empId1, empId2]));
    await db.delete(employeeNotifications).where(inArray(employeeNotifications.employeeId, [empId1, empId2]));
    await db.delete(employeeWorkSchedules).where(inArray(employeeWorkSchedules.employeeId, [empId1, empId2]));
    await db.delete(employees).where(inArray(employees.id, [empId1, empId2]));
    await db.delete(users).where(inArray(users.id, [reviewerUserId, emp1UserId, emp2UserId]));

    // 2. Ensure test users exist
    const pwd = hashPassword('TestSecret#123');
    await db
      .insert(users)
      .values([
        {
          id: reviewerUserId,
          email: 'reviewer.ms.audit@example.com',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Siddharth',
          lastName: 'Director',
          status: 'active',
        },
        {
          id: emp1UserId,
          email: 'priya.ms.audit@example.com',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Priya',
          lastName: 'Architect',
          status: 'active',
        },
        {
          id: emp2UserId,
          email: 'rajesh.ms.audit@example.com',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Rajesh',
          lastName: 'Developer',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 3. Ensure test employees exist
    await db
      .insert(employees)
      .values([
        {
          id: empId1,
          tenantId,
          companyId,
          userId: emp1UserId,
          employeeNumber: 'EMP-MS-001',
          firstName: 'Priya',
          lastName: 'Architect',
          email: 'priya.ms.audit@example.com',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        },
        {
          id: empId2,
          tenantId,
          companyId,
          userId: emp2UserId,
          employeeNumber: 'EMP-MS-002',
          firstName: 'Rajesh',
          lastName: 'Developer',
          email: 'rajesh.ms.audit@example.com',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        },
      ])
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // 4. Assign Work Schedule (Mon-Fri 9-6)
    await db
      .insert(employeeWorkSchedules)
      .values([
        {
          employeeId: empId1,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'Standard Shift',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
        },
        {
          employeeId: empId2,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'Standard Shift',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
        },
      ])
      .onDuplicateKeyUpdate({ set: { workSchedule: 'Standard Shift' } });
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(attendanceMonthlyAudits).where(inArray(attendanceMonthlyAudits.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlyReadinessEvaluations).where(inArray(attendanceMonthlyReadinessEvaluations.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlyReviews).where(inArray(attendanceMonthlyReviews.companyId, [companyId, foreignCompanyId]));
    await db.delete(attendanceMonthlySummaries).where(inArray(attendanceMonthlySummaries.employeeId, [empId1, empId2]));
    await db.delete(employeeAttendance).where(inArray(employeeAttendance.employeeId, [empId1, empId2]));
    await db.delete(employeeLeaveRequests).where(inArray(employeeLeaveRequests.employeeId, [empId1, empId2]));
    await db.delete(attendanceOnDutyWorkdays).where(inArray(attendanceOnDutyWorkdays.employeeId, [empId1, empId2]));
    await db.delete(attendanceOnDutyRequests).where(inArray(attendanceOnDutyRequests.employeeId, [empId1, empId2]));
    await db.delete(attendanceRegularizations).where(inArray(attendanceRegularizations.employeeId, [empId1, empId2]));
    await db.delete(attendanceExceptions).where(inArray(attendanceExceptions.employeeId, [empId1, empId2]));
    await db.delete(employeeNotifications).where(inArray(employeeNotifications.employeeId, [empId1, empId2]));
    await db.delete(employeeWorkSchedules).where(inArray(employeeWorkSchedules.employeeId, [empId1, empId2]));
    await db.delete(employees).where(inArray(employees.id, [empId1, empId2]));
    await db.delete(users).where(inArray(users.id, [reviewerUserId, emp1UserId, emp2UserId]));
  });

  it('Check 1: Database Migration 0038 tables exist in bezent_dev', async () => {
    const db = getDb();
    const [rows] = (await db.execute(
      "SHOW TABLES LIKE 'attendance_monthly_%'",
    )) as unknown as [Array<Record<string, unknown>>, unknown];
    const tableNames = rows.map((r: Record<string, unknown>) => Object.values(r)[0]);

    expect(tableNames).toContain('attendance_monthly_summaries');
    expect(tableNames).toContain('attendance_monthly_reviews');
    expect(tableNames).toContain('attendance_monthly_readiness_evaluations');
    expect(tableNames).toContain('attendance_monthly_audits');
  });

  it('Check 2: Generates real persisted Monthly Summary from authoritative Daily Log', async () => {
    const db = getDb();

    // Seed authoritative attendance for Priya on 2026-09-01 (Tuesday) - Full day present (480 mins)
    await db.insert(employeeAttendance).values({
      id: 'att_real_01',
      tenantId,
      companyId,
      employeeId: empId1,
      date: '2026-09-01',
      checkInTime: '09:00:00',
      checkOutTime: '18:00:00',
      workedMinutes: 480,
      status: 'present',
      lateMinutes: 0,
      earlyMinutes: 0,
      processingState: 'finalized',
    });

    // Seed half-day present (240 mins) + half-day approved leave on 2026-09-02 (Wednesday)
    await db.insert(employeeAttendance).values({
      id: 'att_real_02',
      tenantId,
      companyId,
      employeeId: empId1,
      date: '2026-09-02',
      checkInTime: '09:00:00',
      checkOutTime: '13:00:00',
      workedMinutes: 240,
      status: 'half_day',
      lateMinutes: 0,
      earlyMinutes: 0,
      processingState: 'finalized',
    });

    await db.insert(employeeLeaveRequests).values({
      id: 'leave_real_01',
      tenantId,
      companyId,
      employeeId: empId1,
      leaveType: 'casual',
      startDate: '2026-09-02',
      endDate: '2026-09-02',
      totalDays: 1,
      status: 'approved',
      reason: 'Personal errand',
    });

    // Request recalculation via API
    const res = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary?month=${testMonth}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.counters).toBeDefined();
    expect(res.body.data.counters.totalEmployees).toBeGreaterThanOrEqual(2);

    // Locate Priya's summary
    const priyaSummary = res.body.data.items.find((s: { employeeId: string; month: string; scheduledDays: number; weeklyOffDays: number; presentDays: string | number; leaveDays: string | number; actualWorkedHours: number }) => s.employeeId === empId1);
    expect(priyaSummary).toBeDefined();
    expect(priyaSummary.month).toBe(testMonth);
    // Scheduled days: September 2026 has 22 weekdays
    expect(priyaSummary.scheduledDays).toBe(22);
    expect(priyaSummary.weeklyOffDays).toBe(8);

    // Invariant: 0.5 office + 0.5 leave = 1.0 day equivalent, never 1.5 or 2.0
    // Total present: 1.0 (day 1) + 0.5 (day 2) = 1.5
    expect(Number(priyaSummary.presentDays)).toBe(1.5);
    expect(Number(priyaSummary.leaveDays)).toBe(0.5);
    expect(priyaSummary.actualWorkedHours).toBe(12.0); // 480 + 240 = 720 mins = 12.0 hrs
  });

  it('Check 3: Review Transitions & Version-Bound Sign-off', async () => {
    // 1. Get current summary
    const listRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary?month=${testMonth}`)
      .set(headers);
    const summary = listRes.body.data.items.find((s: { id: string; employeeId: string; version: number }) => s.employeeId === empId1);
    expect(summary).toBeDefined();

    // 2. Assign reviewer
    const assignRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/assign`)
      .set(headers)
      .send({ reviewerId: reviewerUserId });
    expect(assignRes.status).toBe(200);

    // 3. Start review
    const startRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/start-review`)
      .set(headers);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.reviewState).toBe('in_review');

    // 4. Request correction
    const correctRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/request-correction`)
      .set(headers)
      .send({ notes: 'Please verify September 2nd afternoon leave classification' });
    expect(correctRes.status).toBe(200);
    expect(correctRes.body.data.reviewState).toBe('needs_correction');

    // 5. Mark reviewed (version-aware sign-off)
    const signOffRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/mark-reviewed`)
      .set(headers)
      .send({ notes: 'Verified and approved' });
    expect(signOffRes.status).toBe(200);
    expect(signOffRes.body.data.reviewState).toBe('reviewed');
    expect(signOffRes.body.data.reviewedVersion).toBe(summary.version);

    // 6. Reopen review with justification
    const reopenRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/reopen`)
      .set(headers)
      .send({ reason: 'Reopened for post-cutoff salary reconciliation' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.reviewState).toBe('reopened');

    // Verify audit trail in DB
    const historyRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/history`)
      .set(headers);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('Check 4: Payroll Readiness Evaluator & Blocking Exception Handling', async () => {
    const db = getDb();
    const listRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary?month=${testMonth}`)
      .set(headers);
    const summary = listRes.body.data.items.find((s: { id: string; employeeId: string; version: number }) => s.employeeId === empId1);

    // 1. Check readiness report
    const readinessRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/readiness`)
      .set(headers);
    expect(readinessRes.status).toBe(200);
    expect(readinessRes.body.data.passedChecks).toBeDefined();

    // 2. Introduce an unresolved blocking missing-punch exception
    await db.insert(attendanceExceptions).values({
      id: 'exc_real_01',
      tenantId,
      companyId,
      employeeId: empId1,
      workday: '2026-09-03',
      exceptionType: 'missing_out',
      severity: 'high',
      source: 'web',
      sourceRecordType: 'punch',
      sourceRecordId: 'punch_mock_01',
      title: 'Missing check-out punch',
      status: 'open',
    });

    // Recalculate summary
    const recalcRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/recalculate`)
      .set(headers);
    expect(recalcRes.status).toBe(200);

    // Check readiness: must now have blocking check and readiness set to blocked
    const blockedReadinessRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/readiness`)
      .set(headers);
    expect(blockedReadinessRes.status).toBe(200);
    expect(blockedReadinessRes.body.data.readinessStatus).toBe('blocked');
    expect(blockedReadinessRes.body.data.blockingChecks.length).toBeGreaterThanOrEqual(1);

    // 3. Resolve exception
    await db.delete(attendanceExceptions).where(inArray(attendanceExceptions.id, ['exc_real_01']));
    const clearedRecalcRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/recalculate`)
      .set(headers);
    expect(clearedRecalcRes.status).toBe(200);
  });

  it('Check 5: Strict Tenant Isolation across queries and actions', async () => {
    // Attempt to access tenant_demo_01 summary with foreignTenantId headers
    const listRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary?month=${testMonth}`)
      .set(headers);
    const summary = listRes.body.data.items.find((s: { id: string; employeeId: string; version: number }) => s.employeeId === empId1);

    // Requesting summary with foreign company headers must return 404
    const foreignRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary/${summary.id}`)
      .set(foreignHeaders);
    expect(foreignRes.status).toBe(404);

    // Starting review with foreign headers must return 404
    const foreignActionRes = await request(app)
      .post(`/api/v1/hrms/attendance/monthly-summary/${summary.id}/start-review`)
      .set(foreignHeaders);
    expect(foreignActionRes.status).toBe(404);
  });

  it('Check 6: Controlled Bulk Operations with Safe Partial Execution', async () => {
    const listRes = await request(app)
      .get(`/api/v1/hrms/attendance/monthly-summary?month=${testMonth}`)
      .set(headers);
    const summaryIds = listRes.body.data.items.map((s: { id: string }) => s.id);

    // Bulk preview
    const previewRes = await request(app)
      .post('/api/v1/hrms/attendance/monthly-summary/bulk-preview')
      .set(headers)
      .send({ action: 'start_review', summaryIds });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.totalSelected).toBe(summaryIds.length);

    // Bulk execute
    const executeRes = await request(app)
      .post('/api/v1/hrms/attendance/monthly-summary/bulk')
      .set(headers)
      .send({ action: 'start_review', summaryIds });

    expect(executeRes.status).toBe(200);
    expect(executeRes.body.data.succeeded.length).toBeGreaterThan(0);
  });

  it('Check 7: Valid PDF Export with application/pdf MIME type', async () => {
    // 1. Request PDF export
    const pdfRes = await request(app)
      .post('/api/v1/hrms/attendance/monthly-summary/export')
      .set(headers)
      .send({ month: testMonth, format: 'pdf', level: 'standard' });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.headers['content-disposition']).toMatch(/\.pdf"/);

    // Verify binary PDF-1.4 structure
    const binaryBuffer = Buffer.from(pdfRes.body);
    const pdfText = binaryBuffer.toString('utf-8');
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfText).toContain('%%EOF');
    expect(pdfText).toContain('/Type /Catalog');
    expect(pdfText).toContain('BEZENT HRMS');
    expect(pdfText).toContain('Priya');

    // 2. Request CSV export
    const csvRes = await request(app)
      .post('/api/v1/hrms/attendance/monthly-summary/export')
      .set(headers)
      .send({ month: testMonth, format: 'csv', level: 'standard' });

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.headers['content-disposition']).toMatch(/\.csv"/);
  });
});
