import { describe, it, expect, vi, afterEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Navigate, matchRoutes } from 'react-router-dom';
import { hrmsNavigation } from '../../navigation';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import { EmployeeDirectoryPage, computeWorkforceKpiValues } from '../pages/EmployeeDirectoryPage';
import { EmployeeProfilePage } from '../pages/EmployeeProfilePage';
import { EmployeeEditPage } from '../pages/EmployeeEditPage';
import { EmployeeRegistration } from '../../onboarding/components/EmployeeRegistration';
import { PersonalInformation } from '../../onboarding/components/PersonalInformation';
import { RegistrationConfigProvider } from '../../onboarding/registration/registrationConfig';
import { StandaloneUtilityLayout } from '../../../../app/router/StandaloneUtilityLayout';
import { ThemeProvider } from '../../../../app/providers/ThemeProvider';
import { EmployeeDirectoryTable } from '../components/EmployeeDirectoryTable';
import { EmployeeProfileView } from '../components/EmployeeProfileView';
import { EmployeeAdministrationPage } from '../../employee-administration';
import { OnboardingPage } from '../../onboarding';
import { TransfersPage } from '../../transfers';
import { PromotionsPage } from '../../promotions';
import { OffboardingPage } from '../../offboarding';
import { DocumentsPage } from '../../documents';
import { RecordsPage } from '../../records';
import { WorkforceOverviewPage } from '../../overview';
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
import { EMPLOYEES_PATH, employeeProfilePath, employeeEditPath } from '../model/employeeModel';
import { profileToRegistrationData } from '../model/employeeRegistrationAdapter';
import { AuthContext, type AuthContextValue } from '../../../../platform/auth';

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

function renderDirectoryWithAuth(permissions: string[]) {
  const mockAuth: AuthContextValue = {
    status: 'authenticated',
    error: null,
    errorKind: null,
    access: null,
    activeCompany: {
      tenantId: 'tenant_demo_001',
      tenantName: 'Acme Holding',
      companyId: 'comp_demo_001',
      companyName: 'Acme Corp',
      companyCode: 'ACME',
      isMember: true,
      isPlatformOversight: false,
      roles: [],
      permissions,
      enabledModules: ['hrms'],
      essEligible: true,
      employeeId: null,
      workspaces: ['hrms'],
    },
    can: (p: string) => permissions.includes(p),
    canAny: (ps: readonly string[]) => ps.some((p) => permissions.includes(p)),
    canAll: (ps: readonly string[]) => ps.every((p) => permissions.includes(p)),
    hasApplicationAccess: () => true,
    isSuperAdmin: false,
    isCompanyAdmin: false,
    completeSignIn: noop,
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
  };

  return renderToStaticMarkup(
    <AuthContext.Provider value={mockAuth}>
      <MemoryRouter>
        <EmployeeDirectoryPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Workforce navigation', () => {
  it('contains Overview, Employees, Onboarding, Transfers, Promotions, Offboarding, Records — in order', () => {
    const workforce = hrmsNavigation.destinations.find((d) => d.id === 'workforce');
    expect(workforce?.children?.map((c) => [c.id, c.label])).toEqual([
      ['overview', 'Overview'],
      ['employees', 'Employees'],
      ['onboarding', 'Onboarding'],
      ['transfers', 'Transfers'],
      ['promotions', 'Promotions'],
      ['offboarding', 'Offboarding'],
      ['records', 'Records'],
    ]);
  });
});

describe('HRMS routing for Workforce & Administration compatibility', () => {
  it('Workforce → Employees renders the Employee Directory', () => {
    expect(routeFor('/hrms/workforce/employees').route.element).toEqual(<EmployeeDirectoryPage />);
  });

  it('Administration → Employees compatibility renders the Employee Directory', () => {
    expect(routeFor('/hrms/administration/employees').route.element).toEqual(
      <EmployeeDirectoryPage />,
    );
  });

  it('direct URL to an employee resolves the canonical Employee Profile with its id', () => {
    const { route, params } = routeFor('/hrms/workforce/employees/emp_demo_003');
    expect(route.element).toEqual(<EmployeeProfilePage />);
    expect(params.employeeId).toBe('emp_demo_003');
    expect(employeeProfilePath('emp_demo_003')).toBe('/hrms/workforce/employees/emp_demo_003');

    // Administration compatibility
    const adminRoute = routeFor('/hrms/administration/employees/emp_demo_003');
    expect(adminRoute.route.element).toEqual(<EmployeeProfilePage />);
    expect(adminRoute.params.employeeId).toBe('emp_demo_003');
  });

  it('the Workforce group and the Employees shortcut land on their respective destinations', () => {
    expect(routeFor('/hrms/workforce').route.element).toEqual(
      <Navigate to="/hrms/workforce/overview" replace />,
    );
    expect(routeFor('/hrms/administration').route.element).toEqual(
      <Navigate to="/hrms/workforce/overview" replace />,
    );
    expect(routeFor('/hrms/employees').route.element).toEqual(
      <Navigate to={EMPLOYEES_PATH} replace />,
    );
  });

  it('routes Workforce sub-navigation items and preserves Administration compatibility', () => {
    expect((routeFor('/hrms/workforce/overview').route.element as ReactElement).type).toBe(
      WorkforceOverviewPage,
    );
    expect((routeFor('/hrms/workforce/transfers').route.element as ReactElement).type).toBe(
      TransfersPage,
    );
    expect((routeFor('/hrms/workforce/promotions').route.element as ReactElement).type).toBe(
      PromotionsPage,
    );
    expect((routeFor('/hrms/workforce/offboarding').route.element as ReactElement).type).toBe(
      OffboardingPage,
    );
    expect((routeFor('/hrms/workforce/records').route.element as ReactElement).type).toBe(
      RecordsPage,
    );

    // Administration compatibility routes
    expect(
      (routeFor('/hrms/administration/employee-administration').route.element as ReactElement).type,
    ).toBe(EmployeeAdministrationPage);
    const onboarding = routeFor('/hrms/administration/onboarding').route;
    expect(onboarding.element).toEqual(<OnboardingPage title="Onboarding" />);
    expect((routeFor('/hrms/administration/documents').route.element as ReactElement).type).toBe(
      DocumentsPage,
    );
  });
});

describe('Employees Directory page', () => {
  it('renders header, description, search, filters and a loading state', () => {
    const html = renderDirectory();
    expect(html).toContain('Employees');
    expect(html).toContain('Manage and explore your workforce directory');
    expect(html).toContain('Import');
    expect(html).toContain('Export');
    expect(html).toContain('Total Employees');
    expect(html).toContain('Active Employees');
    expect(html).toContain('Pending Activation');
    expect(html).toContain('Inactive Employees');
    expect(html).not.toContain('On Leave');
    expect(html).not.toContain('Employee Directory');
    expect(html).toContain('Search by name, employee ID, email, department...');
    expect(html).toContain('Filters');
    expect(html).toContain('Reset');
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

  it('displays record count as plain muted text and disables reset without active filters', () => {
    const html = renderDirectory();
    expect(html).toContain('bezent-records-text');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Reset.*<\/button>/s);
  });

  it('renders skeleton shimmer placeholders for KPI metrics while loading', () => {
    const html = renderDirectory();
    expect(html).toContain('bezent-kpi-card__skeleton');
    expect(html).toContain('aria-label="Loading metric"');
  });

  it('renders "—" fallback when KPI metric counts are unavailable', () => {
    const nullKpis = computeWorkforceKpiValues({
      totalItems: null,
      activeItems: null,
      probationItems: null,
      pendingActivationItems: null,
      terminatedItems: null,
      suspendedItems: null,
      resignedItems: null,
      employees: [],
    });

    expect(nullKpis.total).toBeNull();
    expect(nullKpis.active).toBeNull();
    expect(nullKpis.pendingActivation).toBeNull();
    expect(nullKpis.inactive).toBeNull();
  });

  it('gates Import and Export buttons by canonical permission keys', () => {
    const both = renderDirectoryWithAuth(['hrms.employees.create', 'hrms.employees.view']);
    expect(both).toContain('Import');
    expect(both).toContain('Export');

    const exportOnly = renderDirectoryWithAuth(['hrms.employees.view']);
    expect(exportOnly).not.toContain('Import');
    expect(exportOnly).toContain('Export');

    const importOnly = renderDirectoryWithAuth(['hrms.employees.create']);
    expect(importOnly).toContain('Import');
    expect(importOnly).not.toContain('Export');

    const none = renderDirectoryWithAuth([]);
    expect(none).not.toContain('Import');
    expect(none).not.toContain('Export');
  });
});

describe('EmployeeDirectoryTable', () => {
  it('renders real employee records with approved directory columns', () => {
    const html = renderToStaticMarkup(
      <EmployeeDirectoryTable
        status="ready"
        employees={[kavya, arjun]}
        onRetry={noop}
        onOpenEmployee={noop}
      />,
    );
    for (const header of ['Employee', 'Department', 'Employment', 'Status', 'Actions']) {
      expect(html).toContain(`>${header}<`);
    }
    for (const value of [
      'Kavya Iyer',
      'EMP-0003',
      'Product',
      'Product Manager',
      'Arjun Mehta',
      'EMP-0002',
      'Engineering',
      'Software Engineer',
      'Full Time',
      'Probation',
      'Active',
    ]) {
      expect(html).toContain(value);
    }
  });

  it('renders employee avatar image with 3d catalog asset and initials fallback', () => {
    const html = renderToStaticMarkup(
      <EmployeeDirectoryTable
        status="ready"
        employees={[kavya]}
        onRetry={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(html).toContain('src="/assets/avatars/3d/');
    expect(html).toContain('alt="Kavya Iyer"');
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

  it('renders honest empty state with Clear filters action button when filtered', () => {
    const onClear = vi.fn();
    const tree = EmployeeDirectoryTable({
      status: 'ready',
      employees: [],
      onRetry: noop,
      onOpenEmployee: noop,
      filtered: true,
      onClearFilters: onClear,
    }) as ReactElement<{ primaryAction?: { label: string; onClick: () => void } }>;

    expect(tree.props.primaryAction?.label).toBe('Clear filters');
    tree.props.primaryAction?.onClick();
    expect(onClear).toHaveBeenCalledTimes(1);

    const html = renderToStaticMarkup(tree);
    expect(html).toContain('No matching employees');
    expect(html).toContain('Clear filters');
  });

  it('supports interactive sort headers when onSort is provided', () => {
    const onSort = vi.fn();
    const tree = EmployeeDirectoryTable({
      status: 'ready',
      employees: [kavya, arjun],
      onRetry: noop,
      onOpenEmployee: noop,
      sortColumn: 'employee',
      sortDirection: 'asc',
      onSort,
    });

    const html = renderToStaticMarkup(tree);
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('↑');

    const [sortBtn] = findElements(
      tree,
      (el) =>
        typeof (el.props as { onClick?: unknown })?.onClick === 'function' &&
        Boolean(
          (el.props as { 'aria-label'?: string })?.['aria-label']?.includes('Sort by Employee'),
        ),
    );
    expect(sortBtn).toBeDefined();
    (sortBtn!.props as { onClick: () => void }).onClick();
    expect(onSort).toHaveBeenCalledWith('employee');
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

  it('offers the 8 canonical profile workspace sections and excludes non-profile onboarding steps', () => {
    expect(PROFILE_TABS.map((tab) => tab.label)).toEqual([
      'Personal',
      'Employment',
      'Organization',
      'Contact',
      'Payroll',
      'Documents',
      'Accounts',
      'History',
    ]);
    const html = renderTab(fullProfile, 'overview');
    for (const absent of ['>Review<', '>Tasks<', '>Assets<', '>Online Access<']) {
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

describe('computeWorkforceKpiValues', () => {
  const refDate = new Date('2026-10-23T12:00:00Z');

  it('computes total, active, and inactive employees from backend counts', () => {
    const kpis = computeWorkforceKpiValues({
      totalItems: 42,
      activeItems: 35,
      terminatedItems: 2,
      suspendedItems: 1,
      resignedItems: 3,
      employees: [],
      companyTimezone: 'Asia/Kolkata',
      referenceDate: refDate,
    });

    expect(kpis.total).toBe(42);
    expect(kpis.active).toBe(35);
    // Inactive is terminated + suspended + resigned (2 + 1 + 3 = 6)
    // Note: total (42) does NOT have to equal active (35) + inactive (6), as there can be probation/notice
    expect(kpis.inactive).toBe(6);
  });

  it('computes pending activation and active workforce combining active and probation counts', () => {
    const kpis = computeWorkforceKpiValues({
      totalItems: 96,
      activeItems: 12,
      probationItems: 11,
      pendingActivationItems: 73,
      terminatedItems: 0,
      suspendedItems: 0,
      resignedItems: 0,
      employees: [],
      companyTimezone: 'Asia/Kolkata',
      referenceDate: refDate,
    });

    expect(kpis.total).toBe(96);
    expect(kpis.active).toBe(23); // 12 active + 11 probation
    expect(kpis.pendingActivation).toBe(73);
    expect(kpis.inactive).toBe(0);
    // Check that Total = Active Workforce + Pending Activation + Inactive
    expect(kpis.total).toBe(kpis.active! + kpis.pendingActivation! + kpis.inactive!);
  });

  it('accurately counts New Joiners within current calendar month in company timezone', () => {
    const employees: EmployeeRecord[] = [
      // Joined earlier this month - eligible
      { ...kavya, id: 'e1', joiningDate: '2026-10-05', employmentStatus: 'active' },
      // Joined today - eligible
      { ...kavya, id: 'e2', joiningDate: '2026-10-23', employmentStatus: 'probation' },
      // Future join date in this month - EXCLUDED
      { ...kavya, id: 'e3', joiningDate: '2026-10-28', employmentStatus: 'active' },
      // Joined in previous month - EXCLUDED
      { ...kavya, id: 'e4', joiningDate: '2026-09-30', employmentStatus: 'active' },
      // Joined in next month - EXCLUDED
      { ...kavya, id: 'e5', joiningDate: '2026-11-01', employmentStatus: 'active' },
      // Joined this month but pending onboarding (pending_activation) - EXCLUDED
      { ...kavya, id: 'e6', joiningDate: '2026-10-10', employmentStatus: 'pending_activation' },
    ];

    const kpis = computeWorkforceKpiValues({
      totalItems: 6,
      activeItems: 4,
      terminatedItems: 0,
      suspendedItems: 0,
      resignedItems: 0,
      employees,
      companyTimezone: 'Asia/Kolkata',
      referenceDate: refDate,
    });

    // Only e1 and e2 are valid New Joiners
    expect(kpis.newJoiners).toBe(2);
  });

  it('respects the company configured timezone for month boundaries', () => {
    // Reference instant: 2026-10-31 23:30:00 UTC
    // In UTC / America/New_York (UTC-4): It is October 31 (2026-10)
    // In Asia/Kolkata (UTC+5:30): It is November 01 05:00:00 (2026-11)
    const instant = new Date('2026-10-31T23:30:00Z');

    const octEmployee: EmployeeRecord = {
      ...kavya,
      id: 'e_oct',
      joiningDate: '2026-10-31',
      employmentStatus: 'active',
    };
    const novEmployee: EmployeeRecord = {
      ...kavya,
      id: 'e_nov',
      joiningDate: '2026-11-01',
      employmentStatus: 'active',
    };

    // When company timezone is America/New_York (where current month is 2026-10)
    const nyKpis = computeWorkforceKpiValues({
      totalItems: 2,
      activeItems: 2,
      terminatedItems: 0,
      suspendedItems: 0,
      resignedItems: 0,
      employees: [octEmployee, novEmployee],
      companyTimezone: 'America/New_York',
      referenceDate: instant,
    });
    // For NY, octEmployee is in current month and joined today (<= 2026-10-31), novEmployee is future month
    expect(nyKpis.newJoiners).toBe(1);

    // When company timezone is Asia/Kolkata (where current month has rolled over to 2026-11)
    const kolkataKpis = computeWorkforceKpiValues({
      totalItems: 2,
      activeItems: 2,
      terminatedItems: 0,
      suspendedItems: 0,
      resignedItems: 0,
      employees: [octEmployee, novEmployee],
      companyTimezone: 'Asia/Kolkata',
      referenceDate: instant,
    });
    // For Kolkata, current date is 2026-11-01, novEmployee is joined today, octEmployee was previous month
    expect(kolkataKpis.newJoiners).toBe(1);
  });

  it('returns null for metrics when sources are unavailable', () => {
    const kpis = computeWorkforceKpiValues({
      totalItems: null,
      activeItems: null,
      terminatedItems: null,
      suspendedItems: null,
      resignedItems: null,
      employees: [],
      companyTimezone: 'Asia/Kolkata',
      referenceDate: refDate,
    });

    expect(kpis.total).toBeNull();
    expect(kpis.active).toBeNull();
    expect(kpis.newJoiners).toBeNull();
    expect(kpis.inactive).toBeNull();
  });
});

describe('Standalone Edit Employee Workspace & Adapter', () => {
  it('computes correct canonical paths for employee edit', () => {
    expect(employeeEditPath('EMP-001')).toBe('/hrms/workforce/employees/EMP-001/edit');
    expect(employeeEditPath('emp_123/special')).toBe(
      '/hrms/workforce/employees/emp_123%2Fspecial/edit',
    );
  });

  it('renders Edit Profile button in header when canEdit is true and invokes onEditProfile', () => {
    const onEditProfile = vi.fn();
    const view = EmployeeProfileView({
      profile: {
        employee: kavya,
        personal: null,
        familyMembers: [],
        nominees: [],
        emergencyContacts: [],
        bankAccount: null,
        skills: [],
        workSchedule: null,
      },
      activeTab: 'personal',
      onTabChange: noop,
      onBack: noop,
      onOpenEmployee: noop,
      canEdit: true,
      onEditProfile,
      history: null,
    });

    const editBtn = clickableWithText(view, 'Edit Profile');
    expect(editBtn).toBeDefined();
    editBtn.onClick();
    expect(onEditProfile).toHaveBeenCalledTimes(1);
  });

  it('does not render Edit Profile button when canEdit is false', () => {
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
        activeTab="personal"
        onTabChange={noop}
        onBack={noop}
        onOpenEmployee={noop}
        canEdit={false}
        history={null}
      />,
    );

    expect(html).not.toContain('Edit Profile');
  });

  it('maps loaded EmployeeProfile into complete 10-chapter RegistrationFormData', () => {
    const sampleProfile: EmployeeProfile = {
      employee: {
        ...kavya,
        phone: '+91 99887 76655',
      },
      personal: {
        middleName: 'R.',
        preferredName: 'Kavi',
        gender: 'Female',
        dateOfBirth: '1995-05-12',
        maritalStatus: 'Married',
        bloodGroup: 'B+',
        nationality: 'Indian',
        nativeLanguage: 'Tamil',
        fatherName: 'Ramanathan Iyer',
        guardianName: null,
        personalEmail: 'kavya.personal@example.com',
        homePhone: null,
        businessPhone: null,
        workPhone: '+91 99887 76655',
        addressStreet: '12 Temple Street',
        addressLine2: 'Apt 4B',
        addressCity: 'Chennai',
        addressDistrict: 'Chennai',
        addressState: 'Tamil Nadu',
        addressPostalCode: '600001',
        addressCountry: 'India',
        isPermanentSameAsCurrent: true,
        permanentAddressStreet: null,
        permanentAddressLine2: null,
        permanentAddressCity: null,
        permanentAddressDistrict: null,
        permanentAddressState: null,
        permanentAddressPostalCode: null,
        permanentAddressCountry: null,
      },
      familyMembers: [
        {
          id: 'fm_1',
          name: 'Rohan Iyer',
          relationship: 'Spouse',
          dateOfBirth: '1993-02-10',
          phone: '+91 98765 43210',
        },
      ],
      nominees: [
        {
          id: 'nom_1',
          name: 'Rohan Iyer',
          relationship: 'Spouse',
          sharePercentage: 100,
        },
      ],
      emergencyContacts: [
        {
          id: 'ec_1',
          priority: 'primary',
          name: 'Rohan Iyer',
          relationship: 'Spouse',
          phone: '+91 98765 43210',
          email: 'rohan@example.com',
          address: '12 Temple Street, Chennai',
          isPrivate: false,
        },
      ],
      bankAccount: {
        accountHolderName: 'Kavya Iyer',
        accountNumberMasked: '••••••••1234',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        branchName: 'T Nagar',
        bankLocation: 'Chennai',
      },
      skills: [
        {
          id: 'sk_1',
          skillName: 'Product Strategy',
          skillType: 'Functional',
          proficiency: 'Advanced',
          level: 'L3',
          assessedOn: '2026-01-15',
          yearsOfExperience: 5,
          examinerEmployeeId: null,
          verifiedByEmployeeId: null,
          mentorEmployeeId: null,
          examinerName: null,
          verifiedByName: null,
          mentorName: null,
        },
      ],
      workSchedule: {
        workingCalendar: 'India Corporate Calendar 2026',
        workSchedule: 'Standard General Shift (9:00 AM – 6:00 PM)',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lunchMinutes: 45,
        timeZone: 'Asia/Kolkata',
      },
    };

    const formData = profileToRegistrationData(sampleProfile);

    // Verify Chapter 01 (General)
    expect(formData.general.employeeId).toBe('EMP-0003');
    expect(formData.general.department).toBe('Product');
    expect(formData.general.designation).toBe('Product Manager');
    expect(formData.general.employmentStatus).toBe('probation');

    // Verify Chapter 02 (Personal)
    expect(formData.personal.firstName).toBe('Kavya');
    expect(formData.personal.lastName).toBe('Iyer');
    expect(formData.personal.preferredName).toBe('Kavi');
    expect(formData.personal.dob).toBe('1995-05-12');
    expect(formData.personal.bloodGroup).toBe('B+');
    expect(formData.personal.personalEmail).toBe('kavya.personal@example.com');
    expect(formData.personal.currentCity).toBe('Chennai');
    expect(formData.personal.parentGuardians).toHaveLength(1);
    expect(formData.personal.parentGuardians[0]!.name).toBe('Ramanathan Iyer');
    expect(formData.personal.familyMembers).toHaveLength(1);
    expect(formData.personal.familyMembers[0]!.name).toBe('Rohan Iyer');
    expect(formData.personal.nominationDetails).toHaveLength(1);

    // Verify Chapter 04 (Skills)
    expect(formData.skills.skills).toHaveLength(1);
    expect(formData.skills.skills[0]!.skillName).toBe('Product Strategy');

    // Verify Chapter 05 (Emergency Contact)
    expect(formData.emergency.primaryContact?.name).toBe('Rohan Iyer');
    expect(formData.emergency.primaryContact?.relationship).toBe('Spouse');

    // Verify Chapter 06 (Accounts)
    expect(formData.accounts.bankAccount?.accountHolderName).toBe('Kavya Iyer');
    expect(formData.accounts.bankAccount?.ifscCode).toBe('HDFC0001234');
    expect(formData.accounts.bankAccount?.accountNumber).toBe('••••••••1234');

    // Verify Chapter 07 (Online Access)
    expect(formData.onlineAccess.officialEmail).toBe('kavya.iyer@bezent-demo.example');

    // Verify Chapter 08 (Working Hours)
    expect(formData.workingHours.timeZone).toBe('Asia/Kolkata');
    expect(formData.workingHours.workingDays).toContain('Monday');
  });

  it('profileToRegistrationData safely handles null personal, bankAccount, and workSchedule sections without throwing', () => {
    const minimalProfile: EmployeeProfile = {
      employee: {
        id: 'emp_1792670253491_39c00882',
        employeeNumber: 'ANL1_253491',
        firstName: 'Alan',
        lastName: 'Turing',
        fullName: 'Alan Turing',
        email: 'alan.253491@example.com',
        phone: null,
        departmentId: 'dpt_1791789754381_fd66c650',
        departmentName: 'Analytics Engineering',
        designationId: null,
        designationName: null,
        locationId: null,
        locationName: null,
        reportingManagerId: null,
        referralCode: null,
        referredByEmployeeId: null,
        joiningDate: '2026-01-01',
        confirmedJoiningDate: null,
        probationEndDate: null,
        confirmationDate: null,
        lastWorkingDate: null,
        sourceOfHire: null,
        noticePeriodDays: null,
        contractEndDate: null,
        employmentType: 'full_time',
        employmentStatus: 'pending_activation',
        createdAt: '2026-10-22T11:57:37.000Z',
        updatedAt: '2026-10-23T04:16:35.000Z',
        reportingManagerName: null,
        referredByName: null,
      } as unknown as EmployeeRecord,
      personal: null,
      familyMembers: [],
      parentGuardians: [],
      nominees: [],
      emergencyContacts: [],
      bankAccount: null,
      skills: [],
      workSchedule: null,
    };

    const formData = profileToRegistrationData(minimalProfile);

    expect(formData.general.employeeId).toBe('ANL1_253491');
    expect(formData.general.department).toBe('Analytics Engineering');
    expect(formData.personal.firstName).toBe('Alan');
    expect(formData.personal.lastName).toBe('Turing');
    expect(formData.personal.dob).toBe('');
    expect(formData.skills.skills).toEqual([]);
    expect(formData.accounts.bankAccount).toBeNull();
    expect(formData.workingHours.workingDays).toBeDefined();
  });

  it('renders Standalone EmployeeRegistration in edit mode with RegistrationConfigProvider without crashing', () => {
    const minimalProfile: EmployeeProfile = {
      employee: {
        id: 'emp_1792670253491_39c00882',
        employeeNumber: 'ANL1_253491',
        firstName: 'Alan',
        lastName: 'Turing',
        fullName: 'Alan Turing',
        email: 'alan.253491@example.com',
        phone: null,
        departmentName: 'Analytics Engineering',
        employmentType: 'full_time',
        employmentStatus: 'pending_activation',
        joiningDate: '2026-01-01',
      } as unknown as EmployeeRecord,
      personal: null,
      familyMembers: [],
      nominees: [],
      emergencyContacts: [],
      bankAccount: null,
      skills: [],
      workSchedule: null,
    };

    const formData = profileToRegistrationData(minimalProfile);

    const dummyConfig = {
      sections: [
        { id: 'personal', label: 'Personal Information', configurable: true },
        { id: 'general', label: 'General', configurable: true },
        { id: 'onboarding', label: 'Administration', configurable: true },
        { id: 'skills', label: 'Skills', configurable: true },
        { id: 'emergency', label: 'Emergency Contact', configurable: true },
        { id: 'accounts', label: 'Accounts', configurable: true },
        { id: 'online_access', label: 'Online Access', configurable: true },
        { id: 'working_hours', label: 'Working Hours', configurable: true },
        { id: 'documents', label: 'Documents', configurable: true },
        { id: 'review', label: 'Review', configurable: true },
      ],
      fields: [
        {
          key: 'personal.firstName',
          section: 'personal',
          label: 'First Name',
          protected: true,
          protectedReason: 'Required by law',
          configurable: false,
          enabled: true,
          required: true,
          defaultEnabled: true,
          defaultRequired: true,
          overridden: false,
        },
        {
          key: 'personal.lastName',
          section: 'personal',
          label: 'Last Name',
          protected: false,
          protectedReason: null,
          configurable: true,
          enabled: true,
          required: false,
          defaultEnabled: true,
          defaultRequired: false,
          overridden: false,
        },
        {
          key: 'general.department',
          section: 'general',
          label: 'Department',
          protected: false,
          protectedReason: null,
          configurable: true,
          enabled: true,
          required: false,
          defaultEnabled: true,
          defaultRequired: false,
          overridden: false,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/hrms/workforce/employees/emp_1792670253491_39c00882/edit']}>
        <RegistrationConfigProvider configuration={dummyConfig}>
          <EmployeeRegistration
            mode="edit"
            employeeId="emp_1792670253491_39c00882"
            employeeName="Alan Turing"
            employeeNumber="ANL1_253491"
            initialFormData={formData}
            onCancel={noop}
            onSaveEdit={async () => {}}
          />
        </RegistrationConfigProvider>
      </MemoryRouter>,
    );

    // Header & Actions
    expect(html).toContain('Edit Employee');
    expect(html).toContain('Alan Turing');
    expect(html).toContain('ANL1_253491');
    expect(html).toContain('Save Changes');
    expect(html).toContain('Back to Employee Profile');

    // Chapters present in navigation
    expect(html).toContain('Personal Information');
    expect(html).toContain('General');
    expect(html).toContain('Administration');
    expect(html).toContain('Skills');
    expect(html).toContain('Emergency Contact');
    expect(html).toContain('Accounts');
    expect(html).toContain('Online Access');
    expect(html).toContain('Working Hours');
    expect(html).toContain('Documents');
    expect(html).toContain('Review');
  });

  it('renders EmployeeEditPage loading state when fetching profile', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/hrms/workforce/employees/emp_1792670253491_39c00882/edit']}>
        <EmployeeEditPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Loading employee workspace for editing...');
  });

  it('renders StandaloneUtilityLayout in edit mode as clean full-width workspace without duplicate utility top bar or companion rail', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/hrms/workforce/employees/emp_1792670253491_39c00882/edit']}>
        <ThemeProvider>
          <StandaloneUtilityLayout />
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Redundant top bar is removed so the workspace renders full-width without header duplication
    expect(html).not.toContain('standalone-header');
    expect(html).not.toContain('standalone-companion-rail');
    expect(html).toContain('standalone-layout--registration');
  });

  it('renders StandaloneUtilityLayout with Workspace and companion rail on standard utility routes', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/calendar']}>
        <ThemeProvider>
          <StandaloneUtilityLayout />
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Standard Workspace header
    expect(html).toContain('Workspace');
    expect(html).toContain('Calendar');

    // Utility side controls are present
    expect(html).toContain('standalone-header__side-toggle');
    expect(html).toContain('standalone-companion-rail');
  });

  it('renders Parent / Guardian Details as a single section heading without duplicate form field label', () => {
    const dummyConfigWithPG = {
      sections: [{ id: 'personal', label: 'Personal Information', configurable: true }],
      fields: [
        {
          key: 'personal.parentGuardians',
          section: 'personal',
          label: 'Parent / Guardian Details',
          type: 'text' as const,
          category: 'Personal Information',
          protected: false,
          protectedReason: null,
          configurable: true,
          enabled: true,
          required: false,
          defaultEnabled: true,
          defaultRequired: false,
          overridden: false,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RegistrationConfigProvider configuration={dummyConfigWithPG}>
          <PersonalInformation
            data={{
              parentGuardians: [{ id: 'pg_1', relationship: 'Father', name: 'John Turing' }],
            }}
          />
        </RegistrationConfigProvider>
      </MemoryRouter>,
    );

    // The heading and action button are rendered cleanly
    expect(html).toContain('Parent / Guardian Details');
    expect(html).toContain('+ Add Parent / Guardian');
    expect(html).toContain('Parent / Guardian #1');
    expect(html).toContain('John Turing');

    // FormField does not generate a duplicate left-column label before the toolbar
    // Count occurrences of "Parent / Guardian Details" - should appear exactly once (in CardTitle)
    const matches = html.match(/Parent \/ Guardian Details/g);
    expect(matches?.length).toBe(1);
  });
});
