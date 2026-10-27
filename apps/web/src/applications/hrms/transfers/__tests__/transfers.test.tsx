import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TransfersPage } from '../pages/TransfersPage';
import { TransfersTable } from '../components/TransfersTable';
import {
  TransfersFilterPanel,
  countActiveTransfersFilters,
  EMPTY_TRANSFERS_FILTER_STATE,
  type TransfersFilterState,
} from '../components/TransfersFilterPanel';
import type {
  EmployeeActionListItem,
  OrganizationMasters,
} from '../../employee-administration/api/employeeAdministrationApi';

const noop = () => {};

const masters: OrganizationMasters = {
  company: { id: 'comp_demo_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_eng_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_prod_01', name: 'Product', code: 'PROD' },
    { id: 'dept_sales_01', name: 'Sales', code: 'SALES' },
  ],
  designations: [
    { id: 'desig_se_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_pm_01', name: 'Product Manager', code: 'PM' },
  ],
  locations: [
    { id: 'loc_chn_01', name: 'Chennai (HQ)', code: 'CHN' },
    { id: 'loc_blr_01', name: 'Bengaluru', code: 'BLR' },
    { id: 'loc_cbe_01', name: 'Coimbatore', code: 'CBE' },
  ],
};

const sampleLocationTransfer: EmployeeActionListItem = {
  id: 'ea_loc_01',
  employeeId: 'emp_001',
  employeeNumber: 'EMP-0001',
  employeeName: 'Kavya Iyer',
  actionType: 'location_transfer',
  category: 'transfer',
  status: 'pending',
  effectiveDate: '2026-11-01',
  reason: 'Transferred to Coimbatore branch',
  changes: [
    {
      field: 'locationId',
      from: 'loc_chn_01',
      fromLabel: 'Chennai (HQ)',
      to: 'loc_cbe_01',
      toLabel: 'Coimbatore',
    },
  ],
  requestDate: null,
  requestedBy: 'HR Admin',
  cancellationReason: null,
  appliedAt: null,
  cancelledAt: null,
  version: 1,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
};

const sampleDepartmentTransfer: EmployeeActionListItem = {
  id: 'ea_dept_01',
  employeeId: 'emp_002',
  employeeNumber: 'EMP-0002',
  employeeName: 'Arjun Mehta',
  actionType: 'department_change',
  category: 'job_changes',
  status: 'applied',
  effectiveDate: '2026-10-15',
  reason: 'Internal movement to Product Management',
  changes: [
    {
      field: 'departmentId',
      from: 'dept_eng_01',
      fromLabel: 'Engineering',
      to: 'dept_prod_01',
      toLabel: 'Product',
    },
    {
      field: 'reportingManagerId',
      from: 'emp_005',
      fromLabel: 'Deepa Rao',
      to: 'emp_008',
      toLabel: 'Suresh Kumar',
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

describe('TransfersPage', () => {
  it('renders PageHeader with required title, description, and primary action', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TransfersPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Transfers');
    expect(html).toContain('Manage employee department, location, and reporting changes.');
    expect(html).toContain('Initiate Transfer');
    expect(html).toContain('Export');
    expect(html).not.toContain('Import');
  });

  it('renders the 4 KPI Summary Cards using Workforce tinted cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TransfersPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Transfers');
    expect(html).toContain('Pending Approval');
    expect(html).toContain('Upcoming Transfers');
    expect(html).toContain('Completed Transfers');
    expect(html).toContain('bezent-kpi-card--blue');
    expect(html).toContain('bezent-kpi-card--amber');
    expect(html).toContain('bezent-kpi-card--purple');
    expect(html).toContain('bezent-kpi-card--green');
  });

  it('renders search input and toolbar controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TransfersPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by employee name or ID...');
    expect(html).toContain('Filters');
    expect(html).toContain('Reset');
  });
});

describe('TransfersTable', () => {
  it('renders column headers correctly', () => {
    const html = renderToStaticMarkup(
      <TransfersTable
        status="ready"
        items={[sampleLocationTransfer]}
        today="2026-10-26"
        onRetry={noop}
        onOpenAction={noop}
        onApplyAction={noop}
        onCancelAction={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('Employee');
    expect(html).toContain('Employee ID');
    expect(html).toContain('Current → New Department');
    expect(html).toContain('Current → New Location');
    expect(html).toContain('Effective Date');
    expect(html).toContain('Status');
    expect(html).toContain('Actions');
  });

  it('renders location transfer row with Current → New Location and employee details', () => {
    const html = renderToStaticMarkup(
      <TransfersTable
        status="ready"
        items={[sampleLocationTransfer]}
        today="2026-10-26"
        onRetry={noop}
        onOpenAction={noop}
        onApplyAction={noop}
        onCancelAction={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('EMP-0001');
    expect(html).toContain('Location Transfer');
    expect(html).toContain('Chennai (HQ)');
    expect(html).toContain('Coimbatore');
    expect(html).toContain('Pending');
  });

  it('renders department transfer row with Current → New Department and reporting manager change', () => {
    const html = renderToStaticMarkup(
      <TransfersTable
        status="ready"
        items={[sampleDepartmentTransfer]}
        today="2026-10-26"
        onRetry={noop}
        onOpenAction={noop}
        onApplyAction={noop}
        onCancelAction={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('EMP-0002');
    expect(html).toContain('Department Change');
    expect(html).toContain('Engineering');
    expect(html).toContain('Product');
    expect(html).toContain('Mgr: Suresh Kumar');
    expect(html).toContain('Applied');
  });

  it('renders empty state when items list is empty', () => {
    const html = renderToStaticMarkup(
      <TransfersTable
        status="ready"
        items={[]}
        filtered={false}
        today="2026-10-26"
        onRetry={noop}
        onOpenAction={noop}
        onApplyAction={noop}
        onCancelAction={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('No Transfers Found');
  });

  it('renders filtered empty state when search/filter returns zero rows', () => {
    const html = renderToStaticMarkup(
      <TransfersTable
        status="ready"
        items={[]}
        filtered={true}
        today="2026-10-26"
        onRetry={noop}
        onOpenAction={noop}
        onApplyAction={noop}
        onCancelAction={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('No matching transfer records');
  });
});

describe('TransfersFilterPanel', () => {
  it('renders filters for status, transfer type, department, and effective date range', () => {
    const html = renderToStaticMarkup(
      <TransfersFilterPanel
        isOpen={true}
        onClose={noop}
        appliedFilters={EMPTY_TRANSFERS_FILTER_STATE}
        onApply={noop}
        masters={masters}
      />,
    );

    expect(html).toContain('Filter Transfers');
    expect(html).toContain('Transfer Status');
    expect(html).toContain('Transfer Type');
    expect(html).toContain('Department');
    expect(html).toContain('Effective Date Range');
    expect(html).toContain('Engineering');
    expect(html).toContain('Product');
    expect(html).toContain('Apply Filters');
    expect(html).toContain('Clear all');
  });

  it('counts active filters correctly', () => {
    expect(countActiveTransfersFilters(EMPTY_TRANSFERS_FILTER_STATE)).toBe(0);

    const filtered: TransfersFilterState = {
      status: 'pending',
      actionType: 'location_transfer',
      departmentId: 'dept_eng_01',
      effectiveDateFrom: '2026-10-01',
      effectiveDateTo: '2026-10-31',
    };
    expect(countActiveTransfersFilters(filtered)).toBe(4);
  });
});
