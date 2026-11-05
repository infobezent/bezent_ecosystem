import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../../../platform/auth';
import { LeaveReportsPage } from '../pages/LeaveReportsPage';
import type { LeaveReport } from '../types/leaveOperations.types';

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AuthProvider>{node}</AuthProvider>
    </MemoryRouter>,
  );

const report: LeaveReport = {
  reportId: 'lop',
  title: 'LOP for Payroll',
  description: 'Loss-of-pay days per employee per payroll month.',
  range: { from: '2026-01-01', to: '2026-10-31' },
  columns: [
    { key: 'employee', label: 'Employee', numeric: false },
    { key: 'month', label: 'Month', numeric: false },
    { key: 'lopDays', label: 'LOP Days', numeric: true },
  ],
  rows: [{ employee: 'Arjun Mehta', month: '2026-10', lopDays: 1.5 }],
  summary: [
    { label: 'LOP days', value: 1.5 },
    { label: 'Employees', value: 1 },
  ],
  truncated: false,
  generatedAt: '2026-10-31T10:00:00Z',
};

describe('Leave Reports page (P4)', () => {
  it('renders report tabs, filters, summary and the generic table', () => {
    const html = wrap(<LeaveReportsPage initialReport={report} />);
    expect(html).toContain('Leave Reports');
    for (const label of [
      'Utilisation',
      'LOP for Payroll',
      'Balance Liability',
      'Approval SLA',
      'Audit Trail',
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Export CSV');
    expect(html).toContain('LOP Days');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('1.5');
    expect(html).toContain('2026-01-01 → 2026-10-31');
  });

  it('shows the empty state and the truncation warning', () => {
    const empty = wrap(<LeaveReportsPage initialReport={{ ...report, rows: [] }} />);
    expect(empty).toContain('No data for this range');
    const capped = wrap(
      <LeaveReportsPage initialReport={{ ...report, reportId: 'audit', truncated: true }} />,
    );
    expect(capped).toContain('Showing the latest 1 events');
  });
});
