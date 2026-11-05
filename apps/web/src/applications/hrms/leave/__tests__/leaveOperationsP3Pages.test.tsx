import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../../../platform/auth';
import { LeaveHolidayCalendarPage } from '../pages/LeaveHolidayCalendarPage';
import { LeaveYearEndPage } from '../pages/LeaveYearEndPage';
import type { HolidayCalendarView, YearEndView } from '../types/leaveOperations.types';

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AuthProvider>{node}</AuthProvider>
    </MemoryRouter>,
  );

const holidays: HolidayCalendarView = {
  year: 2026,
  cycle: { start: '2026-01-01', end: '2026-12-31', label: '2026' },
  calendar: {
    id: 'c1',
    name: 'Company Holidays',
    revision: 2,
    isDefault: true,
    optionalHolidayQuota: 2,
  },
  holidays: [
    {
      date: '2026-03-14',
      name: 'Holi',
      type: 'optional',
      weekday: 'saturday',
      optedCount: 3,
      isPast: true,
    },
    {
      date: '2026-12-25',
      name: 'Christmas Day',
      type: 'mandatory',
      weekday: 'friday',
      optedCount: 0,
      isPast: false,
    },
  ],
  metrics: {
    total: 2,
    mandatory: 1,
    optional: 1,
    optionalQuota: 2,
    next: { date: '2026-12-25', name: 'Christmas Day' },
  },
};

const yearEnd: YearEndView = {
  cycle: { start: '2025-01-01', end: '2025-12-31', label: '2025' },
  nextCycle: { start: '2026-01-01', end: '2026-12-31', label: '2026' },
  alreadyClosed: false,
  canClose: true,
  autoCloseOn: '2026-01-01',
  totals: { employees: 1, encash: 3, carryForward: 5, lapse: 2 },
  rows: [
    {
      employeeId: 'e1',
      employeeName: 'Arjun Mehta',
      employeeNumber: 'EMP-0002',
      leaveTypeId: 't1',
      leaveTypeName: 'Annual Leave',
      available: 10,
      encash: 3,
      carryForward: 5,
      lapse: 2,
    },
  ],
  runs: [],
  encashments: [],
};

describe('Leave Operations pages (P3)', () => {
  it('Holiday calendar groups holidays by month with uptake and the next holiday', () => {
    const html = wrap(<LeaveHolidayCalendarPage initialData={holidays} />);
    expect(html).toContain('Holiday Calendar');
    expect(html).toContain('Company Holidays · Leave year 2026 · Revision 2');
    expect(html).toContain('March');
    expect(html).toContain('December');
    expect(html).toContain('3 opted');
    expect(html).toContain('Christmas Day');
    expect(html).toContain('2 Per Employee');
  });

  it('Holiday calendar shows the empty state without a published calendar', () => {
    const html = wrap(
      <LeaveHolidayCalendarPage initialData={{ ...holidays, calendar: null, holidays: [] }} />,
    );
    expect(html).toContain('No published calendar for 2026');
  });

  it('Year-end page shows status, totals and the close preview', () => {
    const html = wrap(<LeaveYearEndPage initialData={yearEnd} />);
    expect(html).toContain('Year-End &amp; Encashment');
    expect(html).toContain('Ready to close');
    expect(html).toContain('Days Into 2026');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('Annual Leave');
    expect(html).toContain('No leave year has been closed yet.');
  });

  it('Year-end page marks a closed year', () => {
    const html = wrap(
      <LeaveYearEndPage
        initialData={{
          ...yearEnd,
          alreadyClosed: true,
          canClose: false,
          runs: [
            {
              id: 'run1',
              cycleStartDate: '2025-01-01',
              cycleEndDate: '2025-12-31',
              summary: { balances: 1, carriedForward: 5, lapsed: 2, encashed: 3 },
              closedBy: 'HR Manager',
              createdAt: '2026-01-01T00:10:00Z',
            },
          ],
        }}
      />,
    );
    expect(html).toContain('Close result');
    expect(html).toContain('by HR Manager');
    expect(html).not.toContain('>Close Leave Year<');
  });
});
