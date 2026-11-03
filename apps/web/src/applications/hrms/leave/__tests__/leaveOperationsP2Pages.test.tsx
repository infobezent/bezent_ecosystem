import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../../../platform/auth';
import { LeaveTeamCalendarPage } from '../pages/LeaveTeamCalendarPage';
import { LeaveBalancesPage } from '../pages/LeaveBalancesPage';
import { BalanceLedgerDrawer } from '../components/BalanceLedgerDrawer';
import type { BalanceRegister, EmployeeLedger, TeamCalendar } from '../types/leaveOperations.types';

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AuthProvider>{node}</AuthProvider>
    </MemoryRouter>,
  );

const employee = {
  id: 'e1',
  name: 'Arjun Mehta',
  employeeNumber: 'EMP-0002',
  departmentName: 'Engineering',
};

const calendar: TeamCalendar = {
  from: '2026-12-01',
  to: '2026-12-03',
  scope: 'company',
  workforce: 4,
  employees: [employee],
  entries: [
    {
      requestId: 'r1',
      employeeId: 'e1',
      leaveTypeName: 'Casual Leave',
      leaveTypeCode: 'CL',
      colorToken: 'info',
      status: 'approved',
      session: null,
      days: [{ date: '2026-12-01', charged: 1 }],
    },
    {
      requestId: 'r2',
      employeeId: 'e1',
      leaveTypeName: 'Sick Leave',
      leaveTypeCode: 'SL',
      colorToken: 'info',
      status: 'pending',
      session: 'first_half',
      days: [{ date: '2026-12-02', charged: 0.5 }],
    },
  ],
  days: [
    { date: '2026-12-01', isWeekend: false, holiday: null, out: 1, pending: 0, overLimit: true },
    { date: '2026-12-02', isWeekend: false, holiday: null, out: 0, pending: 1, overLimit: false },
    {
      date: '2026-12-03',
      isWeekend: false,
      holiday: { name: 'Founders Day', type: 'mandatory' },
      out: 0,
      pending: 0,
      overLimit: false,
    },
  ],
};

const register: BalanceRegister = {
  cycle: { start: '2026-01-01', end: '2026-12-31', label: '2026' },
  leaveTypes: [
    { id: 't1', name: 'Casual Leave', code: 'CL', colorToken: 'info' },
    { id: 't2', name: 'Sick Leave', code: 'SL', colorToken: 'info' },
  ],
  rows: [
    {
      employee,
      balances: {
        t1: {
          balanceId: 'b1',
          entitled: 6,
          used: 7,
          pending: 0,
          available: -1,
          carriedForward: 0,
          carryForwardExpiresOn: null,
        },
      },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  metrics: { employees: 4, totalAvailable: 32.5, negativeBalances: 1, expiringCarryForward: 0 },
};

const ledger: EmployeeLedger = {
  employee,
  cycle: { start: '2026-01-01', end: '2026-12-31', label: '2026' },
  balances: [
    {
      leaveTypeId: 't1',
      leaveTypeName: 'Casual Leave',
      leaveTypeCode: 'CL',
      balanceId: 'b1',
      entitled: 7.5,
      used: 1,
      pending: 0,
      available: 6.5,
      carriedForward: 0,
      carryForwardExpiresOn: null,
    },
  ],
  entries: [
    {
      id: 'x1',
      leaveTypeId: 't1',
      leaveTypeName: 'Casual Leave',
      txnType: 'accrual',
      effect: 6,
      days: 6,
      runningAvailable: 6,
      referenceType: 'accrual_rule',
      referenceId: null,
      reason: null,
      createdBy: 'System',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'x2',
      leaveTypeId: 't1',
      leaveTypeName: 'Casual Leave',
      txnType: 'adjustment',
      effect: 1.5,
      days: 1.5,
      runningAvailable: 7.5,
      referenceType: 'manual_adjustment',
      referenceId: null,
      reason: 'Comp for event',
      createdBy: 'HR Manager',
      createdAt: '2026-03-01T00:00:00Z',
    },
  ],
};

describe('Leave Operations pages (P2)', () => {
  it('Team calendar renders the grid with approved, half-day pending, holiday and over-limit', () => {
    const html = wrap(<LeaveTeamCalendarPage initialData={calendar} />);
    expect(html).toContain('Team Calendar');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('>CL<');
    expect(html).toMatch(/SL(<!-- -->)?½/);
    expect(html).toContain('Founders Day');
    expect(html).toContain('Over-Limit Days');
    expect(html).toContain('Team Limit Exceeded');
  });

  it('Balances register shows tracked types, negative balance and metrics', () => {
    const html = wrap(<LeaveBalancesPage initialData={register} />);
    expect(html).toContain('Leave Balances');
    expect(html).toContain('Leave year 2026');
    expect(html).toMatch(/-1(<!-- -->)? \/ (<!-- -->)?6/);
    expect(html).toContain('No balance yet this leave year');
    expect(html).toContain('Need Review');
    expect(html).toContain('>Ledger<');
  });

  it('Ledger drawer lists movements with running balance and reasons', () => {
    const html = wrap(
      <BalanceLedgerDrawer employeeId="e1" onClose={() => undefined} initialLedger={ledger} />,
    );
    expect(html).toContain('Arjun Mehta · Leave ledger');
    expect(html).toContain('Manual adjustment');
    expect(html).toContain('Comp for event');
    expect(html).toContain('+1.5');
    expect(html).toContain('7.5');
  });
});
