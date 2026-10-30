import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RecordsPage } from '../pages/RecordsPage';
import { RecordsTable } from '../components/RecordsTable';
import { RecordsFilterPanel, EMPTY_RECORDS_FILTER_STATE } from '../components/RecordsFilterPanel';
import { NewRecordModal } from '../components/NewRecordModal';
import type { EmployeeDocument } from '../../documents/api/documentsApi';

const samplePassport: EmployeeDocument = {
  id: 'edoc_1',
  employeeId: 'emp_001',
  employeeNumber: 'EMP-001',
  employeeName: 'Aarav Patel',
  departmentId: 'dept_eng',
  departmentName: 'Engineering',
  category: 'personal_identity',
  documentName: 'Passport',
  documentNumber: 'P12345678',
  status: 'verified',
  expiryDate: '2028-12-31',
  expiryState: 'valid',
  verificationRemarks: 'Verified against original copy',
  fileAvailable: false,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const sampleDegree: EmployeeDocument = {
  id: 'edoc_2',
  employeeId: 'emp_002',
  employeeNumber: 'EMP-002',
  employeeName: 'Diya Sharma',
  departmentId: 'dept_prod',
  departmentName: 'Product',
  category: 'education',
  documentName: 'Master Degree Certificate',
  documentNumber: 'DEG-9981',
  status: 'pending',
  expiryDate: null,
  expiryState: null,
  verificationRemarks: null,
  fileAvailable: false,
  createdAt: '2026-03-10T09:30:00.000Z',
  updatedAt: '2026-03-10T09:30:00.000Z',
};

const sampleExpiringVisa: EmployeeDocument = {
  id: 'edoc_3',
  employeeId: 'emp_003',
  employeeNumber: 'EMP-003',
  employeeName: 'Kavya Iyer',
  departmentId: 'dept_design',
  departmentName: 'Design',
  category: 'personal_identity',
  documentName: 'Work Visa',
  documentNumber: 'V-4567',
  status: 'under_review',
  expiryDate: '2026-11-05',
  expiryState: 'expiring',
  verificationRemarks: null,
  fileAvailable: false,
  createdAt: '2026-04-01T12:00:00.000Z',
  updatedAt: '2026-04-01T12:00:00.000Z',
};

describe('Workforce Records Page', () => {
  it('renders page header, title, and description matching Workforce standards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RecordsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Records');
    expect(html).toContain(
      'Access and manage employee records, documents, and employment history.',
    );
  });

  it('renders Export and Upload Record action buttons, omitting Import', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RecordsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Export');
    expect(html).toContain('Upload Record');
    expect(html).not.toContain('Import');
  });

  it('renders all 4 summary KPI cards with titles and descriptions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RecordsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Records');
    expect(html).toContain('Centralized employee records');

    expect(html).toContain('Pending Verification');
    expect(html).toContain('Awaiting administrative review');

    expect(html).toContain('Expiring Soon');
    expect(html).toContain('Expiring within 30 days');

    expect(html).toContain('Expired Records');
    expect(html).toContain('Past validity date');
  });

  it('renders search input with approved workforce placeholder', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RecordsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search employee name, ID, or document...');
    expect(html).toContain('Filters');
  });
});

describe('RecordsTable Component', () => {
  it('renders all approved table column headers', () => {
    const html = renderToStaticMarkup(
      <RecordsTable
        status="ready"
        documents={[samplePassport, sampleDegree]}
        onRetry={vi.fn()}
        onView={vi.fn()}
        onOpenEmployee={vi.fn()}
      />,
    );

    expect(html).toContain('Record / Document Name');
    expect(html).toContain('Employee');
    expect(html).toContain('Category');
    expect(html).toContain('Department');
    expect(html).toContain('Uploaded Date');
    expect(html).toContain('Expiry Date');
    expect(html).toContain('Verification Status');
    expect(html).toContain('Actions');
  });

  it('renders document records with badges, employee metadata, and actions', () => {
    const html = renderToStaticMarkup(
      <RecordsTable
        status="ready"
        documents={[samplePassport, sampleDegree, sampleExpiringVisa]}
        onRetry={vi.fn()}
        onView={vi.fn()}
        onOpenEmployee={vi.fn()}
      />,
    );

    expect(html).toContain('Aarav Patel');
    expect(html).toContain('EMP-001');
    expect(html).toContain('Passport');
    expect(html).toContain('P12345678');
    expect(html).toContain('Engineering');
    expect(html).toContain('Personal &amp; Identity');
    expect(html).toContain('Verified');

    expect(html).toContain('Diya Sharma');
    expect(html).toContain('EMP-002');
    expect(html).toContain('Master Degree Certificate');
    expect(html).toContain('DEG-9981');
    expect(html).toContain('Product');
    expect(html).toContain('Education');
    expect(html).toContain('Pending');

    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('Work Visa');
    expect(html).toContain('Expiring soon');
  });

  it('renders loading state when status is loading', () => {
    const html = renderToStaticMarkup(
      <RecordsTable
        status="loading"
        documents={[]}
        onRetry={vi.fn()}
        onView={vi.fn()}
        onOpenEmployee={vi.fn()}
      />,
    );

    expect(html).toContain('Loading employee records…');
  });

  it('renders error state with retry button when status is error', () => {
    const html = renderToStaticMarkup(
      <RecordsTable
        status="error"
        documents={[]}
        error="Database timeout fetching employee records"
        onRetry={vi.fn()}
        onView={vi.fn()}
        onOpenEmployee={vi.fn()}
      />,
    );

    expect(html).toContain('Employee records could not be loaded');
    expect(html).toContain('Database timeout fetching employee records');
    expect(html).toContain('Retry');
  });

  it('renders empty state when no records are present', () => {
    const html = renderToStaticMarkup(
      <RecordsTable
        status="ready"
        documents={[]}
        onRetry={vi.fn()}
        onView={vi.fn()}
        onOpenEmployee={vi.fn()}
      />,
    );

    expect(html).toContain('No employee records yet');
    expect(html).toContain('Employee documents and credentials across the organization');
  });
});

describe('RecordsFilterPanel and NewRecordModal', () => {
  it('renders filter panel fields when open', () => {
    const html = renderToStaticMarkup(
      <RecordsFilterPanel
        isOpen={true}
        onClose={vi.fn()}
        appliedFilters={EMPTY_RECORDS_FILTER_STATE}
        onApply={vi.fn()}
        masters={{
          company: { id: 'comp_1', name: 'Bezent Tech', code: 'BT' },
          departments: [{ id: 'dept_eng', name: 'Engineering', code: 'ENG' }],
          locations: [],
          designations: [],
        }}
      />,
    );

    expect(html).toContain('Filter Records');
    expect(html).toContain('Record Category');
    expect(html).toContain('Verification Status');
    expect(html).toContain('Lifecycle View');
    expect(html).toContain('Department');
    expect(html).toContain('Engineering');
    expect(html).toContain('Apply Filters');
    expect(html).toContain('Clear');
  });

  it('renders NewRecordModal with input fields and compliance notice', () => {
    const html = renderToStaticMarkup(
      <NewRecordModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    expect(html).toContain('Upload / Register Record');
    expect(html).toContain('Employee Record Registration');
    expect(html).toContain('Employee');
    expect(html).toContain('Record Category');
    expect(html).toContain('Document / Record Name');
    expect(html).toContain('Document Number / Ref');
    expect(html).toContain('Expiry Date');
    expect(html).toContain('Save Record');
  });
});
