import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { hrmsNavigation } from '../../navigation';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import {
  AttendanceOverviewPage,
  DailyAttendanceLogPage,
  MonthlyAttendanceSummaryPage,
  PunchLogsPage,
  AttendanceRegularizationPage,
  AttendanceOnDutyPage,
  AttendanceExceptionsPage,
  AttendanceReportsPage,
  AttendanceOvertimePage,
  AttendanceCompOffPage,
} from '../pages';
import * as attendanceApi from '../api/attendanceApi';

describe('HRMS Attendance Module V1 Frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchAttendanceOverview').mockResolvedValue({
      date: '2026-10-09',
      expectedCount: 15,
      presentCount: 12,
      absentCount: 2,
      halfDayCount: 0,
      onLeaveCount: 1,
      lateCount: 1,
      missingPunchCount: 0,
      pendingRegularizationCount: 3,
      attendanceRate: 80,
      recentTrends: [{ date: '2026-10-09', present: 12, absent: 2, late: 1 }],
      departmentBreakdown: [
        {
          departmentId: 'dept_eng_01',
          departmentName: 'Engineering',
          present: 9,
          total: 10,
        },
      ],
    });
    vi.spyOn(attendanceApi, 'fetchDailyAttendanceLog').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchMonthlyAttendanceSummary').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchPunchLogs').mockResolvedValue({
      punches: [],
      counters: {
        total: 0,
        valid: 0,
        needsReview: 0,
        duplicates: 0,
        unmatched: 0,
        processingFailed: 0,
      },
      total: 0,
    });
    vi.spyOn(attendanceApi, 'fetchRegularizationRequests').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchAttendanceExceptions').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchOnDutyTypes').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchOnDutyRequests').mockResolvedValue([]);
  });

  describe('Attendance Navigation and Flyout', () => {
    it('defines exactly the 5 canonical Attendance flyout hubs in hrmsNavigation', () => {
      const attendanceNav = hrmsNavigation.destinations.find((item) => item.id === 'attendance');
      expect(attendanceNav).toBeDefined();
      expect(attendanceNav?.children).toBeDefined();

      const childIds = attendanceNav?.children?.map((c) => c.id);
      expect(childIds).toEqual([
        'overview',
        'daily-log',
        'regularization',
        'exceptions',
        'reports',
      ]);
    });

    it('groups the Daily/Monthly/Punch Logs pages under the Attendance hub via aliases', () => {
      const attendanceNav = hrmsNavigation.destinations.find((item) => item.id === 'attendance');
      const hub = attendanceNav?.children?.find((c) => c.id === 'daily-log');
      expect(hub?.label).toBe('Attendance');
      expect(hub?.aliases).toEqual(['attendance/monthly-summary', 'attendance/punch-logs']);
    });

    it('groups the Regularization/On-Duty/Overtime/Comp-Off pages under the Requests hub via aliases', () => {
      const attendanceNav = hrmsNavigation.destinations.find((item) => item.id === 'attendance');
      const hub = attendanceNav?.children?.find((c) => c.id === 'regularization');
      expect(hub?.label).toBe('Requests');
      expect(hub?.aliases).toEqual([
        'attendance/on-duty',
        'attendance/overtime',
        'attendance/comp-off',
      ]);
    });

    it('contains no duplicate operational Policies entry in Attendance flyout', () => {
      const attendanceNav = hrmsNavigation.destinations.find((item) => item.id === 'attendance');
      const policiesChild = attendanceNav?.children?.find((c) => c.id === 'policies');
      expect(policiesChild).toBeUndefined();
    });

    it('HR Settings retains the canonical Attendance configuration entry', async () => {
      const { SETTINGS_MODULE_CARDS } = await import('../../settings/types/settingsCenter');
      const attendanceSetting = SETTINGS_MODULE_CARDS.find((m) => m.id === 'attendance');
      expect(attendanceSetting).toBeDefined();
      expect(attendanceSetting?.name).toBe('Attendance');
    });
  });

  describe('Attendance Routes Composition', () => {
    it('configures canonical attendance routes and policies redirect in hrmsRoutes', () => {
      const rootRoute = hrmsRoutes[0]!;
      expect(rootRoute.children).toBeDefined();

      const paths = rootRoute.children?.map((c) => c.path).filter(Boolean);
      expect(paths).toContain('attendance');
      expect(paths).toContain('attendance/overview');
      expect(paths).toContain('attendance/daily-log');
      expect(paths).toContain('attendance/monthly-summary');
      expect(paths).toContain('attendance/punch-logs');
      expect(paths).toContain('attendance/regularization');
      expect(paths).toContain('attendance/on-duty');
      expect(paths).toContain('attendance/overtime');
      expect(paths).toContain('attendance/comp-off');
      expect(paths).toContain('attendance/exceptions');
      expect(paths).toContain('attendance/reports');
      expect(paths).toContain('attendance/policies'); // Redirect to HR Settings
    });

    it('keeps all 7 original tab-group URLs routed to their original pages', () => {
      const rootRoute = hrmsRoutes[0]!;
      const children = rootRoute.children!;
      const pageOf = (path: string) =>
        (children.find((c) => c.path === path)?.element as ReactElement | undefined)?.type;

      expect(pageOf('attendance/daily-log')).toBe(DailyAttendanceLogPage);
      expect(pageOf('attendance/monthly-summary')).toBe(MonthlyAttendanceSummaryPage);
      expect(pageOf('attendance/punch-logs')).toBe(PunchLogsPage);
      expect(pageOf('attendance/regularization')).toBe(AttendanceRegularizationPage);
      expect(pageOf('attendance/on-duty')).toBe(AttendanceOnDutyPage);
      expect(pageOf('attendance/overtime')).toBe(AttendanceOvertimePage);
      expect(pageOf('attendance/comp-off')).toBe(AttendanceCompOffPage);
    });

    it('adds /hrms/attendance/records and /hrms/attendance/requests as hub entry redirects', () => {
      const rootRoute = hrmsRoutes[0]!;
      const children = rootRoute.children!;

      const recordsRoute = children.find((c) => c.path === 'attendance/records');
      const requestsRoute = children.find((c) => c.path === 'attendance/requests');
      expect(recordsRoute).toBeDefined();
      expect(requestsRoute).toBeDefined();

      const recordsHtml = renderToStaticMarkup(
        <MemoryRouter>{recordsRoute!.element}</MemoryRouter>,
      );
      const requestsHtml = renderToStaticMarkup(
        <MemoryRouter>{requestsRoute!.element}</MemoryRouter>,
      );
      // <Navigate> renders nothing itself; assert the redirect target via props.
      expect((recordsRoute!.element as ReactElement).props.to).toBe('/hrms/attendance/daily-log');
      expect((requestsRoute!.element as ReactElement).props.to).toBe(
        '/hrms/attendance/regularization',
      );
      expect(recordsHtml).toBe('');
      expect(requestsHtml).toBe('');
    });
  });

  describe('Attendance Pages Static Rendering', () => {
    it('renders AttendanceOverviewPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceOverviewPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Attendance Overview');
      expect(html).toContain(
        'Monitor daily attendance and manage workforce attendance activities.',
      );
    });

    it('renders DailyAttendanceLogPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <DailyAttendanceLogPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Attendance');
      expect(html).toContain('Export');
    });

    it('renders MonthlyAttendanceSummaryPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <MonthlyAttendanceSummaryPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Attendance');
      expect(html).toContain('Monthly');
    });

    it('renders PunchLogsPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <PunchLogsPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Attendance');
      expect(html).toContain('Punch Logs');
    });

    it('renders AttendanceRegularizationPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceRegularizationPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Regularization');
      expect(html).toContain('Submit, review and manage attendance correction requests');
    });

    it('renders AttendanceOnDutyPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceOnDutyPage />
        </MemoryRouter>,
      );
      expect(html).toContain('On-Duty (OD)');
      expect(html).toContain('New Request');
    });

    it('renders AttendanceExceptionsPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceExceptionsPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Exceptions');
      expect(html).toContain('ACTIVE CASES');
    });

    it('renders AttendanceReportsPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceReportsPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Reports');
      expect(html).toContain('Available Reports');
    });

    it('renders AttendanceOvertimePage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceOvertimePage />
        </MemoryRouter>,
      );
      expect(html).toContain('Overtime');
      expect(html).toContain('Pending Approval');
    });

    it('renders AttendanceCompOffPage without crashing', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceCompOffPage />
        </MemoryRouter>,
      );
      expect(html).toContain('Comp-Off');
      expect(html).toContain('Run Expiry Check');
    });
  });
});
