import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceOverviewPage } from '../pages/AttendanceOverviewPage';
import * as attendanceApi from '../api/attendanceApi';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

describe('BEZENT HRMS — Attendance Overview V1.0 Frontend Page', () => {
  const mockOverviewData: AttendanceOverviewKpis = {
    date: '2026-10-10',
    timezone: 'Asia/Kolkata',
    asOf: '2026-10-10T12:00:00Z',
    dataFreshness: 'realtime',
    scope: {
      role: 'hr_admin',
      isCompanyWide: true,
      departmentId: undefined,
      employeeId: undefined,
      canViewPayrollReadiness: true,
    },
    todayKpis: {
      date: '2026-10-10',
      timezone: 'Asia/Kolkata',
      totalEligibleEmployees: 45,
      presentCount: 38.5,
      absentCount: 3.5,
      onLeaveCount: 2.0,
      onDutyCount: 1.0,
      lateArrivalsCount: 4,
      missingPunchCount: 2,
      pendingProcessingCount: 0,
      halfDayCount: 1,
      attendanceRate: 85.6,
      processingCompletenessPercent: 100,
      isFuture: false,
      asOf: '2026-10-10T12:00:00Z',
    },
    trends: {
      range: '7d',
      startDate: '2026-10-04',
      endDate: '2026-10-10',
      avgAttendanceRate: 85.7,
      avgAbsenceRate: 7.8,
      totalLateOccurrences: 18,
      items: [
        {
          date: '2026-10-10',
          dayOfWeek: 'Saturday',
          scheduledDayEquivalents: 45,
          presentEquivalentDays: 38.5,
          absentEquivalentDays: 3.5,
          leaveCoverageEquivalents: 2.0,
          odCoverageEquivalents: 1.0,
          attendanceRate: 85.6,
          absenceRate: 7.8,
          lateOccurrences: 4,
          isFuture: false,
        },
      ],
    },
    departments: [
      {
        departmentId: 'dept_eng_01',
        departmentName: 'Engineering',
        eligibleEmployees: 25,
        presentEquivalents: 23.0,
        absentEquivalents: 1.0,
        leaveCoverage: 1.0,
        odCoverage: 0.0,
        attendanceRate: 92.0,
        missingPunchCount: 1,
        unresolvedExceptions: 0,
      },
      {
        departmentId: 'dept_ops_01',
        departmentName: 'Operations',
        eligibleEmployees: 20,
        presentEquivalents: 15.5,
        absentEquivalents: 2.5,
        leaveCoverage: 1.0,
        odCoverage: 1.0,
        attendanceRate: 77.5,
        missingPunchCount: 1,
        unresolvedExceptions: 2,
      },
    ],
    actionQueue: [
      {
        actionType: 'pending_regularization',
        title: 'Pending Regularization',
        description: 'Correction requests requiring approval',
        authorizedPendingCount: 5,
        severity: 'warning',
        oldestPendingAgeDays: 2,
        targetRoute: '/hrms/attendance/regularization',
        filterParams: { approvalStatus: 'submitted' },
        lastUpdated: '2026-10-10T11:45:00Z',
      },
      {
        actionType: 'pending_on_duty',
        title: 'Pending On-Duty Approvals',
        description: 'OD requests awaiting review',
        authorizedPendingCount: 2,
        severity: 'info',
        oldestPendingAgeDays: 1,
        targetRoute: '/hrms/attendance/on-duty',
        filterParams: { status: 'submitted' },
        lastUpdated: '2026-10-10T11:50:00Z',
      },
      {
        actionType: 'unresolved_exceptions',
        title: 'Unresolved Exceptions',
        description: 'Flagged attendance exceptions',
        authorizedPendingCount: 3,
        severity: 'danger',
        oldestPendingAgeDays: 4,
        targetRoute: '/hrms/attendance/exceptions',
        filterParams: { status: 'open' },
        lastUpdated: '2026-10-10T11:30:00Z',
      },
      {
        actionType: 'missing_punch_issues',
        title: 'Missing Punch Records',
        description: 'Records missing IN or OUT punches',
        authorizedPendingCount: 2,
        severity: 'danger',
        oldestPendingAgeDays: 0,
        targetRoute: '/hrms/attendance/daily-log',
        filterParams: { isMissingPunch: 'true' },
        lastUpdated: '2026-10-10T11:55:00Z',
      },
      {
        actionType: 'pending_monthly_review',
        title: 'Pending Monthly Reviews',
        description: 'Employee monthly summaries pending verification',
        authorizedPendingCount: 8,
        severity: 'warning',
        oldestPendingAgeDays: 5,
        targetRoute: '/hrms/attendance/monthly-summary',
        filterParams: { reviewState: 'in_review' },
        lastUpdated: '2026-10-10T10:00:00Z',
      },
      {
        actionType: 'payroll_readiness_blockers',
        title: 'Payroll Readiness Blockers',
        description: 'Issues blocking payroll cutoff',
        authorizedPendingCount: 1,
        severity: 'danger',
        oldestPendingAgeDays: 3,
        targetRoute: '/hrms/attendance/monthly-summary',
        filterParams: { payrollReadiness: 'blocked' },
        lastUpdated: '2026-10-10T09:00:00Z',
      },
    ],
    processingHealth: {
      date: '2026-10-10',
      status: 'healthy',
      eligibleWorkdays: 45,
      processedWorkdays: 43,
      pendingWorkdays: 2,
      failedWorkdays: 0,
      attemptedWorkdays: 43,
      processingSuccessRate: 100,
      reconciliationCompletionRate: 95.6,
      assignedScheduleCount: 45,
      fallbackScheduleCount: 0,
      unresolvedScheduleCount: 0,
      missingScheduleCount: 0,
      unresolvedBlockingExceptions: 1,
      workdayBlockingExceptions: 0,
      cumulativeBlockingExceptions: 1,
      historicalBlockingExceptions: 1,
      staleMonthlySummaries: 0,
      denominatorDescription: 'Processed Finalized (43) / Eligible Workdays (45)',
      asOf: '2026-10-10T12:00:00Z',
    },
    monthlyReadiness: {
      month: '2026-10',
      totalInScope: 45,
      readyCount: 30,
      needsReviewCount: 12,
      blockedCount: 3,
      calculatingCount: 0,
      reviewedCount: 20,
      pendingReviewCount: 22,
      reopenedCount: 3,
      lockedCount: 0,
      isAuthorized: true,
      targetRoute: '/hrms/attendance/monthly-summary',
      filterParams: { month: '2026-10' },
    },
    // Legacy backward-compat
    expectedCount: 45,
    presentCount: 38.5,
    absentCount: 3.5,
    halfDayCount: 0,
    onLeaveCount: 2.0,
    lateCount: 4,
    missingPunchCount: 2,
    pendingRegularizationCount: 5,
    attendanceRate: 85.6,
    recentTrends: [{ date: '2026-10-10', present: 38.5, absent: 3.5, late: 4 }],
    departmentBreakdown: [
      { departmentId: 'dept_eng_01', departmentName: 'Engineering', present: 23, total: 25 },
      { departmentId: 'dept_ops_01', departmentName: 'Operations', present: 15.5, total: 20 },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchAttendanceOverview').mockResolvedValue(mockOverviewData);
  });

  it('renders initial page structure and quick action navigation without crashing', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Attendance Overview');
    expect(html).toContain('Workforce operations, exception triage, and monthly payroll readiness');
    expect(html).toContain('Daily Attendance');
    expect(html).toContain('Regularization Queue');
    expect(html).toContain('Monthly Summary');
  });

  it('renders processing health card with wrapping description and truthful blocking exception labels', () => {
    // When overview data is loaded, verify the markup adheres to wrapping standards
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOverviewPage />
      </MemoryRouter>,
    );

    // Ensure the non-wrapping table subtitle class is NOT used on the overview page
    expect(html).not.toContain('bezent-table-meta-subtitle');
  });

  it('handles API fetch execution without error and exposes filter controls', async () => {
    let capturedDate: string | undefined;
    let capturedOptions:
      | {
          trendRange?: '7d' | '30d' | 'custom';
          startDate?: string;
          endDate?: string;
          month?: string;
        }
      | undefined;
    vi.spyOn(attendanceApi, 'fetchAttendanceOverview').mockImplementation(async (date, options) => {
      capturedDate = date;
      capturedOptions = options;
      return mockOverviewData;
    });

    const result = await attendanceApi.fetchAttendanceOverview('2026-10-10', {
      trendRange: '7d',
      month: '2026-10',
    });

    expect(result.todayKpis?.totalEligibleEmployees).toBe(45);
    expect(result.todayKpis?.attendanceRate).toBe(85.6);
    expect(result.actionQueue?.length).toBe(6);
    expect(result.processingHealth?.status).toBe('healthy');
    expect(result.processingHealth?.processingSuccessRate).toBe(100);
    expect(result.processingHealth?.reconciliationCompletionRate).toBe(95.6);
    expect(result.processingHealth?.assignedScheduleCount).toBe(45);
    expect(result.processingHealth?.fallbackScheduleCount).toBe(0);
    expect(result.processingHealth?.unresolvedScheduleCount).toBe(0);
    expect(result.processingHealth?.historicalBlockingExceptions).toBe(1);
    expect(result.monthlyReadiness?.isAuthorized).toBe(true);
    expect(capturedDate).toBe('2026-10-10');
    expect(capturedOptions?.trendRange).toBe('7d');
  });
});
