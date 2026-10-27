import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceOvertimePage } from '../pages/AttendanceOvertimePage';
import * as overtimeApi from '../api/attendanceOvertimeApi';

describe('BEZENT HRMS — Overtime V1.0 Frontend Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(overtimeApi, 'fetchOvertimeOverview').mockResolvedValue({
      totalRequests: 12,
      pendingApprovalCount: 4,
      approvedCount: 7,
      rejectedCount: 1,
      totalRequestedMinutes: 1440,
      totalApprovedMinutes: 960,
      totalAllocatedPayableMinutes: 600,
      totalAllocatedCompOffMinutes: 360,
      unallocatedApprovedMinutes: 0,
      pendingHandoffCount: 0,
    });
    vi.spyOn(overtimeApi, 'fetchOvertimePolicies').mockResolvedValue([
      {
        id: 'pol-1',
        tenantId: 'tenant-1',
        companyId: 'comp-1',
        policyName: 'Standard Overtime Policy',
        version: 1,
        status: 'published',
        description: null,
        scope: 'company',
        scopeId: null,
        overridesPriority: 1,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        isEnabled: true,
        eligibleEmploymentTypes: null,
        eligibleDepartments: null,
        workdayEligibility: { regularWorkday: true, weeklyOff: true, holiday: true },
        minimumQualifyingMinutes: 30,
        dailyCapMinutes: 120,
        weeklyCapMinutes: 600,
        monthlyCapMinutes: 2400,
        roundingRule: 'exact',
        requiresPreApproval: false,
        submissionWindowDays: 7,
        allowPayable: true,
        allowCompOff: true,
        defaultSettlementPreference: 'payable',
        approvalHierarchy: 'manager_then_hr',
        statutoryRules: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.spyOn(overtimeApi, 'fetchOvertimeRequests').mockResolvedValue({
      items: [
        {
          id: 'ot-001',
          requestNumber: 'OT-2026-0001',
          tenantId: 'tenant-1',
          companyId: 'comp-1',
          employeeId: 'emp-101',
          employeeCode: 'EMP-101',
          employeeName: 'Aarav Patel',
          departmentName: 'Engineering',
          workDate: '2026-10-14',
          dayType: 'regular',
          sourceRecordType: 'punch_event',
          sourceRecordId: null,
          policyId: 'pol-1',
          policyVersion: 1,
          scheduledMinutes: 480,
          actualWorkedMinutes: 600,
          extraWorkedMinutes: 120,
          eligibleOtMinutes: 120,
          requestedOtMinutes: 120,
          approvedOtMinutes: 90,
          allocatedPayableMinutes: 90,
          allocatedCompOffMinutes: 0,
          unallocatedMinutes: 0,
          sourceIntervals: [
            {
              startTime: '18:00',
              endTime: '20:00',
              durationMinutes: 120,
              intervalType: 'after_shift',
            },
          ],
          reason: 'Critical production release support',
          locationOrSite: 'HQ',
          taskOrProject: 'Release 2.4',
          evidenceAttachments: [],
          status: 'approved',
          settlementStatus: 'fully_allocated',
          currentStage: 'settled',
          assignedTo: null,
          assignedAt: null,
          assignedRole: null,
          submittedAt: '2026-10-14T20:05:00Z',
          submittedByUserId: 'usr-101',
          reviewedByUserId: 'usr-001',
          reviewedAt: '2026-10-15T10:00:00Z',
          reviewDecision: 'approved',
          reviewNotes: 'Approved 1.5h for verified deployment',
          cancellationReason: null,
          withdrawalReason: null,
          version: 2,
          createdAt: '2026-10-14T20:05:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 25 },
    });
  });

  it('renders PageHeader with title, subtitle, breadcrumb, and period selector', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOvertimePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Overtime');
    expect(html).toContain('Attendance › Overtime');
    expect(html).toContain('Review overtime hours and choose how each record is settled.');
    expect(html).toContain('Period:');
    expect(html).toContain('Export');
  });

  it('renders summary cards with pending, approved, paid in payroll, comp-off', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOvertimePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Pending Approval');
    expect(html).toContain('Approved Hours');
    expect(html).toContain('Paid in Payroll');
    expect(html).toContain('Converted to Comp-Off');
  });

  it('renders filter bar search input and filters trigger', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOvertimePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by name or employee ID');
    expect(html).toContain('Filters');
  });

  it('renders loading state initially during data retrieval', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceOvertimePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Loading overtime records...');
  });
});
