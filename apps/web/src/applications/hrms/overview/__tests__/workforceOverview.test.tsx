import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { WorkforceOverviewPage } from '../pages/WorkforceOverviewPage';

describe('Workforce Overview Page', () => {
  it('renders page header with title, subtitle, and eyebrow', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Overview');
    expect(html).toContain(
      'Your central view of employee activity, workforce changes, and pending actions.',
    );
    expect(html).toContain('HRMS · Workforce');
  });

  it('renders all 6 approved KPI summary cards cleanly', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Employees');
    expect(html).toContain('Active Employees');
    expect(html).toContain('Onboarding');
    expect(html).toContain('Pending Approvals');
    expect(html).toContain('Upcoming Changes');
    expect(html).toContain('Offboarding');
  });

  it('renders Pending Actions and Recent Workforce Activity sections', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Pending Actions');
    expect(html).toContain('Recent Workforce Activity');
  });

  it('renders all 6 Workforce module shortcuts with clean concise descriptions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Modules');

    // Employees
    expect(html).toContain('Employees');
    expect(html).toContain('Profiles &amp; hierarchy');

    // Onboarding
    expect(html).toContain('Onboarding');
    expect(html).toContain('Preboarding &amp; induction');

    // Transfers
    expect(html).toContain('Transfers');
    expect(html).toContain('Internal mobility');

    // Promotions
    expect(html).toContain('Promotions');
    expect(html).toContain('Designations &amp; levels');

    // Offboarding
    expect(html).toContain('Offboarding');
    expect(html).toContain('Exits &amp; clearances');

    // Records
    expect(html).toContain('Records');
    expect(html).toContain('Compliance &amp; documents');
  });

  it('renders the header action with Refresh button', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Refresh');
  });

  it('renders Quick Actions launchpad with 4 primary operational shortcuts', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Quick Actions');
    expect(html).toContain('Add Employee');
    expect(html).toContain('Directory');
    expect(html).toContain('Transfer');
    expect(html).toContain('Promotion');
  });

  it('renders Workforce Demographics and Upcoming Milestones & Celebrations cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Demographics');
    expect(html).toContain('Upcoming Milestones &amp; Celebrations');
  });

  it('renders New Hire & Onboarding Radar and Today\'s Availability pulse cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('New Hire &amp; Onboarding Radar');
    expect(html).toContain("Today&#x27;s Availability");
    expect(html).toContain('In Office');
    expect(html).toContain('On-Duty');
    expect(html).toContain('On Leave');
    expect(html).toContain('Remote');
  });
});
