import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssTimesheetsPage } from '../EssTimesheetsPage';
import type { EssTimesheet } from '../../api/essApi';

vi.mock('../../api/essApi', () => ({
  essApi: {
    getTimesheets: vi.fn(),
    getAttendance: vi.fn(),
    logTimesheet: vi.fn(),
    updateTimesheet: vi.fn(),
    deleteTimesheet: vi.fn(),
    submitTimesheets: vi.fn(),
  },
}));

describe('EssTimesheetsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTimesheets: EssTimesheet[] = [
    {
      id: 'ts-1',
      date: '2026-10-12', // Monday
      projectName: 'BEZENT Core Suite',
      taskDescription: 'Architecture & REST API Implementation',
      hours: 8,
      status: 'draft',
      createdAt: '2026-10-12T17:00:00Z',
    },
    {
      id: 'ts-2',
      date: '2026-10-13', // Tuesday
      projectName: 'BEZENT Core Suite',
      taskDescription: 'Architecture & REST API Implementation',
      hours: 7,
      status: 'submitted',
      createdAt: '2026-10-13T17:00:00Z',
    },
    {
      id: 'ts-3',
      date: '2026-10-14', // Wednesday
      projectName: 'HRMS Onboarding',
      taskDescription: 'Stage Wizard Form Polish',
      hours: 8,
      status: 'approved',
      createdAt: '2026-10-14T17:00:00Z',
    },
  ];

  it('renders loading state when initialLoading is true', () => {
    const html = renderToStaticMarkup(<EssTimesheetsPage initialLoading={true} />);
    expect(html).toContain('Loading your timesheets workspace...');
  });

  it('renders the workspace with header, week navigation, and action buttons', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage initialLoading={false} initialTimesheets={[]} />,
    );

    expect(html).toContain('My Timesheets');
    expect(html).toContain('Track your project work, manage weekly hours, and submit timesheets.');
    expect(html).toContain('Previous Week');
    expect(html).toContain('Next Week');
    expect(html).toContain('Current Week');
    expect(html).toContain('Add Time Entry');
  });

  it('renders weekly summary sections and attendance reconciliation card', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage
        initialLoading={false}
        initialTimesheets={mockTimesheets}
        initialMonday={new Date('2026-10-12T00:00:00')}
      />,
    );

    // Weekly Summary KPIs
    expect(html).toContain('Weekly Summary');
    expect(html).toContain('Total Logged');
    expect(html).toContain('Draft Hours');
    expect(html).toContain('Pending Review');
    expect(html).toContain('Approved Hours');

    // Attendance Reconciliation
    expect(html).toContain('Attendance vs Timesheet Reconciliation');
    expect(html).toContain('Attendance Worked Hours');
    expect(html).toContain('Timesheet Project Hours');
    expect(html).toContain('Allocation Difference');

    // Time entry ledger
    expect(html).toContain('Time Entry Records');
    expect(html).toContain('All Timesheets');
  });

  it('renders empty state when no time entries exist for the selected week', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage initialLoading={false} initialTimesheets={[]} />,
    );

    expect(html).toContain('No Time Entries For This Week');
    expect(html).toContain('You have not logged any project time entries for this week yet.');
  });

  it('renders weekly grid table with project rows, daily hour pills, and totals when records exist', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage
        initialLoading={false}
        initialTimesheets={mockTimesheets}
        initialMonday={new Date('2026-10-12T00:00:00')}
      />,
    );

    // Grid container
    expect(html).toContain('ess-timesheets-grid-table');
    expect(html).toContain('Project &amp; Task');
    expect(html).toContain('Total Logged');

    // Projects listed
    expect(html).toContain('BEZENT Core Suite');
    expect(html).toContain('HRMS Onboarding');

    // Status badges on entries
    expect(html).toContain('ess-timesheets-hour-pill--draft');
    expect(html).toContain('ess-timesheets-hour-pill--submitted');
    expect(html).toContain('ess-timesheets-hour-pill--approved');
  });

  it('renders draft submission action button when draft entries exist', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage
        initialLoading={false}
        initialTimesheets={mockTimesheets}
        initialMonday={new Date('2026-10-12T00:00:00')}
      />,
    );

    expect(html).toContain('Submit Timesheet (1 Draft)');
  });

  it('renders action buttons only for draft entries, and marks approved entries as Finalized', () => {
    const html = renderToStaticMarkup(
      <EssTimesheetsPage
        initialLoading={false}
        initialTimesheets={mockTimesheets}
        initialMonday={new Date('2026-10-12T00:00:00')}
      />,
    );

    // Edit and Delete buttons for draft
    expect(html).toContain('aria-label="Edit Entry"');
    expect(html).toContain('aria-label="Delete Entry"');

    // Finalized label for submitted/approved entries
    expect(html).toContain('Finalized');
  });
});
