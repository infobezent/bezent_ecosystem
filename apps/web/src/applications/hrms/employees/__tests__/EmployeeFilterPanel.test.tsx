import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EmployeeFilterPanel,
  EMPTY_FILTER_STATE,
  countActiveFilters,
  type EmployeeFilterState,
} from '../components/EmployeeFilterPanel';
import type { OrganizationMasters } from '../../api/organizationMastersApi';

const mockMasters: OrganizationMasters = {
  company: { id: 'comp-1', name: 'Acme Corp', code: 'ACME' },
  departments: [
    { id: 'dept-1', name: 'Engineering', code: 'ENG' },
    { id: 'dept-2', name: 'Product', code: 'PROD' },
    { id: 'dept-3', name: 'Design', code: 'DSG' },
  ],
  designations: [{ id: 'desig-1', name: 'Software Engineer', code: 'SWE' }],
  locations: [
    { id: 'loc-1', name: 'Chennai (HQ)', code: 'CHN' },
    { id: 'loc-2', name: 'Bangalore', code: 'BLR' },
  ],
};

describe('Compact EmployeeFilterPanel and Filter Utilities', () => {
  it('correctly counts active filters', () => {
    expect(countActiveFilters(EMPTY_FILTER_STATE)).toBe(0);

    const withDept: EmployeeFilterState = {
      ...EMPTY_FILTER_STATE,
      departmentId: 'dept-1',
    };
    expect(countActiveFilters(withDept)).toBe(1);

    const withMultiple: EmployeeFilterState = {
      ...EMPTY_FILTER_STATE,
      departmentId: 'dept-1',
      locationId: 'loc-1',
      employmentType: 'contract',
      employmentStatus: 'active',
      joiningDateFrom: '2026-01-01',
    };
    expect(countActiveFilters(withMultiple)).toBe(5);
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <EmployeeFilterPanel
        isOpen={false}
        onClose={vi.fn()}
        appliedFilters={EMPTY_FILTER_STATE}
        onApply={vi.fn()}
        masters={mockMasters}
      />,
    );
    expect(html).toBe('');
  });

  it('renders compact 2-column form elements and footer actions when open', () => {
    const html = renderToStaticMarkup(
      <EmployeeFilterPanel
        isOpen={true}
        onClose={vi.fn()}
        appliedFilters={EMPTY_FILTER_STATE}
        onApply={vi.fn()}
        masters={mockMasters}
      />,
    );

    // Title and close
    expect(html).toContain('Filter Employees');
    expect(html).toContain('Close filter panel');

    // 2-Column form fields
    expect(html).toContain('Department');
    expect(html).toContain('All departments');
    expect(html).toContain('Engineering');
    expect(html).toContain('Product');
    expect(html).toContain('Design');

    expect(html).toContain('Location');
    expect(html).toContain('All locations');
    expect(html).toContain('Chennai (HQ)');
    expect(html).toContain('Bangalore');

    expect(html).toContain('Employment Type');
    expect(html).toContain('All types');
    expect(html).toContain('Full Time');
    expect(html).toContain('Contract');

    expect(html).toContain('Status');
    expect(html).toContain('All statuses');
    expect(html).toContain('Active');
    expect(html).toContain('Terminated');

    expect(html).toContain('Joining Date');

    // Footer actions
    expect(html).toContain('Clear all');
    expect(html).toContain('Cancel');
    expect(html).toContain('Apply Filters');

    // Explicitly verifies removal of oversized category sidebar and quick filter pills
    expect(html).not.toContain('Quick Filters');
    expect(html).not.toContain('Active Employees');
    expect(html).not.toContain('Inactive Employees');
    expect(html).not.toContain('New Joiners (This Month)');
    expect(html).not.toContain('Contract Employees');
  });

  it('renders selected department and status appropriately in form controls', () => {
    const filters: EmployeeFilterState = {
      ...EMPTY_FILTER_STATE,
      departmentId: 'dept-1',
      employmentStatus: 'active',
    };

    const html = renderToStaticMarkup(
      <EmployeeFilterPanel
        isOpen={true}
        onClose={vi.fn()}
        appliedFilters={filters}
        onApply={vi.fn()}
        masters={mockMasters}
      />,
    );

    expect(html).toContain('value="dept-1" selected=""');
    expect(html).toContain('value="active" selected=""');
  });
});
