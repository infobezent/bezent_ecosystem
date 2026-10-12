import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceOnDutyPage } from '../pages/AttendanceOnDutyPage';
import * as attendanceApi from '../api/attendanceApi';

describe('BEZENT HRMS — Attendance On-Duty V1.0 Frontend Workspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchOnDutyTypes').mockResolvedValue([
      { id: 'od_client_visit', name: 'Client Visit' },
      { id: 'od_field_duty', name: 'Field Duty' },
      { id: 'od_site_work', name: 'Customer Site Work' },
      { id: 'od_seminar', name: 'Seminar / Training' },
      { id: 'od_travel', name: 'Business Travel' },
    ]);
    vi.spyOn(attendanceApi, 'fetchOnDutyWorkspace').mockResolvedValue({
      items: [
        {
          id: 'od-001',
          requestNumber: 'OD-202610-001',
          employeeId: 'emp-024',
          employeeName: 'Karthik R',
          employeeCode: 'EMP-024',
          departmentName: 'Engineering',
          odTypeId: 'od_client_visit',
          odTypeName: 'Client Visit',
          startDate: '2026-10-14',
          endDate: '2026-10-14',
          dutyPeriodDisplay: '2026-10-14',
          durationType: 'full_day',
          durationHours: 8,
          locationOrSite: 'Apex HQ, Building 4',
          purpose: 'Quarterly Architecture Review and On-Site Sprint Planning',
          projectReference: 'PRJ-ARCH-2026',
          submittedAt: '2026-10-12T08:30:00Z',
          assignedTo: 'usr-hr-01',
          assignedToName: 'Meena HR',
          assignedRole: 'HR Reviewer',
          approvalStatus: 'submitted',
          status: 'submitted',
          processingStatus: 'not_applicable',
          isHighRisk: false,
        },
        {
          id: 'od-002',
          requestNumber: 'OD-202610-002',
          employeeId: 'emp-031',
          employeeName: 'Priya S',
          employeeCode: 'EMP-031',
          departmentName: 'Product',
          odTypeId: 'od_field_duty',
          odTypeName: 'Field Duty',
          startDate: '2026-10-15',
          endDate: '2026-10-16',
          dutyPeriodDisplay: '2026-10-15 – 2026-10-16',
          durationType: 'multi_day',
          durationHours: 16,
          locationOrSite: 'Industrial Corridor Zone 3',
          purpose: 'Customer User Research & Field Testing',
          submittedAt: '2026-10-11T14:15:00Z',
          assignedTo: 'usr-mgr-01',
          assignedToName: 'Ravi Manager',
          approvalStatus: 'under_review',
          status: 'under_review',
          processingStatus: 'pending',
          isHighRisk: false,
        },
      ],
      counters: {
        pendingReview: 14,
        underReview: 6,
        awaitingInfo: 3,
        approvedToday: 9,
        processingIssues: 2,
        upcomingOd: 8,
      },
      totalCount: 20,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
  });

  it('renders PageHeader with Attendance / On-Duty breadcrumb, Export, and New Request actions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOnDutyPage />
      </MemoryRouter>,
    );

    expect(html).toContain('On-Duty (OD)');
    expect(html).toContain('Attendance / On-Duty');
    expect(html).toContain('Export');
    expect(html).toContain('New Request');
  });

  it('renders exactly all six summary counters in compact strip', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOnDutyPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Pending Review');
    expect(html).toContain('Under Review');
    expect(html).toContain('Awaiting Info');
    expect(html).toContain('Approved Today');
    expect(html).toContain('Processing Issues');
    expect(html).toContain('Upcoming OD');
  });

  it('renders primary filter toolbar with Search, Approval Status, OD Type, and Processing Status', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOnDutyPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by name, employee code, request #, site...');
    expect(html).toContain('All Approval Statuses');
    expect(html).toContain('All OD Types');
    expect(html).toContain('All Processing States');
    expect(html).toContain('More Filters');
  });
});
