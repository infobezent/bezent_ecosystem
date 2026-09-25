import { describe, it, expect, vi, afterEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Navigate, matchRoutes } from 'react-router-dom';
import { hrmsNavigation } from '../../navigation';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import { EmployeeDirectoryPage } from '../pages/EmployeeDirectoryPage';
import { EmployeeProfilePage } from '../pages/EmployeeProfilePage';
import { EmployeeDirectoryTable } from '../components/EmployeeDirectoryTable';
import { EmployeeProfileView } from '../components/EmployeeProfileView';
import { EmployeeAdministrationPage } from '../../employee-administration';
import { EmployeeRegistrationPage } from '../../onboarding';
import { ModulePlaceholder } from '../../pages/ModulePlaceholder';
import {
  EmployeesApiError,
  fetchEmployee,
  fetchEmployees,
  type EmployeeRecord,
} from '../api/employeesApi';
import { EMPLOYEES_PATH, employeeProfilePath } from '../model/employeeModel';

const noop = () => {};

const kavya: EmployeeRecord = {
  id: 'emp_demo_003',
  employeeNumber: 'EMP-0003',
  firstName: 'Kavya',
  lastName: 'Iyer',
  fullName: 'Kavya Iyer',
  email: 'kavya.iyer@bezent-demo.example',
  phone: null,
  departmentId: 'dept_prod_01',
  departmentName: 'Product',
  designationId: 'desig_pm_01',
  designationName: 'Product Manager',
  locationId: 'loc_chn_01',
  locationName: 'Chennai (HQ)',
  reportingManagerId: 'emp_demo_002',
  reportingManagerName: 'Arjun Mehta',
  joiningDate: '2026-06-01',
  probationEndDate: '2026-12-01',
  confirmationDate: null,
  lastWorkingDate: null,
  employmentType: 'full_time',
  employmentStatus: 'probation',
};

const arjun: EmployeeRecord = {
  ...kavya,
  id: 'emp_demo_002',
  employeeNumber: 'EMP-0002',
  firstName: 'Arjun',
  lastName: 'Mehta',
  fullName: 'Arjun Mehta',
  phone: '+91 98450 00002',
  departmentName: 'Engineering',
  designationName: 'Software Engineer',
  locationName: 'Bengaluru',
  reportingManagerId: 'emp_demo_001',
  reportingManagerName: 'Lakshmi Narayanan',
  joiningDate: '2024-01-15',
  probationEndDate: '2024-07-15',
  confirmationDate: '2024-07-15',
  employmentStatus: 'active',
};

/** Collects elements from a (hook-free) component's rendered element tree. */
function findElements(node: ReactNode, predicate: (el: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown>>;
  // Walk every element-valued prop (children, and slots like PageHeader `breadcrumbs`).
  const nested = Object.values(el.props).flatMap((value) =>
    findElements(value as ReactNode, predicate),
  );
  return [...(predicate(el) ? [el] : []), ...nested];
}

function clickableWithText(tree: ReactNode, text: string) {
  const [el] = findElements(
    tree,
    (candidate) =>
      typeof (candidate.props as { onClick?: unknown }).onClick === 'function' &&
      (candidate.props as { children?: unknown }).children === text,
  );
  expect(el, `clickable "${text}"`).toBeDefined();
  return el!.props as { onClick: () => void };
}

function routeFor(pathname: string) {
  const matches = matchRoutes(hrmsRoutes, pathname);
  expect(matches, pathname).not.toBeNull();
  const leaf = matches![matches!.length - 1]!;
  return { route: leaf.route, params: leaf.params };
}

function renderDirectory() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EmployeeDirectoryPage />
    </MemoryRouter>,
  );
}

describe('Administration navigation', () => {
  it('contains Employees, Employee Administration, Onboarding, Documents — in order', () => {
    const administration = hrmsNavigation.destinations.find((d) => d.id === 'administration');
    expect(administration?.children?.map((c) => [c.id, c.label])).toEqual([
      ['employees', 'Employees'],
      ['employee-administration', 'Employee Administration'],
      ['onboarding', 'Onboarding'],
      ['documents', 'Documents'],
    ]);
  });
});

describe('HRMS routing for Administration', () => {
  it('Administration → Employees renders the Employee Directory', () => {
    expect(routeFor('/hrms/administration/employees').route.element).toEqual(
      <EmployeeDirectoryPage />,
    );
  });

  it('direct URL to an employee resolves the canonical Employee Profile with its id', () => {
    const { route, params } = routeFor('/hrms/administration/employees/emp_demo_003');
    expect(route.element).toEqual(<EmployeeProfilePage />);
    expect(params.employeeId).toBe('emp_demo_003');
    expect(employeeProfilePath('emp_demo_003')).toBe('/hrms/administration/employees/emp_demo_003');
  });

  it('the Administration group and the Employees shortcut both land on the one Directory', () => {
    expect(routeFor('/hrms/administration').route.element).toEqual(
      <Navigate to={EMPLOYEES_PATH} replace />,
    );
    expect(routeFor('/hrms/employees').route.element).toEqual(
      <Navigate to={EMPLOYEES_PATH} replace />,
    );
  });

  it('keeps Employee Administration, Onboarding and Documents routes unchanged', () => {
    expect(routeFor('/hrms/administration/employee-administration').route.element).toEqual(
      <EmployeeAdministrationPage />,
    );
    const onboarding = routeFor('/hrms/administration/onboarding').route;
    expect(onboarding.element).toEqual(<EmployeeRegistrationPage />);
    expect(onboarding.handle).toEqual({ workspaceVariant: 'flush' });
    expect((routeFor('/hrms/administration/documents').route.element as ReactElement).type).toBe(
      ModulePlaceholder,
    );
  });
});

describe('Employees Directory page', () => {
  it('renders header, description, search, filters and a loading state', () => {
    const html = renderDirectory();
    expect(html).toContain('Employees');
    expect(html).toContain('View and manage employee records across your organization.');
    expect(html).toContain('Search employees...');
    expect(html).toContain('All departments');
    expect(html).toContain('All locations');
    expect(html).toContain('All statuses');
    expect(html).toContain('Loading employees');
  });

  it('contains no onboarding content and no Employee Administration action queue', () => {
    const html = renderDirectory();
    for (const text of [
      'Add New Hire',
      'View Drafts',
      'Preboarding',
      'Onboarding',
      'New Employee Action',
      'All Actions',
      'Job Changes',
      'Employee actions',
    ]) {
      expect(html).not.toContain(text);
    }
  });
});

describe('EmployeeDirectoryTable', () => {
  it('renders real employee records with every directory column', () => {
    const html = renderToStaticMarkup(
      <EmployeeDirectoryTable
        status="ready"
        employees={[kavya, arjun]}
        onRetry={noop}
        onOpenEmployee={noop}
      />,
    );
    for (const header of [
      'Employee',
      'Employee ID',
      'Department',
      'Designation',
      'Location',
      'Reporting Manager',
      'Employment Type',
      'Joining Date',
      'Status',
    ]) {
      expect(html).toContain(`>${header}<`);
    }
    for (const value of [
      'Kavya Iyer',
      'EMP-0003',
      'Product',
      'Product Manager',
      'Chennai (HQ)',
      'Arjun Mehta',
      'Full Time',
      'Jun 1, 2026',
      'Probation',
      'Active',
    ]) {
      expect(html).toContain(value);
    }
  });

  it('employee name and ID open the canonical profile', () => {
    const onOpenEmployee = vi.fn();
    const tree = EmployeeDirectoryTable({
      status: 'ready',
      employees: [kavya],
      onRetry: noop,
      onOpenEmployee,
    });

    clickableWithText(tree, 'Kavya Iyer').onClick();
    clickableWithText(tree, 'EMP-0003').onClick();
    expect(onOpenEmployee).toHaveBeenCalledTimes(2);
    expect(onOpenEmployee).toHaveBeenNthCalledWith(1, 'emp_demo_003');
    expect(onOpenEmployee).toHaveBeenNthCalledWith(2, 'emp_demo_003');
  });

  it('shows loading, error with retry, and empty states', () => {
    const render = (props: Partial<Parameters<typeof EmployeeDirectoryTable>[0]>) =>
      renderToStaticMarkup(
        <EmployeeDirectoryTable
          status="ready"
          employees={[]}
          onRetry={noop}
          onOpenEmployee={noop}
          {...props}
        />,
      );

    expect(render({ status: 'loading' })).toContain('Loading employees');
    const error = render({ status: 'error', error: 'Database service is unavailable' });
    expect(error).toContain('Employees could not be loaded');
    expect(error).toContain('Database service is unavailable');
    expect(error).toContain('Retry');
    expect(render({})).toContain('No employees yet');
    expect(render({ filtered: true })).toContain('No matching employees');
  });
});

describe('Employees API', () => {
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

  it('sends search, filters and paging to the real list endpoint', async () => {
    const urls = mockFetch(200, { data: [kavya], pagination: { page: 2 } });
    const res = await fetchEmployees({
      search: 'Kavya',
      departmentId: 'dept_prod_01',
      locationId: 'loc_chn_01',
      employmentStatus: 'probation',
      page: 2,
      pageSize: 25,
    });
    expect(res.data[0]!.id).toBe('emp_demo_003');
    expect(urls[0]).toContain('/hrms/employees?');
    for (const part of [
      'search=Kavya',
      'departmentId=dept_prod_01',
      'locationId=loc_chn_01',
      'employmentStatus=probation',
      'page=2',
    ]) {
      expect(urls[0]).toContain(part);
    }
  });

  it('omits empty filters', async () => {
    const urls = mockFetch(200, { data: [], pagination: {} });
    await fetchEmployees({ search: '', departmentId: '' });
    expect(urls[0]!.endsWith('/hrms/employees')).toBe(true);
  });

  it('loads the requested employee for the profile', async () => {
    const urls = mockFetch(200, { data: kavya });
    const employee = await fetchEmployee('emp_demo_003');
    expect(urls[0]).toMatch(/\/hrms\/employees\/emp_demo_003$/);
    expect(employee.fullName).toBe('Kavya Iyer');
  });

  it('surfaces not-found and server errors instead of falling back', async () => {
    mockFetch(404, { error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    const notFound = await fetchEmployee('emp_other_company').catch((err: unknown) => err);
    expect(notFound).toBeInstanceOf(EmployeesApiError);
    expect((notFound as EmployeesApiError).status).toBe(404);

    mockFetch(500, { error: { code: 'DATABASE_UNAVAILABLE', message: 'Database down' } });
    await expect(fetchEmployees()).rejects.toThrow('Database down');
  });
});

describe('Employee Profile', () => {
  it('route page starts by loading the employee', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/hrms/administration/employees/emp_demo_003']}>
        <EmployeeProfilePage />
      </MemoryRouter>,
    );
    expect(html).toContain('Loading employee');
  });

  it('shows header, overview and existing contact fields only', () => {
    const html = renderToStaticMarkup(
      <EmployeeProfileView employee={kavya} onBack={noop} onOpenEmployee={noop} />,
    );

    // Header
    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('EMP-0003 · Product Manager');
    expect(html).toContain('Probation');
    // Overview
    for (const label of [
      'Department',
      'Designation',
      'Location',
      'Reporting Manager',
      'Employment Type',
      'Joining Date',
      'Probation End Date',
    ]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain('Chennai (HQ)');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('Full Time');
    expect(html).toContain('Dec 1, 2026');
    // Not confirmed yet → no confirmation date; no phone on record → no phone row
    expect(html).not.toContain('Confirmation Date');
    expect(html).not.toContain('>Phone<');
    expect(html).toContain('kavya.iyer@bezent-demo.example');
    // No Employee Administration action forms inside the profile
    expect(html).not.toContain('New Employee Action');
    expect(html).not.toContain('Action Type');
  });

  it('shows confirmation date and phone when they exist', () => {
    const html = renderToStaticMarkup(
      <EmployeeProfileView employee={arjun} onBack={noop} onOpenEmployee={noop} />,
    );
    expect(html).toContain('Confirmation Date');
    expect(html).toContain('Jul 15, 2024');
    expect(html).toContain('+91 98450 00002');
  });

  it('reporting manager and back link navigate to canonical employee routes', () => {
    const onOpenEmployee = vi.fn();
    const onBack = vi.fn();
    const tree = EmployeeProfileView({ employee: kavya, onBack, onOpenEmployee });

    clickableWithText(tree, 'Arjun Mehta').onClick();
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_002');
    clickableWithText(tree, 'Employees').onClick();
    expect(onBack).toHaveBeenCalled();
  });
});
