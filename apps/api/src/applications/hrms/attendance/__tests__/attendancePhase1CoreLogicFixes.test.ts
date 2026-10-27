import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
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
import { attendanceRepository } from '../repository/attendance.repository.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Phase 1 Core Attendance Logic & Data Accuracy Regression Suite',
  () => {
    const tenantId = 'tenant_phase1_audit';
    const companyId = 'comp_phase1_audit';
    const otherCompanyId = 'comp_phase1_other';

    const dept1 = generateSurrogateId('dept');

    const emp1 = generateSurrogateId('emp'); // Full day present
    const emp2 = generateSurrogateId('emp'); // Half day present
    const emp3 = generateSurrogateId('emp'); // Approved On-Duty
    const emp4 = generateSurrogateId('emp'); // Approved Leave
    const emp5 = generateSurrogateId('emp'); // Unrecorded on today / pending check-in

    const todayStr = new Date().toISOString().slice(0, 10);
    const pastDateStr = '2026-10-01';

    let headers: Record<string, string>;

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      await hrmsTestHeaders(otherCompanyId, tenantId);
      const db = getDb();

      // Clean up
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

      // 1. Seed Department
      await db
        .insert(departments)
        .values([{ id: dept1, tenantId, companyId, name: 'Core Product', code: 'CP' }]);

      // 2. Seed 5 Active Employees
      const baseEmp = {
        tenantId,
        companyId,
        departmentId: dept1,
        employmentStatus: 'active' as const,
        joiningDate: '2026-01-01',
        lastWorkingDate: null,
      };

      await db.insert(employees).values([
        {
          ...baseEmp,
          id: emp1,
          employeeNumber: 'P1-001',
          firstName: 'Alice',
          email: 'alice.p1@bezent.test',
        },
        {
          ...baseEmp,
          id: emp2,
          employeeNumber: 'P1-002',
          firstName: 'Bob',
          email: 'bob.p1@bezent.test',
        },
        {
          ...baseEmp,
          id: emp3,
          employeeNumber: 'P1-003',
          firstName: 'Charlie',
          email: 'charlie.p1@bezent.test',
        },
        {
          ...baseEmp,
          id: emp4,
          employeeNumber: 'P1-004',
          firstName: 'Diana',
          email: 'diana.p1@bezent.test',
        },
        {
          ...baseEmp,
          id: emp5,
          employeeNumber: 'P1-005',
          firstName: 'Evan',
          email: 'evan.p1@bezent.test',
        },
      ]);

      // 3. Seed Attendance Records for today
      await db.insert(employeeAttendance).values([
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: emp1,
          date: todayStr,
          checkInTime: '09:02:00',
          checkOutTime: '18:05:00',
          workedMinutes: 540,
          status: 'present',
          processingState: 'provisional',
        },
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: emp2,
          date: todayStr,
          checkInTime: '09:15:00',
          checkOutTime: '13:15:00',
          workedMinutes: 240,
          status: 'half_day',
          processingState: 'provisional',
        },
      ]);

      // 4. Seed Approved On-Duty for emp3
      await db.insert(attendanceOnDutyRequests).values({
        id: generateSurrogateId('od'),
        requestNumber: 'OD-P1-001',
        tenantId,
        companyId,
        employeeId: emp3,
        odTypeId: 'field_visit',
        odTypeName: 'Field Visit',
        startDate: todayStr,
        endDate: todayStr,
        durationType: 'full_day',
        status: 'approved',
        reason: 'Client deployment',
      });

      // 5. Seed Approved Leave for emp4
      await db.insert(employeeLeaveRequests).values({
        id: generateSurrogateId('leave'),
        tenantId,
        companyId,
        employeeId: emp4,
        leaveType: 'annual',
        startDate: todayStr,
        endDate: todayStr,
        totalDays: 1,
        reason: 'Annual Leave',
        status: 'approved',
      });

      // Note: emp5 has NO record, NO leave, NO on-duty on todayStr (represents the unrecorded active workforce)

      // 6. Seed Historical Exception from 2026-10-01 (should NOT make today's health critical!)
      await db.insert(attendanceExceptions).values({
        id: generateSurrogateId('exc'),
        tenantId,
        companyId,
        employeeId: emp1,
        workday: pastDateStr,
        exceptionType: 'missing_out',
        severity: 'critical',
        status: 'open',
        sourceRecordType: 'punch_log',
        sourceRecordId: 'punch_dummy_001',
        title: 'Missing Out Punch for Workday',
      });
    });

    /* ───────────────────────────────────────────────────────────────────
     * FIX 1: PENDING PROCESSING & DAILY LOG MISMATCH
     * ─────────────────────────────────────────────────────────────────── */
    it('Fix 1: classifies unrecorded employees on active workday as not_checked_in and provisional, matching Overview pending count', async () => {
      // 1. Overview KPIs
      const kpis = await attendanceOverviewService.getTodayKpis(tenantId, companyId, todayStr);
      expect(kpis.totalEligibleEmployees).toBe(5);
      expect(kpis.pendingProcessingCount).toBe(1); // emp5
      expect(kpis.absentCount).toBe(0.5); // emp2 half day absence; unrecorded emp5 is provisional/pending, NOT absent!

      // 2. Daily Log Query
      const dailyLog = await attendanceRepository.getDailyAttendanceLog(tenantId, companyId, {
        date: todayStr,
      });

      expect(dailyLog.counters.scheduled).toBe(5);
      expect(dailyLog.counters.pendingReview).toBe(3); // emp1 (provisional), emp2 (provisional), emp5 (provisional not_checked_in)
      expect(dailyLog.counters.absent).toBe(0); // Absent counter must be 0 for today

      // Find Evan (emp5)
      const evanItem = dailyLog.items.find((item) => item.employeeId === emp5);
      expect(evanItem).toBeDefined();
      expect(evanItem?.status).toBe('not_checked_in');
      expect(evanItem?.processingState).toBe('provisional');
      expect(evanItem?.indicators).toContain('not_checked_in');

      // Filter by processingState=pending_processing or status=pending_review
      const filteredPending = await attendanceRepository.getDailyAttendanceLog(
        tenantId,
        companyId,
        {
          date: todayStr,
          status: 'pending_review',
        },
      );
      expect(filteredPending.items.length).toBeGreaterThanOrEqual(1);
      expect(filteredPending.items.some((d) => d.employeeId === emp5)).toBe(true);
    });

    it('Fix 1: classifies unrecorded employees on past workdays as finalized absent', async () => {
      const pastLog = await attendanceRepository.getDailyAttendanceLog(tenantId, companyId, {
        date: pastDateStr,
      });
      // On past date with no punch/leave/OD, all active employees default to finalized absent
      const pastEvan = pastLog.items.find((item) => item.employeeId === emp5);
      expect(pastEvan).toBeDefined();
      expect(pastEvan?.status).toBe('absent');
      expect(pastEvan?.processingState).toBe('finalized');
    });

    /* ───────────────────────────────────────────────────────────────────
     * FIX 2: PROCESSING HEALTH STATUS
     * ─────────────────────────────────────────────────────────────────── */
    it('Fix 2: active workday without reconciliation does not trigger false 0% CRITICAL status', async () => {
      const health = await attendanceOverviewService.getProcessingHealth(
        tenantId,
        companyId,
        todayStr,
      );

      // Active workday has not failed - finalization is pending shift cutoff
      expect(health.status).toBe('in_progress');
      expect(health.operationalStage).toBe('in_progress');
      expect(health.processingSuccessRate).toBeNull(); // Must not be 0% failure
      expect(health.denominatorDescription).toContain(
        'reconciliation scheduled after shift cutoff',
      );
      // Historical blocking exception from 2026-10-01 must not turn today's health critical
      expect(health.unresolvedBlockingExceptions).toBe(0); // Date-scoped to today
      expect(health.cumulativeBlockingExceptions).toBeGreaterThanOrEqual(1); // Historical cumulative tracked separately
    });

    /* ───────────────────────────────────────────────────────────────────
     * FIX 3: PRESENT HEADCOUNT VS ATTENDANCE DAY EQUIVALENTS
     * ─────────────────────────────────────────────────────────────────── */
    it('Fix 3: separates integer presentHeadcount from weighted presentEquivalentDays', async () => {
      const kpis = await attendanceOverviewService.getTodayKpis(tenantId, companyId, todayStr);

      // emp1 (full day) = 1.0, emp2 (half day) = 0.5, emp3 (OD full) = 1.0
      // Total headcount = 3 distinct persons
      // Total day equivalents = 2.5 FTE
      expect(kpis.presentHeadcount).toBe(3);
      expect(kpis.presentCount).toBe(2.5);
      expect(kpis.presentEquivalentDays).toBe(2.5);
      expect(kpis.halfDayCount).toBe(1);

      // Verify Trends
      const trends = await attendanceOverviewService.getTrends(tenantId, companyId, {
        date: todayStr,
        trendRange: '7d',
      });
      const todayTrend = trends.items.find((item) => item.date === todayStr);
      expect(todayTrend).toBeDefined();
      expect(todayTrend?.presentHeadcount).toBe(3);
      expect(todayTrend?.presentEquivalentDays).toBe(2.5);

      // Verify Department Comparison
      const depts = await attendanceOverviewService.getDepartmentComparison(
        tenantId,
        companyId,
        todayStr,
      );
      const cpDept = depts.find((d) => d.departmentId === dept1);
      expect(cpDept).toBeDefined();
      expect(cpDept?.presentHeadcount).toBe(3);
      expect(cpDept?.presentEquivalents).toBe(2.5);
    });

    /* ───────────────────────────────────────────────────────────────────
     * FIX 4: ACTION QUEUE FILTER CONSISTENCY & FULL POPULATION
     * ─────────────────────────────────────────────────────────────────── */
    it('Fix 4: unresolved exceptions queue links to status=active and datePreset=all matching full backlog', async () => {
      // 1. Query exceptions with status=active (returns all unresolved cases across all dates)
      const result = await attendanceRepository.getExceptions(tenantId, companyId, {
        status: 'active',
      });

      // 2. Query action queue
      const queue = await attendanceOverviewService.getActionQueue(tenantId, companyId);
      const excItem = queue.find((q) => q.actionType === 'unresolved_exceptions');

      expect(excItem).toBeDefined();
      expect(excItem?.filterParams.status).toBe('active');
      expect(excItem?.filterParams.datePreset).toBe('all');
      expect(result.items.length).toBe(excItem?.authorizedPendingCount);
    });

    /* ───────────────────────────────────────────────────────────────────
     * PHASE 1.5: THREE SEPARATE PROCESSING HEALTH METRICS & SCHEDULE INTEGRITY
     * ─────────────────────────────────────────────────────────────────── */
    it('Phase 1.5: distinguishes Metric A (Success Rate), Metric B (Reconciliation Rate), and Metric C (Operational Health)', async () => {
      const health = await attendanceOverviewService.getProcessingHealth(
        tenantId,
        companyId,
        todayStr,
      );

      // Metric A: Processing Success Rate (null when 0 attempts)
      expect(health.attemptedWorkdays).toBe(0);
      expect(health.processingSuccessRate).toBeNull();

      // Metric B: Reconciliation Completion Rate (0% when 0 finalized out of 5 eligible)
      expect(health.eligibleWorkdays).toBe(5);
      expect(health.processedWorkdays).toBe(0);
      expect(health.pendingWorkdays).toBe(5);
      expect(health.reconciliationCompletionRate).toBe(0);

      // Metric C: Operational Health (must be in_progress on active day before cutoff, never falsely healthy)
      expect(health.status).toBe('in_progress');
      expect(health.operationalStage).toBe('in_progress');

      // Schedule Integrity: Fallback schedule accounts for employees without explicit assignment
      expect(health.fallbackScheduleCount).toBe(5);
      expect(health.unresolvedScheduleCount).toBe(0);
      expect(health.missingScheduleCount).toBe(0);
    });

    it('Phase 1.5: filters daily attendance log correctly with processingState=pending_processing', async () => {
      const pendingLog = await attendanceRepository.getDailyAttendanceLog(tenantId, companyId, {
        date: todayStr,
        processingState: 'pending_processing',
      });

      // 3 employees are pending processing (emp1 provisional present, emp2 provisional half_day, emp5 unrecorded provisional)
      // emp3 (approved on-duty) and emp4 (approved leave) are already finalized
      expect(pendingLog.items.length).toBe(3);
      const pendingIds = pendingLog.items.map((i) => i.employeeId);
      expect(pendingIds).toContain(emp1);
      expect(pendingIds).toContain(emp2);
      expect(pendingIds).toContain(emp5);
      expect(pendingIds).not.toContain(emp3); // Approved On-Duty is finalized
      expect(pendingIds).not.toContain(emp4); // Approved Leave is finalized
      for (const item of pendingLog.items) {
        expect(['pending_processing', 'provisional', 'pending_review']).toContain(
          item.processingState,
        );
      }
    });

    /* ───────────────────────────────────────────────────────────────────
     * TENANT ISOLATION & RBAC INTEGRITY
     * ─────────────────────────────────────────────────────────────────── */
    it('strictly isolates attendance data between companies', async () => {
      const otherKpis = await attendanceOverviewService.getTodayKpis(
        tenantId,
        otherCompanyId,
        todayStr,
      );
      expect(otherKpis.totalEligibleEmployees).toBe(0);
      expect(otherKpis.presentHeadcount).toBe(0);
    });
  },
);
