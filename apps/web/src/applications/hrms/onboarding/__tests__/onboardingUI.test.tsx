import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewHireModal } from '../components/NewHireModal';
import { OnboardingPage } from '../pages/OnboardingPage';
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

describe('HRMS Onboarding UI Components', () => {
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

  it('OnboardingPage renders header, add button, and filter tabs', () => {
    const html = renderToStaticMarkup(<OnboardingPage />);

    expect(html).toContain('Administration');
    expect(html).toContain('Add New Hire');
    expect(html).toContain('Preboarding');
    expect(html).toContain('Documents');
    expect(html).toContain('Completed');
    expect(html).toContain('Search by name, email, department...');
  });

  it('hrmsRoutes routes /hrms/onboarding to OnboardingPage', () => {
    const basePathRoute = hrmsRoutes[0];
    expect(basePathRoute).toBeDefined();

    const onboardingRoute = basePathRoute?.children?.find((r) => r.path === 'onboarding');
    expect(onboardingRoute).toBeDefined();
    expect(onboardingRoute?.element).toBeDefined();

    // Render the route element to verify it renders the real OnboardingPage
    const html = renderToStaticMarkup(onboardingRoute!.element as React.ReactElement);
    expect(html).toContain('Administration');
    expect(html).toContain('Add New Hire');
  });
});
