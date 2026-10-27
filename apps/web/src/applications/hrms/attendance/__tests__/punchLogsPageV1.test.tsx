import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PunchLogsPage } from '../pages/PunchLogsPage';
import * as attendanceApi from '../api/attendanceApi';

describe('BEZENT HRMS — Punch Logs V1.0 Frontend Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchPunchLogs').mockResolvedValue({
      punches: [
        {
          id: 'punch-001',
          tenantId: 'tenant-1',
          companyId: 'comp-1',
          employeeId: 'emp-101',
          employeeName: 'Aarav Patel',
          employeeCode: 'EMP-101',
          punchTime: '2026-10-10T09:00:00Z',
          punchType: 'in',
          source: 'biometric',
          workLocation: 'HQ - Gate 1',
          workday: '2026-10-10',
          validationStatus: 'valid',
          processingState: 'processed',
          retryCount: 0,
          investigationStatus: 'none',
          linkedAttendanceId: 'att-001',
          linkedAttendanceStatus: 'present',
          createdAt: '2026-10-10T09:00:02Z',
          updatedAt: '2026-10-10T09:00:02Z',
        },
      ],
      counters: {
        total: 42,
        valid: 38,
        needsReview: 2,
        duplicates: 1,
        unmatched: 1,
        processingFailed: 0,
      },
      total: 42,
    });
  });

  it('renders PageHeader with compact title and breadcrumbs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Punch Logs');
    expect(html).toContain('Attendance › Punch Logs');
    expect(html).toContain('Review every raw punch captured from devices, web and mobile.');
    expect(html).toContain('Event Time');
    expect(html).toContain('Workday');
    expect(html).toContain('Export');
  });

  it('renders exactly all five summary counters', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Punches');
    expect(html).toContain('Accepted');
    expect(html).toContain('Flagged');
    expect(html).toContain('Rejected');
    expect(html).toContain('Failed to Process');
  });

  it('renders primary filter bar controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by name or employee ID');
    expect(html).toContain('Filters');
  });
});
