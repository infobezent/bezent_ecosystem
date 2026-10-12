import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceExceptionsPage } from '../pages/AttendanceExceptionsPage';
import * as attendanceApi from '../api/attendanceApi';

describe('BEZENT HRMS — Attendance Exceptions V1.0 Frontend Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchExceptionCases').mockResolvedValue({
      items: [
        {
          id: 'exc-101',
          tenantId: 'tenant-1',
          companyId: 'comp-1',
          employeeId: 'emp-101',
          employeeName: 'Aarav Patel',
          employeeCode: 'EMP-101',
          departmentName: 'Engineering',
          workday: '2026-10-10',
          exceptionType: 'missing_out',
          severity: 'high',
          source: 'engine',
          sourceRecordType: 'attendance_daily',
          sourceRecordId: 'att-001',
          title: 'Missing Out Punch on 2026-10-10',
          description: 'Single IN punch registered at 09:15 with no corresponding OUT punch.',
          status: 'open',
          assignedTo: null,
          assignedToName: null,
          assignedQueue: null,
          pendingActionReason: null,
          pendingActionAwaitedFrom: null,
          resolutionType: null,
          resolutionNotes: null,
          resolvedAt: null,
          resolvedByUserId: null,
          closedAt: null,
          closedByUserId: null,
          detectedAt: '2026-10-10T20:00:00Z',
          createdAt: '2026-10-10T20:00:00Z',
          updatedAt: '2026-10-10T20:00:00Z',
          relatedRecordSummary: {
            type: 'attendance_daily',
            id: 'att-001',
            label: 'ATTENDANCE DAILY #att-001',
          },
        },
      ],
      counters: {
        activeCases: 14,
        critical: 3,
        highPriority: 5,
        unassigned: 6,
        pendingAction: 2,
        resolvedToday: 4,
      },
      total: 14,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('renders PageHeader with compact title and breadcrumbs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceExceptionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Exceptions');
    expect(html).toContain('Attendance / Exceptions');
    expect(html).toContain('Today');
    expect(html).toContain('Export');
  });

  it('renders exactly all six summary counters', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceExceptionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('ACTIVE CASES');
    expect(html).toContain('CRITICAL');
    expect(html).toContain('HIGH PRIORITY');
    expect(html).toContain('UNASSIGNED');
    expect(html).toContain('PENDING ACTION');
    expect(html).toContain('RESOLVED TODAY');
  });

  it('renders primary filter bar controls and quick date presets', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceExceptionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search Employee, ID, or Case...');
    expect(html).toContain('Active Cases');
    expect(html).toContain('All Severities');
    expect(html).toContain('All Exception Types');
    expect(html).toContain('More Filters');
    expect(html).toContain('Reset');
  });
});
