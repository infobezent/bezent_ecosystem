import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OffboardingPage } from '../pages/OffboardingPage';
import { OffboardingTable } from '../components/OffboardingTable';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';

const sampleResignationItem: EmployeeActionListItem = {
  id: 'act_offb_001',
  employeeId: 'emp_001',
  employeeNumber: 'EMP-0001',
  employeeName: 'Ananya Deshmukh',
  actionType: 'resignation',
  category: 'separation',
  status: 'pending',
  effectiveDate: '2026-11-30',
  reason: 'Relocating to another city for personal reasons',
  changes: [
    {
      field: 'employmentStatus',
      from: 'active',
      fromLabel: 'Active',
      to: 'resigned',
      toLabel: 'Resigned',
    },
    {
      field: 'lastWorkingDate',
      from: null,
      fromLabel: null,
      to: '2026-11-30',
      toLabel: '2026-11-30',
    },
  ],
  requestDate: '2026-10-15',
  requestedBy: 'Ananya Deshmukh',
  cancellationReason: null,
  appliedAt: null,
  cancelledAt: null,
  version: 1,
  createdAt: '2026-10-15T09:00:00Z',
  updatedAt: '2026-10-15T09:00:00Z',
};

const sampleTerminationItem: EmployeeActionListItem = {
  id: 'act_offb_002',
  employeeId: 'emp_002',
  employeeNumber: 'EMP-0002',
  employeeName: 'Karthik Raja',
  actionType: 'termination',
  category: 'separation',
  status: 'applied',
  effectiveDate: '2026-10-10',
  reason: 'End of contractual service agreement',
  changes: [
    {
      field: 'employmentStatus',
      from: 'active',
      fromLabel: 'Active',
      to: 'terminated',
      toLabel: 'Terminated',
    },
    {
      field: 'lastWorkingDate',
      from: null,
      fromLabel: null,
      to: '2026-10-10',
      toLabel: '2026-10-10',
    },
  ],
  requestDate: '2026-09-10',
  requestedBy: 'HR Director',
  cancellationReason: null,
  appliedAt: '2026-10-10T17:00:00Z',
  cancelledAt: null,
  version: 2,
  createdAt: '2026-09-10T10:00:00Z',
  updatedAt: '2026-10-10T17:00:00Z',
};

describe('OffboardingPage', () => {
  it('renders PageHeader with required title, description, and primary action', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OffboardingPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Offboarding');
    expect(html).toContain(
      'Manage employee exits, notice periods, clearance, and exit formalities.',
    );
    expect(html).toContain('Initiate Offboarding');
    expect(html).toContain('Export');
    expect(html).not.toContain('Import');
  });

  it('renders the 4 KPI Summary Cards using Workforce tinted cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OffboardingPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Offboarding');
    expect(html).toContain('Pending Approval');
    expect(html).toContain('In Notice Period');
    expect(html).toContain('Completed Exits');
    expect(html).toContain('bezent-kpi-card--blue');
    expect(html).toContain('bezent-kpi-card--amber');
    expect(html).toContain('bezent-kpi-card--purple');
    expect(html).toContain('bezent-kpi-card--green');
  });

  it('renders search input and toolbar controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OffboardingPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by employee name or ID...');
    expect(html).toContain('Filters');
    expect(html).toContain('Reset');
  });
});

describe('OffboardingTable', () => {
  it('renders loading state cleanly', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="loading"
        items={[]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('Loading offboarding records…');
  });

  it('renders error state with retry button', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="error"
        items={[]}
        error="Network timeout loading offboarding records"
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('Offboarding records could not be loaded');
    expect(html).toContain('Network timeout loading offboarding records');
    expect(html).toContain('Retry');
  });

  it('renders empty state when no offboarding records exist', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="ready"
        items={[]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('No Offboarding Records');
  });

  it('renders empty state when filtered', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="ready"
        items={[]}
        filtered={true}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('No matching offboarding records');
  });

  it('renders table headers matching Workforce specification', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="ready"
        items={[sampleResignationItem]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('Employee');
    expect(html).toContain('Employee ID');
    expect(html).toContain('Exit Type');
    expect(html).toContain('Last Working Day');
    expect(html).toContain('Notice Status');
    expect(html).toContain('Status');
    expect(html).toContain('Actions');
  });

  it('renders resignation and termination exit records with notice status badges', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="ready"
        items={[sampleResignationItem, sampleTerminationItem]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    // Employee names and IDs
    expect(html).toContain('Ananya Deshmukh');
    expect(html).toContain('EMP-0001');
    expect(html).toContain('Karthik Raja');
    expect(html).toContain('EMP-0002');

    // Exit types
    expect(html).toContain('Resignation');
    expect(html).toContain('Termination');

    // Notice Status
    expect(html).toContain('Serving Notice');
    expect(html).toContain('Separated');

    // Overall Status
    expect(html).toContain('Pending');
    expect(html).toContain('Applied');
  });

  it('renders table meta titles and link styling without native button borders', () => {
    const html = renderToStaticMarkup(
      <OffboardingTable
        status="ready"
        items={[sampleResignationItem]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('bezent-table-meta-title');
    expect(html).toContain('bezent-table-meta-subtitle');
  });
});
