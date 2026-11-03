import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../../../platform/auth';
import { LeaveOverviewPage } from '../pages/LeaveOverviewPage';
import { LeaveRequestsPage } from '../pages/LeaveRequestsPage';
import { LeaveApprovalsPage } from '../pages/LeaveApprovalsPage';
import { LeaveRequestDrawer } from '../components/LeaveRequestDrawer';
import { formatRange, slaLabel } from '../components/leaveDisplay';
import type {
  ApprovalQueueItem,
  LeaveOverview,
  LeaveRequestDetail,
  LeaveRequestList,
} from '../types/leaveOperations.types';

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AuthProvider>{node}</AuthProvider>
    </MemoryRouter>,
  );

const overview: LeaveOverview = {
  date: '2026-11-04',
  scope: 'company',
  metrics: {
    onLeaveToday: 2,
    workforce: 40,
    pendingApprovals: 3,
    overdueApprovals: 1,
    upcomingWeek: 4,
    lopDaysThisMonth: 1.5,
  },
  outToday: [
    {
      requestId: 'r1',
      employeeId: 'e1',
      employeeName: 'Priya Sharma',
      employeeNumber: 'EMP-0002',
      departmentName: 'Engineering',
      leaveTypeName: 'Casual Leave',
      leaveTypeCode: 'CL',
      colorToken: 'info',
      startDate: '2026-11-04',
      endDate: '2026-11-05',
      session: null,
      returnsOn: '2026-11-06',
    },
  ],
  upcoming: [],
  attention: [
    {
      id: 'overdue',
      severity: 'warning',
      title: '1 approval(s) past SLA',
      detail: 'Overdue requests are escalated.',
      target: { page: 'approvals' },
    },
  ],
  leaveMix: [{ leaveTypeId: 't1', name: 'Casual Leave', code: 'CL', colorToken: 'info', days: 3 }],
  upcomingHolidays: [{ date: '2026-12-25', name: 'Christmas Day', type: 'mandatory' }],
};

const list: LeaveRequestList = {
  items: [
    {
      id: 'r1',
      employeeId: 'e1',
      employeeName: 'Priya Sharma',
      employeeNumber: 'EMP-0002',
      departmentName: 'Engineering',
      locationName: 'Chennai',
      leaveTypeId: 't1',
      leaveTypeName: 'Casual Leave',
      leaveTypeCode: 'CL',
      colorToken: 'info',
      startDate: '2026-11-04',
      endDate: '2026-11-05',
      totalDays: 2,
      session: null,
      status: 'pending',
      currentLevel: 1,
      submittedAt: '2026-10-30T10:00:00Z',
      appliedOnBehalf: true,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  counts: { pending: 1, approved: 5, rejected: 1, cancelled: 2, cancellation_pending: 0 },
};

const queueItem: ApprovalQueueItem = {
  approvalId: 'a1',
  requestId: 'r1',
  level: 1,
  purpose: 'approval',
  slaDueAt: '2000-01-01T00:00:00Z',
  slaBreachedAt: null,
  employeeId: 'e1',
  employeeName: 'Priya Sharma',
  employeeNumber: 'EMP-0002',
  leaveTypeName: 'Casual Leave',
  leaveTypeCode: 'CL',
  colorToken: 'info',
  startDate: '2026-11-04',
  endDate: '2026-11-05',
  totalDays: 2,
  session: null,
  reason: 'Family function',
  submittedAt: '2026-10-30T10:00:00Z',
};

const detail: LeaveRequestDetail = {
  id: 'r1',
  employee: {
    id: 'e1',
    name: 'Priya Sharma',
    employeeNumber: 'EMP-0002',
    departmentName: 'Engineering',
    locationName: 'Chennai',
  },
  leaveType: { id: 't1', name: 'Casual Leave', code: 'CL', colorToken: 'info' },
  startDate: '2026-11-06',
  endDate: '2026-11-09',
  totalDays: 2,
  session: null,
  reason: 'Family function',
  status: 'pending',
  currentLevel: 1,
  rejectionReason: null,
  cancellationReason: null,
  cancelledBy: null,
  cancelledAt: null,
  submittedAt: '2026-10-30T10:00:00Z',
  submittedBy: 'HR Manager',
  appliedOnBehalf: true,
  calculation: {
    versionNumber: 1,
    dayCountingMethod: 'working_days',
    calculatedDurationDays: 2,
    scheduleSource: 'company_default',
    warnings: [],
    scheduleBreakdown: [
      {
        date: '2026-11-06',
        isWeeklyOff: false,
        isHoliday: false,
        holidayCode: null,
        chargedDays: 1,
        exclusionReasons: [],
      },
      {
        date: '2026-11-07',
        isWeeklyOff: true,
        isHoliday: false,
        holidayCode: null,
        chargedDays: 0,
        exclusionReasons: ['weekly_off'],
      },
    ],
  },
  approvals: [
    {
      id: 'a1',
      purpose: 'approval',
      level: 1,
      action: 'pending',
      approverEmployeeId: 'e9',
      approverName: 'Arun Kumar',
      actedBy: null,
      comment: null,
      actedAt: null,
      slaDueAt: '2026-11-01T10:00:00Z',
      slaBreachedAt: null,
    },
  ],
  myPendingApprovalId: 'a1',
};

describe('Leave Operations pages (P1)', () => {
  it('Overview shows metrics, who is out, attention items, mix and holidays', () => {
    const html = wrap(<LeaveOverviewPage initialData={overview} />);
    expect(html).toContain('Leave Overview');
    expect(html).toContain('On Leave Today');
    expect(html).toContain('5% of 40');
    expect(html).toContain('1 Overdue');
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('1 approval(s) past SLA');
    expect(html).toContain('Christmas Day');
    expect(html).toContain('LOP This Month');
  });

  it('Requests register shows status counts, filters and the row with applied-by-HR', () => {
    const html = wrap(<LeaveRequestsPage initialData={list} />);
    expect(html).toContain('Leave Requests');
    expect(html).toContain('All statuses');
    expect(html).toContain('Applied by HR only');
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('By HR');
    expect(html).toContain('Level 1');
    expect(html).toContain('Confirmed');
  });

  it('Approvals queue shows SLA state, stage and bulk approve', () => {
    const html = wrap(
      <LeaveApprovalsPage
        initialQueue={[queueItem]}
        initialStats={{ awaitingMe: 1, overdue: 1, cancellations: 0, approvedToday: 2 }}
      />,
    );
    expect(html).toContain('Leave Approvals');
    expect(html).toContain('Approve Selected');
    expect(html).toContain('Overdue');
    expect(html).toContain('Past SLA');
    expect(html).toContain('Level 1');
  });

  it('Approvals queue shows the empty state when nothing is pending', () => {
    const html = wrap(<LeaveApprovalsPage initialQueue={[]} />);
    expect(html).toContain('caught up');
  });

  it('Request drawer renders the breakdown, timeline and approver actions', () => {
    const html = wrap(
      <LeaveRequestDrawer
        requestId="r1"
        onClose={() => undefined}
        initialDetail={detail}
        canCancel
      />,
    );
    expect(html).toContain('Day breakdown');
    expect(html).toContain('Weekly off');
    expect(html).toContain('Arun Kumar');
    expect(html).toContain('Applied on behalf');
    expect(html).toContain('>Approve<');
    expect(html).toContain('Cancel Leave');
  });

  it('formats ranges and SLA labels', () => {
    expect(formatRange('2026-11-04', '2026-11-04')).toBe('04 Nov 2026');
    expect(slaLabel(null, null).text).toBe('No SLA');
    expect(slaLabel('2026-01-01T00:00:00Z', null, Date.parse('2026-01-01T05:00:00Z'))).toEqual({
      text: 'Overdue 5h',
      overdue: true,
    });
  });
});
