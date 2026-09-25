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
import { OnboardingPage } from '../../onboarding';
import { ModulePlaceholder } from '../../pages/ModulePlaceholder';
import {
  EmployeesApiError,
  fetchEmployee,
  fetchEmployeeProfile,
  fetchEmployees,
  type EmployeeProfile,
  type EmployeeRecord,
} from '../api/employeesApi';
import { EmploymentHistory } from '../components/EmploymentHistory';
import { PROFILE_TABS, type ProfileTabId } from '../components/EmployeeProfileView';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';
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
  sourceOfHire: null,
  noticePeriodDays: null,
  contractEndDate: null,
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
  if (!isValidElement(node)) {
    // Plain data props (e.g. `items: [{ label, value: <Button/> }]`) can hold elements too.
    if (node && typeof node === 'object') {
      return Object.values(node).flatMap((value) => findElements(value as ReactNode, predicate));
    }
    return [];
  }
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
    expect(onboarding.element).toEqual(<OnboardingPage title="Onboarding" />);
    expect((routeFor('/hrms/administration/documents').route.element as ReactElement).type).toBe(
      ModulePlaceholder,
    );
  });
});

describe('Employees Directory page', () => {
  it('renders header, description, search, filters and a loading state', () => {
    const html = renderDirectory();
    expect(html).toContain('Employees');
    expect(html).toContain('Find employees and view their employment information.');
    expect(html).not.toContain('View and manage employee records');
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
  const emptyProfile = (employee: EmployeeRecord): EmployeeProfile => ({
    employee,
    personal: null,
    familyMembers: [],
    nominees: [],
    emergencyContacts: [],
    bankAccount: null,
    skills: [],
    workSchedule: null,
  });

  const fullProfile: EmployeeProfile = {
    employee: { ...arjun, sourceOfHire: 'referral', noticePeriodDays: 30 },
    personal: {
      middleName: null,
      preferredName: 'AJ',
      gender: 'Male',
      dateOfBirth: '1994-05-18',
      maritalStatus: 'Married',
      bloodGroup: 'O+',
      nationality: 'Indian',
      nativeLanguage: 'Tamil',
      fatherName: null,
      guardianName: null,
      personalEmail: 'arjun.personal@example.com',
      homePhone: null,
      businessPhone: null,
      workPhone: '+91 44 4000 0002',
      addressStreet: '12 Anna Salai',
      addressCity: 'Chennai',
      addressDistrict: null,
      addressState: 'Tamil Nadu',
      addressPostalCode: '600017',
      addressCountry: 'India',
    },
    familyMembers: [
      {
        id: 'efm_1',
        name: 'Meera Mehta',
        relationship: 'Spouse',
        dateOfBirth: '1995-01-10',
        phone: null,
      },
    ],
    nominees: [{ id: 'enm_1', name: 'Meera Mehta', relationship: 'Spouse', sharePercentage: 100 }],
    emergencyContacts: [
      {
        id: 'eec_1',
        priority: 'primary',
        name: 'Meera Mehta',
        relationship: 'Spouse',
        phone: '+91 91111 11111',
        email: null,
        address: null,
        isPrivate: true,
      },
    ],
    bankAccount: {
      accountHolderName: 'Arjun Mehta',
      accountNumberMasked: '••••5678',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      branchName: 'T. Nagar',
      bankLocation: null,
    },
    skills: [
      {
        id: 'esk_1',
        skillName: 'TypeScript',
        skillType: 'Technical',
        proficiency: 'Advanced',
        level: 'Level 4',
        assessedOn: '2025-11-20',
        yearsOfExperience: 4,
        examinerEmployeeId: null,
        verifiedByEmployeeId: null,
        mentorEmployeeId: 'emp_demo_001',
        examinerName: null,
        verifiedByName: null,
        mentorName: 'Lakshmi Narayanan',
      },
    ],
    workSchedule: {
      workingCalendar: 'India Corporate Calendar',
      workSchedule: 'General Shift',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 15,
      lunchMinutes: 45,
      timeZone: 'Asia/Kolkata',
    },
  };

  function renderTab(profile: EmployeeProfile, activeTab: ProfileTabId, history: ReactNode = null) {
    return renderToStaticMarkup(
      <EmployeeProfileView
        profile={profile}
        activeTab={activeTab}
        onTabChange={noop}
        onBack={noop}
        onOpenEmployee={noop}
        history={history}
      />,
    );
  }

  it('route page starts by loading the employee profile', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/hrms/administration/employees/emp_demo_003']}>
        <EmployeeProfilePage />
      </MemoryRouter>,
    );
    expect(html).toContain('Loading employee');
  });

  it('loads the canonical profile from the real profile endpoint', async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      urls.push(url);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: fullProfile }) });
    });
    try {
      const profile = await fetchEmployeeProfile('emp_demo_002');
      expect(urls[0]).toMatch(/\/hrms\/employees\/emp_demo_002\/profile$/);
      expect(profile.bankAccount?.accountNumberMasked).toBe('••••5678');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('offers only implemented record sections — no Tasks, Review, Documents, Assets or Access', () => {
    expect(PROFILE_TABS.map((tab) => tab.label)).toEqual([
      'Overview',
      'Personal',
      'Emergency Contacts',
      'Accounts',
      'Skills',
      'Work',
      'History',
    ]);
    const html = renderTab(fullProfile, 'overview');
    for (const absent of ['>Review<', '>Tasks<', '>Documents<', '>Assets<', '>Online Access<']) {
      expect(html).not.toContain(absent);
    }
  });

  it('overview groups contact, organization and employment, with conditional fields', () => {
    const html = renderTab(fullProfile, 'overview');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('EMP-0002 · Software Engineer');
    for (const group of ['>Contact<', '>Organization<', '>Employment<']) {
      expect(html).toContain(group);
    }
    expect(html).toContain('Work Email');
    expect(html).toContain('+91 98450 00002');
    expect(html).toContain('Bengaluru');
    expect(html).toContain('Lakshmi Narayanan');
    expect(html).toContain('Confirmation Date');
    expect(html).toContain('Jul 15, 2024');
    expect(html).toContain('30 days');
    expect(html).toContain('Referral');
    // Not applicable → not shown
    expect(html).not.toContain('Last Working Date');
    expect(html).not.toContain('Contract End Date');

    const probationer = renderTab(emptyProfile(kavya), 'overview');
    expect(probationer).not.toContain('Confirmation Date');
    expect(probationer).not.toContain('Notice Period');
    expect(probationer).toContain('Dec 1, 2026');
  });

  it('personal tab shows personal details, address, family and nominees from the API', () => {
    const html = renderTab(fullProfile, 'personal');
    expect(html).toContain('Personal Details');
    expect(html).toContain('May 18, 1994');
    expect(html).toContain('arjun.personal@example.com');
    expect(html).toContain('12 Anna Salai, Chennai, Tamil Nadu, 600017, India');
    expect(html).toContain('Family Members');
    expect(html).toContain('Meera Mehta');
    expect(html).toContain('Nominees');
    expect(html).toContain('100%');
    // Blank fields are omitted, not shown as empty rows
    expect(html).not.toContain('Middle Name');
    expect(html).not.toContain('Home Phone');
  });

  it('shows emergency contacts, masked bank account, skills and working hours', () => {
    const emergency = renderTab(fullProfile, 'emergency');
    expect(emergency).toContain('Primary Contact');
    expect(emergency).toContain('Private');
    expect(emergency).toContain('+91 91111 11111');

    const accounts = renderTab(fullProfile, 'accounts');
    expect(accounts).toContain('••••5678');
    expect(accounts).toContain('HDFC0001234');

    const skills = renderTab(fullProfile, 'skills');
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('Advanced');
    expect(skills).toContain('4 yrs');
    expect(skills).toContain('Lakshmi Narayanan');

    const work = renderTab(fullProfile, 'work');
    expect(work).toContain('Monday, Tuesday, Wednesday, Thursday, Friday');
    expect(work).toContain('09:00 – 18:00');
    expect(work).toContain('Asia/Kolkata');
  });

  it('shows an empty state per section when nothing is recorded', () => {
    const profile = emptyProfile(kavya);
    expect(renderTab(profile, 'personal')).toContain('No personal details recorded');
    expect(renderTab(profile, 'emergency')).toContain('No emergency contacts recorded');
    expect(renderTab(profile, 'accounts')).toContain('No bank account recorded');
    expect(renderTab(profile, 'skills')).toContain('No skills recorded');
    expect(renderTab(profile, 'work')).toContain('No working hours recorded');
  });

  it('back link and reporting manager navigate to canonical employee routes', () => {
    const onOpenEmployee = vi.fn();
    const onBack = vi.fn();
    const view = EmployeeProfileView({
      profile: fullProfile,
      activeTab: 'overview',
      onTabChange: noop,
      onBack,
      onOpenEmployee,
      history: null,
    });
    clickableWithText(view, 'Employees').onClick();
    expect(onBack).toHaveBeenCalled();

    // Section components are hook-free: render the Overview element's tree directly.
    const [overview] = findElements(
      view,
      (el) => typeof el.type === 'function' && el.type.name === 'ProfileOverview',
    );
    const render = overview!.type as (props: unknown) => ReactNode;
    clickableWithText(render(overview!.props), 'Lakshmi Narayanan').onClick();
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_001');
  });
});

describe('Employment History', () => {
  const appliedChange: EmployeeActionListItem = {
    id: 'ea_7',
    employeeId: 'emp_demo_003',
    employeeNumber: 'EMP-0003',
    employeeName: 'Kavya Iyer',
    actionType: 'department_change',
    category: 'job_changes',
    status: 'applied',
    effectiveDate: '2026-09-20',
    reason: 'Reorganisation',
    changes: [
      {
        field: 'departmentId',
        from: 'dept_eng_01',
        fromLabel: 'Engineering',
        to: 'dept_prod_01',
        toLabel: 'Product',
      },
    ],
    requestDate: null,
    requestedBy: null,
    cancellationReason: null,
    appliedAt: '2026-09-25T04:36:00.000Z',
    cancelledAt: null,
    version: 2,
    createdAt: '2026-09-25T04:36:00.000Z',
    updatedAt: '2026-09-25T04:36:00.000Z',
  };

  it('lists persisted employee actions with previous → new values', () => {
    const html = renderToStaticMarkup(
      <EmploymentHistory
        status="ready"
        actions={[appliedChange]}
        onRetry={noop}
        onOpenAction={noop}
      />,
    );
    expect(html).toContain('Department Change');
    expect(html).toContain('Engineering → Product');
    expect(html).toContain('Sep 20, 2026');
    expect(html).toContain('Applied');
  });

  it('opens the existing Employee Administration action detail', () => {
    const onOpenAction = vi.fn();
    const tree = EmploymentHistory({
      status: 'ready',
      actions: [appliedChange],
      onRetry: noop,
      onOpenAction,
    });
    clickableWithText(tree, 'Department Change').onClick();
    clickableWithText(tree, 'View').onClick();
    expect(onOpenAction).toHaveBeenCalledTimes(2);
    expect(onOpenAction).toHaveBeenCalledWith('ea_7');
  });

  it('shows loading, error and empty states', () => {
    const render = (props: Partial<Parameters<typeof EmploymentHistory>[0]>) =>
      renderToStaticMarkup(
        <EmploymentHistory
          status="ready"
          actions={[]}
          onRetry={noop}
          onOpenAction={noop}
          {...props}
        />,
      );
    expect(render({ status: 'loading' })).toContain('Loading employment history');
    expect(render({ status: 'error', error: 'boom' })).toContain(
      'Employment history could not be loaded',
    );
    expect(render({})).toContain('No employment activity yet');
  });

  it('is rendered inside the profile History tab', () => {
    const html = renderToStaticMarkup(
      <EmployeeProfileView
        profile={{
          employee: kavya,
          personal: null,
          familyMembers: [],
          nominees: [],
          emergencyContacts: [],
          bankAccount: null,
          skills: [],
          workSchedule: null,
        }}
        activeTab="history"
        onTabChange={noop}
        onBack={noop}
        onOpenEmployee={noop}
        history={
          <EmploymentHistory
            status="ready"
            actions={[appliedChange]}
            onRetry={noop}
            onOpenAction={noop}
          />
        }
      />,
    );
    expect(html).toContain('Engineering → Product');
  });
});
