import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceRegularizationPage } from '../pages/AttendanceRegularizationPage';
import * as attendanceApi from '../api/attendanceApi';
import type { RegularizationItemV1 } from '../types/attendance.types';

describe('BEZENT HRMS — Attendance Regularization V1.0 Frontend Workspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchRegularizationWorkspace').mockResolvedValue({
      items: [
        {
          id: 'reg-001',
          requestNumber: 'REG-2026-00124',
          employeeId: 'emp-024',
          employeeName: 'Karthik R',
          employeeCode: 'EMP-024',
          departmentName: 'Engineering',
          workday: '2026-10-09',
          requestType: 'missing_out',
          approvalStatus: 'under_review',
          applicationStatus: 'not_applicable',
          requestedChange: 'OUT: — → 06:05 PM',
          submittedAt: '2026-10-09T19:12:00Z',
          assignedTo: 'usr-hr-01',
          assignedToName: 'Meena HR',
          relatedExceptionId: 'EXC-2026-00124',
          isHighRisk: false,
        },
        {
          id: 'reg-002',
          requestNumber: 'REG-2026-00118',
          employeeId: 'emp-031',
          employeeName: 'Priya S',
          employeeCode: 'EMP-031',
          departmentName: 'Product',
          workday: '2026-10-08',
          requestType: 'incorrect_time',
          approvalStatus: 'submitted',
          applicationStatus: 'not_applicable',
          requestedChange: 'IN: 09:25 → 09:05 AM',
          submittedAt: '2026-10-08T18:48:00Z',
          assignedTo: 'usr-mgr-01',
          assignedToName: 'Ravi Manager',
          relatedExceptionId: 'EXC-2026-00118',
          isHighRisk: false,
        },
      ] as RegularizationItemV1[],
      counters: {
        pendingReview: 24,
        underReview: 8,
        awaitingInfo: 5,
        approvedToday: 12,
        applicationIssues: 3,
        rejectedToday: 4,
      },
      total: 24,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it('renders PageHeader with Attendance / Regularization breadcrumb, Export, and New Request actions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceRegularizationPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Regularization');
    expect(html).toContain('Attendance / Regularization');
    expect(html).toContain('Submit, review and manage attendance correction requests');
    expect(html).toContain('Export');
    expect(html).toContain('New Request');
  });

  it('renders exactly all six summary counters in compact strip', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceRegularizationPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Pending Review');
    expect(html).toContain('Under Review');
    expect(html).toContain('Awaiting Info');
    expect(html).toContain('Approved Today');
    expect(html).toContain('Application Issues');
    expect(html).toContain('Rejected Today');
  });

  it('renders primary filter bar and loading state', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceRegularizationPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by name, employee ID or request ID...');
    expect(html).toContain('More Filters');
    expect(html).toContain('Loading regularization workspace...');
  });

  it('renders multi-stage workspace queue switcher tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceRegularizationPage />
      </MemoryRouter>,
    );

    expect(html).toContain('All Requests');
    expect(html).toContain('Manager Review Queue');
    expect(html).toContain('HR Review Queue');
    expect(html).toContain('Unassigned HR Queue');
  });
});
