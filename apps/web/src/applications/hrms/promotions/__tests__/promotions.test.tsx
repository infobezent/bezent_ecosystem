import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PromotionsPage } from '../pages/PromotionsPage';
import { PromotionsTable } from '../components/PromotionsTable';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';

const samplePromotionItem: EmployeeActionListItem = {
  id: 'act_promo_001',
  employeeId: 'emp_001',
  employeeNumber: 'EMP-0001',
  employeeName: 'Priya Sharma',
  actionType: 'designation_change',
  category: 'job_changes',
  status: 'pending',
  effectiveDate: '2026-11-01',
  reason: 'Annual performance promotion to Lead Engineer',
  changes: [
    {
      field: 'designationId',
      from: 'desig_01',
      fromLabel: 'Senior Software Engineer',
      to: 'desig_02',
      toLabel: 'Lead Engineer',
    },
  ],
  requestDate: null,
  requestedBy: 'Engineering Director',
  cancellationReason: null,
  appliedAt: null,
  cancelledAt: null,
  version: 1,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
};

const sampleDeptPromotionItem: EmployeeActionListItem = {
  id: 'act_promo_002',
  employeeId: 'emp_002',
  employeeNumber: 'EMP-0002',
  employeeName: 'Rahul Verma',
  actionType: 'department_change',
  category: 'job_changes',
  status: 'applied',
  effectiveDate: '2026-10-15',
  reason: 'Transferred and promoted to Product Management Lead',
  changes: [
    {
      field: 'departmentId',
      from: 'dept_01',
      fromLabel: 'Engineering',
      to: 'dept_02',
      toLabel: 'Product Management',
    },
    {
      field: 'designationId',
      from: 'desig_03',
      fromLabel: 'Senior QA Specialist',
      to: 'desig_04',
      toLabel: 'Product Lead',
    },
  ],
  requestDate: null,
  requestedBy: 'HR Admin',
  cancellationReason: null,
  appliedAt: '2026-10-15T09:00:00Z',
  cancelledAt: null,
  version: 2,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-15T09:00:00Z',
};

describe('PromotionsPage', () => {
  it('renders PageHeader with required title, description, and primary action', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromotionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Promotions');
    expect(html).toContain('Manage employee promotions, role changes, and career progression.');
    expect(html).toContain('Initiate Promotion');
    expect(html).toContain('Export');
    expect(html).not.toContain('Import');
  });

  it('renders the 4 KPI Summary Cards using Workforce tinted cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromotionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Promotions');
    expect(html).toContain('Pending Approval');
    expect(html).toContain('Upcoming Promotions');
    expect(html).toContain('Completed Promotions');
    expect(html).toContain('bezent-kpi-card--blue');
    expect(html).toContain('bezent-kpi-card--amber');
    expect(html).toContain('bezent-kpi-card--purple');
    expect(html).toContain('bezent-kpi-card--green');
  });

  it('renders search input and toolbar controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromotionsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by employee name or ID...');
    expect(html).toContain('Filters');
    expect(html).toContain('Reset');
  });
});

describe('PromotionsTable', () => {
  it('renders loading state cleanly', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
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

    expect(html).toContain('Loading promotion records…');
  });

  it('renders error state with retry button', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
        status="error"
        items={[]}
        error="Network timeout loading promotions"
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    expect(html).toContain('Promotions could not be loaded');
    expect(html).toContain('Network timeout loading promotions');
    expect(html).toContain('Retry');
  });

  it('renders empty state when no promotions exist', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
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

    expect(html).toContain('No Promotions Found');
  });

  it('renders empty state when filtered', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
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

    expect(html).toContain('No matching promotion records');
  });

  it('renders table headers matching Workforce specification', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
        status="ready"
        items={[samplePromotionItem]}
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
    expect(html).toContain('Current Role → Proposed Role');
    expect(html).toContain('Department');
    expect(html).toContain('Effective Date');
    expect(html).toContain('Status');
    expect(html).toContain('Actions');
  });

  it('renders promotion transition data with from/to labels and arrows', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
        status="ready"
        items={[samplePromotionItem, sampleDeptPromotionItem]}
        today="2026-10-26"
        onRetry={() => {}}
        onOpenAction={() => {}}
        onApplyAction={() => {}}
        onCancelAction={() => {}}
        onOpenEmployee={() => {}}
      />,
    );

    // Employee names and IDs
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('EMP-0001');
    expect(html).toContain('Rahul Verma');
    expect(html).toContain('EMP-0002');

    // Role transitions
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Lead Engineer');
    expect(html).toContain('Senior QA Specialist');
    expect(html).toContain('Product Lead');

    // Department transitions
    expect(html).toContain('Engineering');
    expect(html).toContain('Product Management');

    // Status badges
    expect(html).toContain('Pending');
    expect(html).toContain('Applied');
  });

  it('renders table meta titles and link styling without native button borders', () => {
    const html = renderToStaticMarkup(
      <PromotionsTable
        status="ready"
        items={[samplePromotionItem]}
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
    expect(html).toContain('bezent-transfer-transition');
    expect(html).toContain('bezent-transfer-from');
    expect(html).toContain('bezent-transfer-to');
  });
});
