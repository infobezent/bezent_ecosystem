import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { EssLeavePage } from '../EssLeavePage';
import { essApi, type EssLeaveApprovalItem, type EssLeaveTransactionItem } from '../../api/essApi';

vi.mock('../../api/essApi', () => ({
  essApi: {
    getLeave: vi.fn(),
    getLeaveApprovals: vi.fn(),
    applyLeave: vi.fn(),
    cancelLeave: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
  },
}));

describe('EssLeavePage Component — Render & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWorkspace = {
    policy: { id: 'pol-1', name: 'Standard Corporate Policy' },
    cycle: { start: '2026-01-01', end: '2026-12-31', label: '2026' },
    balances: [
      {
        leaveTypeId: 'lt-al',
        leaveTypeCode: 'AL',
        leaveTypeName: 'Annual Leave',
        colorToken: 'success',
        cycleStartDate: '2026-01-01',
        cycleEndDate: '2026-12-31',
        totalDays: 18,
        usedDays: 6,
        pendingDays: 0,
        availableDays: 12,
        allowHalfDay: true,
        isTracked: true,
        instructions: 'Plan ahead for vacation.',
      },
      {
        leaveTypeId: 'lt-cl',
        leaveTypeCode: 'CL',
        leaveTypeName: 'Casual Leave',
        colorToken: 'info',
        cycleStartDate: '2026-01-01',
        cycleEndDate: '2026-12-31',
        totalDays: 6,
        usedDays: 2,
        pendingDays: 1,
        availableDays: 3,
        allowHalfDay: true,
        isTracked: true,
        instructions: 'For unexpected personal matters.',
      },
      {
        leaveTypeId: 'lt-sl',
        leaveTypeCode: 'SL',
        leaveTypeName: 'Sick Leave',
        colorToken: 'warning',
        cycleStartDate: '2026-01-01',
        cycleEndDate: '2026-12-31',
        totalDays: 8,
        usedDays: 1,
        pendingDays: 0,
        availableDays: 7,
        allowHalfDay: false,
        isTracked: true,
        instructions: 'Medical note required beyond 2 days.',
      },
      {
        leaveTypeId: 'lt-lop',
        leaveTypeCode: 'LOP',
        leaveTypeName: 'Loss of Pay',
        colorToken: 'neutral',
        cycleStartDate: '2026-01-01',
        cycleEndDate: '2026-12-31',
        totalDays: null,
        usedDays: 0,
        pendingDays: 0,
        availableDays: null,
        allowHalfDay: false,
        isTracked: false,
        instructions: null,
      },
    ],
    requests: [
      {
        id: 'req-1',
        leaveTypeId: 'lt-al',
        leaveTypeCode: 'AL',
        leaveTypeName: 'Annual Leave',
        colorToken: 'success',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        totalDays: 3,
        session: null,
        reason: 'Family vacation to Ooty',
        status: 'approved' as const,
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      },
      {
        id: 'req-2',
        leaveTypeId: 'lt-cl',
        leaveTypeCode: 'CL',
        leaveTypeName: 'Casual Leave',
        colorToken: 'info',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        totalDays: 0.5,
        session: 'first_half' as const,
        reason: 'Personal errand morning',
        status: 'pending' as const,
        createdAt: '2026-10-25T11:00:00Z',
        updatedAt: '2026-10-25T11:00:00Z',
      },
      {
        id: 'req-3',
        leaveTypeId: 'lt-sl',
        leaveTypeCode: 'SL',
        leaveTypeName: 'Sick Leave',
        colorToken: 'warning',
        startDate: '2026-10-05',
        endDate: '2026-10-06',
        totalDays: 2,
        session: null,
        reason: 'Viral fever rest',
        status: 'rejected' as const,
        createdAt: '2026-10-05T08:00:00Z',
        updatedAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 'req-4',
        leaveTypeId: 'lt-cl',
        leaveTypeCode: 'CL',
        leaveTypeName: 'Casual Leave',
        colorToken: 'info',
        startDate: '2026-10-15',
        endDate: '2026-10-15',
        totalDays: 1,
        session: null,
        reason: 'Bank visit',
        status: 'cancelled' as const,
        createdAt: '2026-10-14T09:00:00Z',
        updatedAt: '2026-10-14T10:00:00Z',
      },
    ],
    holidays: [
      {
        name: 'Deepavali',
        date: '2026-11-08',
        dayOfWeek: 'Sunday',
        type: 'mandatory',
      },
      {
        name: 'Christmas',
        date: '2026-12-25',
        dayOfWeek: 'Friday',
        type: 'mandatory',
      },
      {
        name: "New Year's Eve",
        date: '2026-12-31',
        dayOfWeek: 'Thursday',
        type: 'optional',
      },
    ],
    holidayCalendarMissing: false,
    optionalHolidayQuota: 2,
  };

  const mockApprovals: EssLeaveApprovalItem[] = [
    {
      approvalId: 'appr-101',
      requestId: 'req-202',
      level: 1,
      purpose: 'approval',
      slaDueAt: '2026-11-20T10:00:00Z',
      employeeName: 'Rohan Sharma',
      employeeNumber: 'EMP-0042',
      leaveTypeName: 'Casual Leave',
      leaveTypeCode: 'CL',
      totalDays: 1,
      session: null,
      startDate: '2026-11-18',
      endDate: '2026-11-18',
      reason: 'Home maintenance',
    },
  ];

  it('renders loading state when initialLoading is true', () => {
    const html = renderToStaticMarkup(<EssLeavePage initialLoading={true} />);
    expect(html).toContain('Loading leave workspace...');
  });

  it('renders page header, title, subtitle, and primary apply button', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('Leave Management');
    expect(html).toContain(
      'View annual leave balances, submit leave applications, track approvals, and holiday calendar',
    );
    expect(html).toContain('Apply for Leave');
    expect(html).toContain('Standard Corporate Policy');
    expect(html).toContain('2026');
  });

  it('renders leave balance cards with days left, quota used, and progress bar', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    // Annual Leave
    expect(html).toContain('Annual Leave');
    expect(html).toContain('12');
    expect(html).toContain('days left');
    expect(html).toContain('Used: 6 of 18');

    // Casual Leave with pending counter
    expect(html).toContain('Casual Leave');
    expect(html).toContain('3');
    expect(html).toContain('Used: 2 of 6');
    expect(html).toContain('Pending: 1');

    // Sick Leave
    expect(html).toContain('Sick Leave');
    expect(html).toContain('7');
    expect(html).toContain('Used: 1 of 8');

    // Loss of Pay (untracked)
    expect(html).toContain('Loss of Pay');
    expect(html).toContain('No quota limit');
  });

  it('renders warnings when policy or holiday calendar is missing', () => {
    const missingWorkspace = {
      ...mockWorkspace,
      policy: null,
      holidayCalendarMissing: true,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={missingWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('No leave policy assigned');
    expect(html).toContain('Holiday calendar not published');
  });

  it('renders Team Approvals section when employee is an assigned approver', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={mockApprovals} />
      </MemoryRouter>,
    );

    expect(html).toContain('Team Approvals');
    expect(html).toContain('Leave requests awaiting your decision');
    expect(html).toContain('Rohan Sharma');
    expect(html).toContain('Home maintenance');
    expect(html).toContain('Approve');
    expect(html).toContain('Reject');
  });

  it('does NOT render Team Approvals section when approvals list is empty', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Team Approvals');
    expect(html).not.toContain('Leave requests awaiting your decision');
  });

  it('renders My Leave History table with requests, dates, status badges, and actions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('My Leave History');
    expect(html).toContain('Track approval status or cancel pending leave requests');
    expect(html).toContain('Family vacation to Ooty');
    expect(html).toContain('3 day(s)');
    expect(html).toContain('Approved');

    // Half-day session
    expect(html).toContain('Personal errand morning');
    expect(html).toContain('0.5 day(s) (First half)');
    expect(html).toContain('Pending');
    expect(html).toContain('id="cancel-leave-req-2"');

    // Rejected & Cancelled
    expect(html).toContain('Viral fever rest');
    expect(html).toContain('Rejected');
    expect(html).toContain('Bank visit');
    expect(html).toContain('Cancelled');
  });

  it('renders upcoming holidays cards with mandatory and optional badges', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('Upcoming Holidays');
    expect(html).toContain('Deepavali');
    expect(html).toContain('Christmas');
    expect(html).toContain('New Year&#x27;s Eve');
    expect(html).toContain('Optional');
  });

  it('renders EmptyState when user has no leave requests', () => {
    const emptyWorkspace = {
      ...mockWorkspace,
      requests: [],
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={emptyWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('No Leave Requests Found');
    expect(html).toContain('You have not submitted any leave applications yet.');
  });

  it('renders Tabs containing "My Leave Requests" and "Leave Balance Ledger"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('My Leave Requests');
    expect(html).toContain('Leave Balance Ledger');
  });

  it('renders "View Ledger" quick action button on tracked balance cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage initialWorkspace={mockWorkspace} initialApprovals={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('View Ledger');
  });

  it('renders Leave Balance Ledger table with columns, credit/debit indicators, and running balance', () => {
    const mockTransactions: EssLeaveTransactionItem[] = [
      {
        id: 'txn-1',
        balanceId: 'bal-1',
        cycleStartDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        transactionDate: '2026-01-01T00:00:00Z',
        effectiveDate: '2026-01-01',
        leaveTypeId: 'lt-al',
        leaveTypeCode: 'AL',
        leaveTypeName: 'Annual Leave',
        colorToken: 'success',
        txnType: 'opening',
        direction: 'credit',
        days: 18,
        credit: 18,
        debit: 0,
        runningBalance: 18,
        description: 'Annual opening balance credit (18 days)',
        referenceType: 'cycle_opening',
        referenceId: null,
        reason: 'Annual cycle grant',
        createdBy: 'System Auto-Credit',
      },
      {
        id: 'txn-2',
        balanceId: 'bal-1',
        cycleStartDate: '2026-01-01',
        createdAt: '2026-02-15T10:30:00Z',
        transactionDate: '2026-02-15T10:30:00Z',
        effectiveDate: '2026-02-15',
        leaveTypeId: 'lt-al',
        leaveTypeCode: 'AL',
        leaveTypeName: 'Annual Leave',
        colorToken: 'success',
        txnType: 'usage_confirm',
        direction: 'debit',
        days: -2,
        credit: 0,
        debit: 2,
        runningBalance: 16,
        description: 'Approved leave deduction (2 days)',
        referenceType: 'leave_request',
        referenceId: 'req-01',
        reason: 'Vacation time',
        createdBy: 'HR Admin',
      },
    ];

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage
          initialWorkspace={mockWorkspace}
          initialApprovals={[]}
          initialActiveTab="ledger"
          initialTransactions={mockTransactions}
        />
      </MemoryRouter>,
    );

    // Filter controls and ledger header
    expect(html).toContain('Leave Balance Ledger');
    expect(html).toContain('Transaction Date');
    expect(html).toContain('Leave Type');
    expect(html).toContain('Details &amp; Reason');
    expect(html).toContain('Credit (+)');
    expect(html).toContain('Debit (-)');
    expect(html).toContain('Balance Available');

    // Transaction rows
    expect(html).toContain('Annual opening balance credit (18 days)');
    expect(html).toContain('+18 days');
    expect(html).toContain('Approved leave deduction (2 days)');
    expect(html).toContain('-2 days');
    expect(html).toContain('16 days');
  });

  it('renders EmptyState when ledger has no transaction records', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EssLeavePage
          initialWorkspace={mockWorkspace}
          initialApprovals={[]}
          initialActiveTab="ledger"
          initialTransactions={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('No Leave Transactions Recorded');
    expect(html).toContain('No balance movements (entitlement, accrual, deduction, or adjustment) match the selected criteria.');
  });
});
