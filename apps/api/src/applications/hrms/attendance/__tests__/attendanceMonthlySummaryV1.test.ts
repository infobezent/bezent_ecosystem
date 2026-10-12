import { describe, it, expect, beforeEach } from 'vitest';
import {
  AttendanceMonthlySummaryEngineService,
} from '../service/attendanceMonthlySummaryEngine.service.js';
import {
  AttendanceMonthlyReadinessService,
} from '../service/attendanceMonthlyReadiness.service.js';
import {
  AttendanceMonthlySummaryService,
} from '../service/attendanceMonthlySummary.service.js';
import type { AttendanceMonthlySummaryRepository } from '../repository/attendanceMonthlySummary.repository.js';
import type {
  AttendanceMonthlySummary,
  NewAttendanceMonthlySummary,
  AttendanceMonthlyReview,
  NewAttendanceMonthlyReview,
  AttendanceMonthlyAudit,
  NewAttendanceMonthlyAudit,
  EmployeeAttendance,
  EmployeeLeaveRequest,
  AttendanceOnDutyWorkdayRecord,
} from '../../../../db/schema.js';
import type { MonthlySummaryRow } from '../types/attendanceMonthlySummary.types.js';

describe('BEZENT HRMS — Attendance → Monthly Summary V1.0 Test Suite', () => {
  const tenantId = 'tenant_test_01';
  const companyId = 'comp_test_01';
  const employeeId = 'emp_test_01';
  const month = '2026-10'; // 31 days

  let mockRepo: Partial<AttendanceMonthlySummaryRepository>;
  let engine: AttendanceMonthlySummaryEngineService;
  let readinessService: AttendanceMonthlyReadinessService;
  let summaryService: AttendanceMonthlySummaryService;

  beforeEach(() => {
    // In-memory mock repository for fast, deterministic unit & domain tests
    const summariesMap = new Map<string, AttendanceMonthlySummary>();
    const reviewsList: AttendanceMonthlyReview[] = [];
    const auditsList: AttendanceMonthlyAudit[] = [];

    mockRepo = {
      getActiveEmployeesForMonth: async () => [
        {
          id: employeeId,
          employeeNumber: 'EMP-001',
          firstName: 'Alice',
          lastName: 'Smith',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          departmentId: 'dept_eng',
        },
      ],
      getDailySourcesForEmployeeMonth: async () => ({
        dailyRecords: [],
        odWorkdays: [],
        leaveRequests: [],
        regularizations: [],
        exceptions: [],
        schedule: {
          employeeId,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'General Shift (9AM - 6PM)',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
          updatedAt: new Date(),
        },
        periods: [],
      }),
      getSummaryByEmployeeMonth: async (_t, _c, empId, m) => {
        return summariesMap.get(`${empId}_${m}`) ?? null;
      },
      getSummaryById: async (_t, _c, id) => {
        const found = Array.from(summariesMap.values()).find((s) => s.id === id);
        if (!found) return null;
        return {
          ...found,
          employeeName: 'Alice Smith',
          employeeCode: 'EMP-001',
          departmentName: 'Engineering',
          presentDays: Number(found.presentDays),
          absentDays: Number(found.absentDays),
          leaveDays: Number(found.leaveDays),
          onDutyDays: Number(found.onDutyDays),
          actualWorkedHours: Math.round((found.actualWorkedMinutes / 60) * 10) / 10,
          policyCreditedHours: Math.round((found.policyCreditedMinutes / 60) * 10) / 10,
          lastCalculatedAt: found.lastCalculatedAt.toISOString(),
          createdAt: found.createdAt.toISOString(),
          updatedAt: found.updatedAt.toISOString(),
        } as unknown as MonthlySummaryRow;
      },
      upsertSummary: async (data: NewAttendanceMonthlySummary) => {
        const full: AttendanceMonthlySummary = {
          ...data,
          id: data.id ?? `att_ms_${Date.now()}`,
          assignedReviewerId: data.assignedReviewerId ?? null,
          assignedAt: (data.assignedAt as Date) ?? null,
          reviewedByUserId: data.reviewedByUserId ?? null,
          reviewedAt: (data.reviewedAt as Date) ?? null,
          reviewedVersion: data.reviewedVersion ?? null,
          reviewNotes: data.reviewNotes ?? null,
          correctionRequestNotes: data.correctionRequestNotes ?? null,
          reopenReason: data.reopenReason ?? null,
          periodLockId: data.periodLockId ?? null,
          lastCalculatedAt: (data.lastCalculatedAt as Date) ?? new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as AttendanceMonthlySummary;
        summariesMap.set(`${data.employeeId}_${data.month}`, full);
      },
      updateSummary: async (id: string, updates: Partial<NewAttendanceMonthlySummary>) => {
        for (const [key, val] of summariesMap.entries()) {
          if (val.id === id) {
            summariesMap.set(key, { ...val, ...updates, updatedAt: new Date() });
          }
        }
      },
      createReview: async (review: NewAttendanceMonthlyReview) => {
        reviewsList.push(review as unknown as AttendanceMonthlyReview);
      },
      getReviewHistory: async (summaryId: string) => {
        return reviewsList.filter((r) => r.monthlySummaryId === summaryId);
      },
      createReadinessEvaluation: async () => {},
      createAudit: async (audit: NewAttendanceMonthlyAudit) => {
        auditsList.push(audit as unknown as AttendanceMonthlyAudit);
      },
      getAuditHistory: async () => auditsList,
      sendNotification: async () => {},
    };

    engine = new AttendanceMonthlySummaryEngineService(mockRepo as AttendanceMonthlySummaryRepository);
    readinessService = new AttendanceMonthlyReadinessService(mockRepo as AttendanceMonthlySummaryRepository);
    summaryService = new AttendanceMonthlySummaryService(
      mockRepo as AttendanceMonthlySummaryRepository,
      engine,
      readinessService,
    );
  });

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 1: DETERMINISTIC CALCULATION ENGINE & BOUNDARIES
     ══════════════════════════════════════════════════════════════════════ */
  describe('Section 1: Deterministic Aggregation Engine', () => {
    it('accurately resolves scheduled days and weekly offs for the month', async () => {
      const result = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      // October 2026 has 31 days: 22 weekdays (scheduled) and 9 weekend days (weekly offs)
      expect(result.summaryData.scheduledDays).toBe(22);
      expect(result.summaryData.weeklyOffDays).toBe(9);
      expect(result.summaryData.scheduledMinutes).toBe(22 * 480);
      expect(result.dailyRecords.length).toBe(31);
    });

    it('enforces joiner boundary: days prior to joining date are never scheduled', async () => {
      // Employee joined mid-month on 2026-10-15
      mockRepo.getActiveEmployeesForMonth = async () => [
        {
          id: employeeId,
          employeeNumber: 'EMP-001',
          firstName: 'Alice',
          lastName: 'Smith',
          joiningDate: '2026-10-15',
          employmentStatus: 'active',
          departmentId: 'dept_eng',
        },
      ];

      const result = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      // Days 1..14 are excluded from scheduled workdays
      expect(result.dailyRecords.every((d) => d.date >= '2026-10-15')).toBe(true);
      expect(result.summaryData.scheduledDays).toBeLessThan(22);
    });

    it('preserves non-overlapping day equivalents for half-day present + half-day leave', async () => {
      // Date 2026-10-01 has 240 mins worked (half-day present) and approved leave covering 2026-10-01
      mockRepo.getDailySourcesForEmployeeMonth = async () => ({
        dailyRecords: [
          {
            id: 'att_01',
            tenantId,
            companyId,
            employeeId,
            date: '2026-10-01',
            checkInTime: '09:00:00',
            checkOutTime: '13:00:00',
            workedMinutes: 240,
            status: 'half_day',
            lateMinutes: 0,
            earlyMinutes: 0,
            isLocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as EmployeeAttendance,
        ],
        odWorkdays: [],
        leaveRequests: [
          {
            id: 'leave_01',
            tenantId,
            companyId,
            employeeId,
            leaveType: 'sick',
            startDate: '2026-10-01',
            endDate: '2026-10-01',
            totalDays: 1,
            reason: 'Doctor appointment',
            status: 'approved',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as EmployeeLeaveRequest,
        ],
        regularizations: [],
        exceptions: [],
        schedule: {
          employeeId,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'General Shift',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
          updatedAt: new Date(),
        },
        periods: [],
      });

      const result = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      const dayRecord = result.dailyRecords.find((d) => d.date === '2026-10-01');

      expect(dayRecord).toBeDefined();
      expect(dayRecord?.classification).toBe('half_day');
      // Invariant: Present + Leave must equal 1.0 day equivalent, never 1.5 or 2.0
      expect(Number(result.summaryData.presentDays)).toBe(0.5);
      expect(Number(result.summaryData.leaveDays)).toBe(0.5);
    });

    it('preserves non-overlapping day equivalents for half-day present + half-day On-Duty', async () => {
      // Date 2026-10-02 has 240 mins worked in office and approved half-day OD
      mockRepo.getDailySourcesForEmployeeMonth = async () => ({
        dailyRecords: [
          {
            id: 'att_02',
            tenantId,
            companyId,
            employeeId,
            date: '2026-10-02',
            checkInTime: '09:00:00',
            checkOutTime: '13:00:00',
            workedMinutes: 240,
            status: 'half_day',
            lateMinutes: 0,
            earlyMinutes: 0,
            isLocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as EmployeeAttendance,
        ],
        odWorkdays: [
          {
            id: 'od_wd_02',
            tenantId,
            companyId,
            onDutyRequestId: 'od_req_02',
            employeeId,
            workday: '2026-10-02',
            durationType: 'half_day',
            creditedStatus: 'present',
            creditedWorkedMinutes: 240,
            processingStatus: 'applied',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as AttendanceOnDutyWorkdayRecord,
        ],
        leaveRequests: [],
        regularizations: [],
        exceptions: [],
        schedule: {
          employeeId,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'General Shift',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
          updatedAt: new Date(),
        },
        periods: [],
      });

      const result = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      const dayRecord = result.dailyRecords.find((d) => d.date === '2026-10-02');

      expect(dayRecord).toBeDefined();
      expect(dayRecord?.classification).toBe('present');
      // Invariant: Present credit is 1.0 (0.5 office + 0.5 OD credit), OD is 0.5
      expect(Number(result.summaryData.presentDays)).toBe(1.0);
      expect(Number(result.summaryData.onDutyDays)).toBe(0.5);
      // Invariant: Actual punch-derived worked minutes is 240, policy-credited minutes is 480
      expect(result.summaryData.actualWorkedMinutes).toBe(240);
      expect(result.summaryData.policyCreditedMinutes).toBe(480);
    });

    it('generates deterministic SHA256 source fingerprint and supports idempotent recalculation', async () => {
      const res1 = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      const res2 = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);

      expect(res1.summaryData.sourceFingerprint).toBeDefined();
      expect(res1.summaryData.sourceFingerprint!.length).toBe(64);
      expect(res1.summaryData.sourceFingerprint).toBe(res2.summaryData.sourceFingerprint);
      expect(res2.isStaleReview).toBe(false);
    });

    it('detects stale review sign-off when underlying daily attendance changes', async () => {
      // Step 1: Initial calculation
      const initial = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      await mockRepo.upsertSummary!(initial.summaryData);

      // Step 2: Review signed off at version 1
      await mockRepo.updateSummary!(initial.summaryData.id, {
        reviewState: 'reviewed',
        reviewedVersion: 1,
        reviewedByUserId: 'usr_hr_01',
        reviewedAt: new Date(),
      });

      // Step 3: Source data changes (a late punch is added)
      mockRepo.getDailySourcesForEmployeeMonth = async () => ({
        dailyRecords: [
          {
            id: 'att_mod_01',
            tenantId,
            companyId,
            employeeId,
            date: '2026-10-05',
            checkInTime: '09:45:00',
            checkOutTime: '18:00:00',
            workedMinutes: 495,
            status: 'present',
            lateMinutes: 45,
            earlyMinutes: 0,
            isLocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as EmployeeAttendance,
        ],
        odWorkdays: [],
        leaveRequests: [],
        regularizations: [],
        exceptions: [],
        schedule: {
          employeeId,
          tenantId,
          companyId,
          workingCalendar: 'general',
          workSchedule: 'General Shift',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'UTC',
          updatedAt: new Date(),
        },
        periods: [],
      });

      // Step 4: Recalculate
      const recalc = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);

      // Invariant: Version increments, review invalidated to 'reopened'
      expect(recalc.isStaleReview).toBe(true);
      expect(recalc.summaryData.version).toBe(2);
      expect(recalc.summaryData.reviewState).toBe('reopened');
      expect(recalc.summaryData.reopenReason).toContain('Summary invalidated due to daily attendance source updates');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 2: 10-POINT PAYROLL READINESS ENGINE
     ══════════════════════════════════════════════════════════════════════ */
  describe('Section 2: 10-Point Payroll Readiness Evaluator', () => {
    it('marks readiness BLOCKED when unresolved exceptions exist', () => {
      const summary: AttendanceMonthlySummary = {
        id: 'sum_01',
        tenantId,
        companyId,
        employeeId,
        month,
        timezone: 'UTC',
        scheduledDays: 22,
        scheduledMinutes: 22 * 480,
        presentDays: '22.00',
        absentDays: '0.00',
        leaveDays: '0.00',
        onDutyDays: '0.00',
        weeklyOffDays: 9,
        holidayDays: 0,
        actualWorkedMinutes: 22 * 480,
        policyCreditedMinutes: 22 * 480,
        lateOccurrences: 0,
        lateMinutes: 0,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 2, // 2 unresolved exceptions
        pendingCorrections: 0,
        processingIssues: 0,
        calculationState: 'calculated',
        reviewState: 'reviewed',
        payrollReadiness: 'needs_review',
        isLocked: false,
        periodLockId: null,
        version: 1,
        sourceFingerprint: 'abc',
        assignedReviewerId: null,
        assignedAt: null,
        reviewedByUserId: 'usr_01',
        reviewedAt: new Date(),
        reviewedVersion: 1,
        reviewNotes: 'Good',
        correctionRequestNotes: null,
        reopenReason: null,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = readinessService.evaluateReadiness(summary, []);
      expect(result.readinessStatus).toBe('blocked');
      expect(result.blockingChecks.some((b) => b.code === 'UNRESOLVED_EXCEPTIONS')).toBe(true);
    });

    it('marks readiness BLOCKED when pending regularizations exist', () => {
      const summary: AttendanceMonthlySummary = {
        id: 'sum_02',
        tenantId,
        companyId,
        employeeId,
        month,
        timezone: 'UTC',
        scheduledDays: 22,
        scheduledMinutes: 22 * 480,
        presentDays: '22.00',
        absentDays: '0.00',
        leaveDays: '0.00',
        onDutyDays: '0.00',
        weeklyOffDays: 9,
        holidayDays: 0,
        actualWorkedMinutes: 22 * 480,
        policyCreditedMinutes: 22 * 480,
        lateOccurrences: 0,
        lateMinutes: 0,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 0,
        pendingCorrections: 1, // Pending regularization
        processingIssues: 0,
        calculationState: 'calculated',
        reviewState: 'reviewed',
        payrollReadiness: 'needs_review',
        isLocked: false,
        periodLockId: null,
        version: 1,
        sourceFingerprint: 'abc',
        assignedReviewerId: null,
        assignedAt: null,
        reviewedByUserId: 'usr_01',
        reviewedAt: new Date(),
        reviewedVersion: 1,
        reviewNotes: 'Good',
        correctionRequestNotes: null,
        reopenReason: null,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = readinessService.evaluateReadiness(summary, []);
      expect(result.readinessStatus).toBe('blocked');
      expect(result.blockingChecks.some((b) => b.code === 'PENDING_REGULARIZATIONS')).toBe(true);
    });

    it('marks readiness NEEDS_REVIEW when review is pending or not yet signed off', () => {
      const summary: AttendanceMonthlySummary = {
        id: 'sum_03',
        tenantId,
        companyId,
        employeeId,
        month,
        timezone: 'UTC',
        scheduledDays: 22,
        scheduledMinutes: 22 * 480,
        presentDays: '22.00',
        absentDays: '0.00',
        leaveDays: '0.00',
        onDutyDays: '0.00',
        weeklyOffDays: 9,
        holidayDays: 0,
        actualWorkedMinutes: 22 * 480,
        policyCreditedMinutes: 22 * 480,
        lateOccurrences: 0,
        lateMinutes: 0,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 0,
        pendingCorrections: 0,
        processingIssues: 0,
        calculationState: 'calculated',
        reviewState: 'not_reviewed', // Not reviewed
        payrollReadiness: 'needs_review',
        isLocked: false,
        periodLockId: null,
        version: 1,
        sourceFingerprint: 'abc',
        assignedReviewerId: null,
        assignedAt: null,
        reviewedByUserId: null,
        reviewedAt: null,
        reviewedVersion: null,
        reviewNotes: null,
        correctionRequestNotes: null,
        reopenReason: null,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = readinessService.evaluateReadiness(summary, []);
      expect(result.readinessStatus).toBe('needs_review');
      expect(result.warningChecks.some((w) => w.code === 'REVIEW_PENDING')).toBe(true);
    });

    it('marks readiness READY when all 10 checks pass and review signed off against current version', () => {
      const summary: AttendanceMonthlySummary = {
        id: 'sum_04',
        tenantId,
        companyId,
        employeeId,
        month,
        timezone: 'UTC',
        scheduledDays: 22,
        scheduledMinutes: 22 * 480,
        presentDays: '22.00',
        absentDays: '0.00',
        leaveDays: '0.00',
        onDutyDays: '0.00',
        weeklyOffDays: 9,
        holidayDays: 0,
        actualWorkedMinutes: 22 * 480,
        policyCreditedMinutes: 22 * 480,
        lateOccurrences: 0,
        lateMinutes: 0,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 0,
        pendingCorrections: 0,
        processingIssues: 0,
        calculationState: 'calculated',
        reviewState: 'reviewed',
        payrollReadiness: 'ready',
        isLocked: true,
        periodLockId: 'PRD_LOCK_01',
        version: 1,
        sourceFingerprint: 'abc',
        assignedReviewerId: 'usr_rev_01',
        assignedAt: new Date(),
        reviewedByUserId: 'usr_rev_01',
        reviewedAt: new Date(),
        reviewedVersion: 1, // matches current version
        reviewNotes: 'Signed off',
        correctionRequestNotes: null,
        reopenReason: null,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = readinessService.evaluateReadiness(summary, []);
      expect(result.readinessStatus).toBe('ready');
      expect(result.blockingChecks.length).toBe(0);
      expect(result.passedChecks.some((p) => p.code === 'REVIEW_COMPLETED')).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     SECTION 3: WORKSPACE OPERATIONS, REVIEW TRANSITIONS & BULK ACTIONS
     ══════════════════════════════════════════════════════════════════════ */
  describe('Section 3: Workspace Operations & Controlled Bulk Actions', () => {
    it('prevents self-review (employee cannot sign off their own monthly summary)', async () => {
      const initial = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      await mockRepo.upsertSummary!(initial.summaryData);

      // Attempt self-review where actorUserId === summary.employeeId
      await expect(
        summaryService.markReviewed(
          tenantId,
          companyId,
          initial.summaryData.id,
          'Self approving',
          employeeId,
        ),
      ).rejects.toThrow(/Self-review is prohibited/);
    });

    it('successfully transitions review: Start Review -> Request Correction -> Reopen', async () => {
      const initial = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      await mockRepo.upsertSummary!(initial.summaryData);

      // 1. Start review
      const started = await summaryService.startReview(
        tenantId,
        companyId,
        initial.summaryData.id,
        'usr_manager_01',
      );
      expect(started.reviewState).toBe('in_review');

      // 2. Request correction
      const corrected = await summaryService.requestCorrection(
        tenantId,
        companyId,
        initial.summaryData.id,
        'Missing punch on 10th needs regularization',
        'usr_manager_01',
      );
      expect(corrected.reviewState).toBe('needs_correction');
      expect(corrected.correctionRequestNotes).toBe('Missing punch on 10th needs regularization');

      // 3. Mark reviewed
      const reviewed = await summaryService.markReviewed(
        tenantId,
        companyId,
        initial.summaryData.id,
        'Regularization verified',
        'usr_manager_01',
      );
      expect(reviewed.reviewState).toBe('reviewed');
      expect(reviewed.reviewedVersion).toBe(1);

      // 4. Reopen review
      const reopened = await summaryService.reopenReview(
        tenantId,
        companyId,
        initial.summaryData.id,
        'Manager audit adjustment needed',
        'usr_manager_01',
      );
      expect(reopened.reviewState).toBe('reopened');
      expect(reopened.reopenReason).toBe('Manager audit adjustment needed');
    });

    it('executes controlled bulk actions with safe partial results', async () => {
      const initial = await engine.calculateEmployeeMonth(tenantId, companyId, employeeId, month);
      await mockRepo.upsertSummary!(initial.summaryData);

      // Bulk execute with valid record and non-existent record
      const result = await summaryService.bulkExecute(
        tenantId,
        companyId,
        {
          action: 'start_review',
          summaryIds: [initial.summaryData.id, 'sum_non_existent'],
        },
        'usr_admin_01',
      );

      expect(result.succeeded).toContain(initial.summaryData.id);
      expect(result.skipped.some((s) => s.id === 'sum_non_existent')).toBe(true);
    });

    it('sanitizes export data against formula injection attacks', async () => {
      mockRepo.listSummaries = async () => ({
        items: [
          {
            id: 'sum_inj_01',
            tenantId,
            companyId,
            employeeId,
            employeeName: '=cmd|/c calc!A0', // Potential formula injection
            employeeCode: '+12345',
            departmentName: '-HR',
            month,
            timezone: 'UTC',
            scheduledDays: 22,
            scheduledMinutes: 22 * 480,
            presentDays: 22,
            absentDays: 0,
            leaveDays: 0,
            onDutyDays: 0,
            weeklyOffDays: 9,
            holidayDays: 0,
            actualWorkedMinutes: 22 * 480,
            policyCreditedMinutes: 22 * 480,
            actualWorkedHours: 176,
            policyCreditedHours: 176,
            lateOccurrences: 0,
            lateMinutes: 0,
            earlyExitOccurrences: 0,
            earlyExitMinutes: 0,
            unresolvedExceptions: 0,
            pendingCorrections: 0,
            processingIssues: 0,
            calculationState: 'calculated',
            reviewState: 'not_reviewed',
            payrollReadiness: 'needs_review',
            isLocked: false,
            version: 1,
            sourceFingerprint: 'abc',
            lastCalculatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
      });

      const exportResult = await summaryService.exportSummaries(
        tenantId,
        companyId,
        { month, format: 'csv', level: 'standard' },
        'usr_admin_01',
      );

      // Invariant: Leading formula characters are prefixed with single quote
      expect(exportResult.content).toContain("'=cmd|/c calc!A0");
      expect(exportResult.content).toContain("'+12345");
      expect(exportResult.content).toContain("'-HR");
    });

    it('generates a valid binary PDF with application/pdf MIME type', async () => {
      mockRepo.listSummaries = async () => ({
        items: [
          {
            id: 'sum_01',
            tenantId,
            companyId,
            employeeId,
            employeeName: 'Alice Developer',
            employeeCode: 'EMP-001',
            departmentName: 'Engineering',
            month,
            timezone: 'UTC',
            scheduledDays: 22,
            scheduledMinutes: 22 * 480,
            presentDays: 20,
            absentDays: 2,
            leaveDays: 0,
            onDutyDays: 0,
            weeklyOffDays: 9,
            holidayDays: 0,
            actualWorkedMinutes: 20 * 480,
            policyCreditedMinutes: 20 * 480,
            actualWorkedHours: 160,
            policyCreditedHours: 160,
            lateOccurrences: 1,
            lateMinutes: 15,
            earlyExitOccurrences: 0,
            earlyExitMinutes: 0,
            unresolvedExceptions: 0,
            pendingCorrections: 0,
            processingIssues: 0,
            calculationState: 'calculated',
            reviewState: 'reviewed',
            payrollReadiness: 'ready',
            isLocked: false,
            version: 1,
            sourceFingerprint: 'abc',
            lastCalculatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
      });

      const exportResult = await summaryService.exportSummaries(
        tenantId,
        companyId,
        { month, format: 'pdf', level: 'standard' },
        'usr_admin_01',
      );

      expect(exportResult.mimeType).toBe('application/pdf');
      expect(exportResult.filename).toMatch(/\.pdf$/);
      expect(Buffer.isBuffer(exportResult.content)).toBe(true);

      const buffer = exportResult.content as Buffer;
      const pdfString = buffer.toString('utf-8');

      // Valid PDF-1.4 header and trailer
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('%%EOF');
      expect(pdfString).toContain('/Type /Catalog');
      expect(pdfString).toContain('/Type /Pages');
      expect(pdfString).toContain('/Type /Page');
      expect(pdfString).toContain('Alice Developer');
      expect(pdfString).toContain('EMP-001');
    });
  });
});
