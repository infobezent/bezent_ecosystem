import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NewHireModal } from '../components/NewHireModal';
import { OnboardingPage } from '../pages/OnboardingPage';
import { StandaloneUtilityLayout } from '../../../../app/router/StandaloneUtilityLayout';
import { appRoutes } from '../../../../app/router/AppRouter';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import type { OrganizationMasters } from '../api/onboardingApi';

const mockMasters: OrganizationMasters = {
  company: { id: 'comp_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_02', name: 'Human Resources', code: 'HR' },
  ],
  designations: [
    { id: 'desig_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_02', name: 'Senior HR Specialist', code: 'SHR' },
  ],
  locations: [
    { id: 'loc_01', name: 'Chennai (HQ)', code: 'CHN', city: 'Chennai', country: 'India' },
    { id: 'loc_02', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru', country: 'India' },
  ],
};

describe('HRMS Onboarding UI Components & Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('NewHireModal renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <NewHireModal
        isOpen={false}
        onClose={() => {}}
        masters={mockMasters}
        onSubmit={async () => {}}
      />,
    );
    expect(html).toBe('');
  });

  it('NewHireModal renders complete modal structure when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <NewHireModal
        isOpen={true}
        onClose={() => {}}
        masters={mockMasters}
        onSubmit={async () => {}}
      />,
    );

    expect(html).toContain('Add New Hire');
    expect(html).toContain('Personal Details');
    expect(html).toContain('Employment Details');
    expect(html).toContain('BEZENT Demo Pvt Ltd');
    expect(html).toContain('Engineering');
    expect(html).toContain('Software Engineer');
    expect(html).toContain('Chennai (HQ)');
    expect(html).toContain('Joining Date');
    expect(html).toContain('Employment Type');
    expect(html).toContain('Create New Hire');
  });

  it('OnboardingPage renders header, description, add button, and real metrics', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    // Header
    expect(html).toContain('Onboarding');
    expect(html).toContain('Manage new hires from pre-joining through employee creation.');
    expect(html).toContain('Add New Hire');

    // Real Summary Metrics (strictly accurate, omitting unsupported joining soon/attention required)
    expect(html).toContain('Total New Hires');
    expect(html).toContain('In Progress');
    expect(html).toContain('Completed');

    // Stage Filter Tabs
    expect(html).toContain('All');
    expect(html).toContain('Preboarding');
    expect(html).toContain('Documents');
    expect(html).toContain('Completed');

    // Search
    expect(html).toContain('Search by name, email, department...');

    // No localStorage drafts or fake progress
    expect(html).not.toContain('View Drafts');
    expect(html).not.toContain('35%');
    expect(html).not.toContain('60%');
    expect(html).not.toContain('90%');
  });

  it('hrmsRoutes routes administration/onboarding to OnboardingPage', () => {
    const basePathRoute = hrmsRoutes[0];
    expect(basePathRoute).toBeDefined();

    const onboardingRoute = basePathRoute?.children?.find(
      (r) => r.path === 'administration/onboarding',
    );
    expect(onboardingRoute).toBeDefined();
    expect(onboardingRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(
      <MemoryRouter>{onboardingRoute!.element as React.ReactElement}</MemoryRouter>,
    );
    expect(html).toContain('Onboarding');
    expect(html).toContain('Manage new hires from pre-joining through employee creation.');
    expect(html).toContain('Add New Hire');
    expect(html).toContain('New Hires');
  });

  it('routes /hrms/administration/onboarding/registration to StandaloneUtilityLayout with EmployeeRegistrationPage', () => {
    const standaloneRoute = appRoutes.find(
      (r) => r.element && (r.element as React.ReactElement).type === StandaloneUtilityLayout,
    );
    expect(standaloneRoute).toBeDefined();
    const registrationRoute = standaloneRoute?.children?.find(
      (r) => r.path === '/hrms/administration/onboarding/registration',
    );
    expect(registrationRoute).toBeDefined();
    expect(registrationRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(
      <MemoryRouter>{registrationRoute!.element as React.ReactElement}</MemoryRouter>,
    );
    // Dedicated flush workspace structure & tokens — no padded Page wrapper
    expect(html).not.toContain('bezent-page--max-width');
    expect(html).toContain('bezent-page-header');
    expect(html).toContain('bezent-breadcrumb');
    expect(html).toContain('Employee Registration');
    expect(html).toContain('Add and manage new employee information');

    // 10 JourneyNav Steps remain completely frozen and intact
    expect(html).toContain('General');
    expect(html).toContain('Personal Information');
    expect(html).toContain('Administration');
    expect(html).toContain('Skills');
    expect(html).toContain('Emergency Contact');
    expect(html).toContain('Accounts');
    expect(html).toContain('Online Access');
    expect(html).toContain('Working Hours');
    expect(html).toContain('Documents');
    expect(html).toContain('Review');

    // Action buttons
    expect(html).toContain('Save Draft');
    expect(html).toContain('Cancel');
    expect(html).toContain('Save &amp; Next →');
  });

  it('hrmsRoutes routes administration/employee-administration to Employee Administration', () => {
    const basePathRoute = hrmsRoutes[0];
    const empAdminRoute = basePathRoute?.children?.find(
      (r) => r.path === 'administration/employee-administration',
    );
    expect(empAdminRoute).toBeDefined();
    expect(empAdminRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(
      <MemoryRouter>{empAdminRoute!.element as React.ReactElement}</MemoryRouter>,
    );
    expect(html).toContain('Employee Administration');
    expect(html).toContain('New Employee Action');
    expect(html).not.toContain('Add New Hire');
  });

  it('hrmsRoutes routes administration/documents to Documents destination', () => {
    const basePathRoute = hrmsRoutes[0];
    const docsRoute = basePathRoute?.children?.find((r) => r.path === 'administration/documents');
    expect(docsRoute).toBeDefined();
    expect(docsRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(
      <MemoryRouter>{docsRoute!.element as React.ReactElement}</MemoryRouter>,
    );
    expect(html).toContain('Documents');
    expect(html).toContain('Manage, verify and monitor employee documents.');
  });
});
