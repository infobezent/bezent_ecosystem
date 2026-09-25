import { describe, it, expect, vi, afterEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DocumentsPage } from '../pages/DocumentsPage';
import { DocumentsTable } from '../components/DocumentsTable';
import { DocumentDetail } from '../components/DocumentDetail';
import {
  DocumentsApiError,
  fetchDocument,
  fetchDocuments,
  type EmployeeDocument,
} from '../api/documentsApi';
import { CATEGORY_LABELS, DOCUMENT_TABS, STATUS_LABELS } from '../model/documentModel';

const noop = () => {};

const passport: EmployeeDocument = {
  id: 'edoc_1',
  employeeId: 'emp_demo_003',
  employeeNumber: 'EMP-0003',
  employeeName: 'Kavya Iyer',
  departmentId: 'dept_prod_01',
  departmentName: 'Product',
  category: 'personal_identity',
  documentName: 'Passport',
  documentNumber: 'P1234567',
  status: 'pending',
  expiryDate: '2026-10-10',
  expiryState: 'expiring',
  verificationRemarks: null,
  fileAvailable: false,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

const degree: EmployeeDocument = {
  ...passport,
  id: 'edoc_2',
  category: 'education',
  documentName: 'Degree Certificate',
  documentNumber: null,
  status: 'verified',
  expiryDate: null,
  expiryState: null,
  verificationRemarks: 'Matches original',
};

function findElements(node: ReactNode, predicate: (el: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown>>;
  const nested = Object.values(el.props).flatMap((value) =>
    findElements(value as ReactNode, predicate),
  );
  return [...(predicate(el) ? [el] : []), ...nested];
}

function clickable(tree: ReactNode, text: string) {
  const [el] = findElements(
    tree,
    (candidate) =>
      typeof (candidate.props as { onClick?: unknown }).onClick === 'function' &&
      (candidate.props as { children?: unknown }).children === text,
  );
  expect(el, `clickable "${text}"`).toBeDefined();
  return el!.props as { onClick: () => void };
}

describe('Documents page', () => {
  it('renders header, description, views, search and filters, then loads from the API', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>,
    );
    expect(html).toContain('Documents');
    expect(html).toContain('Manage, verify and monitor employee documents.');
    for (const tab of ['All Documents', 'Pending Review', 'Expiring', 'Expired']) {
      expect(html).toContain(tab);
    }
    expect(html).toContain('Search employee or document...');
    expect(html).toContain('All categories');
    expect(html).toContain('All departments');
    expect(html).toContain('All statuses');
    expect(html).toContain('Loading documents');
    // No Requirements management in this milestone, no fake counts before data
    expect(html).not.toContain('Requirements');
    expect(html).not.toContain('bezent-tab__count');
  });

  it('uses exactly the approved categories, statuses and views', () => {
    expect(Object.values(CATEGORY_LABELS)).toEqual([
      'Personal & Identity',
      'Address Proof',
      'Education',
      'Previous Employment',
      'Bank & Payroll',
      'Tax & Other Documents',
    ]);
    expect(Object.values(STATUS_LABELS)).toEqual([
      'Pending',
      'Under Review',
      'Verified',
      'Rejected',
      'Resubmission Required',
      'Expired',
    ]);
    expect(DOCUMENT_TABS.map((tab) => tab.id)).toEqual([
      'all',
      'pending_review',
      'expiring',
      'expired',
    ]);
  });
});

describe('DocumentsTable', () => {
  it('renders real documents with the main-table columns', () => {
    const html = renderToStaticMarkup(
      <DocumentsTable
        status="ready"
        documents={[passport, degree]}
        onRetry={noop}
        onView={noop}
        onOpenEmployee={noop}
      />,
    );
    for (const header of [
      'Employee',
      'Document',
      'Category',
      'Department',
      'Expiry',
      'Status',
      'Updated',
      'Actions',
    ]) {
      expect(html).toContain(`>${header}<`);
    }
    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('Passport');
    expect(html).toContain('Personal &amp; Identity');
    expect(html).toContain('Product');
    expect(html).toContain('Oct 10, 2026');
    expect(html).toContain('Expiring soon');
    expect(html).toContain('Pending');
    expect(html).toContain('Verified');
  });

  it('never offers preview or download without a stored file', () => {
    const html = renderToStaticMarkup(
      <DocumentsTable
        status="ready"
        documents={[passport]}
        onRetry={noop}
        onView={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(html).not.toContain('Preview');
    expect(html).not.toContain('Download');
  });

  it('View opens the document and the employee name opens the profile', () => {
    const onView = vi.fn();
    const onOpenEmployee = vi.fn();
    const tree = DocumentsTable({
      status: 'ready',
      documents: [passport],
      onRetry: noop,
      onView,
      onOpenEmployee,
    });
    clickable(tree, 'View').onClick();
    clickable(tree, 'Kavya Iyer').onClick();
    expect(onView).toHaveBeenCalledWith('edoc_1');
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_003');
  });

  it('shows loading, error, empty and no-results states', () => {
    const render = (props: Partial<Parameters<typeof DocumentsTable>[0]>) =>
      renderToStaticMarkup(
        <DocumentsTable
          status="ready"
          documents={[]}
          onRetry={noop}
          onView={noop}
          onOpenEmployee={noop}
          {...props}
        />,
      );
    expect(render({ status: 'loading' })).toContain('Loading documents');
    const error = render({ status: 'error', error: 'Database service is unavailable' });
    expect(error).toContain('Documents could not be loaded');
    expect(error).toContain('Database service is unavailable');
    expect(error).toContain('Retry');
    expect(render({})).toContain('No employee documents yet');
    expect(render({ filtered: true })).toContain('No matching documents');
  });
});

describe('DocumentDetail', () => {
  it('shows metadata and states that no file is stored', () => {
    const html = renderToStaticMarkup(<DocumentDetail document={degree} />);
    expect(html).toContain('No file stored');
    expect(html).toContain('Degree Certificate');
    expect(html).toContain('Education');
    expect(html).toContain('No expiry');
    expect(html).toContain('Matches original');
    expect(html).not.toContain('Preview');
    expect(html).not.toContain('Download');
  });
});

describe('Documents API client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(status: number, body: unknown) {
    const urls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      urls.push(url);
      return Promise.resolve({ ok: status < 400, status, json: async () => body });
    });
    return urls;
  }

  it('sends view, search and filters to the real list endpoint', async () => {
    const urls = mockFetch(200, {
      data: [passport],
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
      counts: { all: 1, pending_review: 1, expiring: 1, expired: 0 },
    });
    const res = await fetchDocuments({
      view: 'expiring',
      search: 'pass',
      category: 'personal_identity',
      status: 'pending',
      departmentId: 'dept_prod_01',
      page: 1,
      pageSize: 25,
    });
    expect(res.counts.expiring).toBe(1);
    for (const part of [
      '/hrms/employee-documents?',
      'view=expiring',
      'search=pass',
      'category=personal_identity',
      'status=pending',
      'departmentId=dept_prod_01',
    ]) {
      expect(urls[0]).toContain(part);
    }
  });

  it('loads one document and surfaces errors instead of falling back', async () => {
    const urls = mockFetch(200, { data: passport });
    expect((await fetchDocument('edoc_1')).documentName).toBe('Passport');
    expect(urls[0]).toMatch(/\/hrms\/employee-documents\/edoc_1$/);

    mockFetch(500, { error: { code: 'DATABASE_UNAVAILABLE', message: 'Database down' } });
    const error = await fetchDocuments().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(DocumentsApiError);
    expect((error as DocumentsApiError).message).toBe('Database down');
  });
});
