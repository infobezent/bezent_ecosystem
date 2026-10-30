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

  it('renders all 6 approved KPI summary cards with captions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    // 1. Total Employees
    expect(html).toContain('Total Employees');
    expect(html).toContain('Total workforce headcount');

    // 2. Active Employees
    expect(html).toContain('Active Employees');
    expect(html).toContain('Active employment status');

    // 3. Onboarding
    expect(html).toContain('Onboarding');
    expect(html).toContain('In preboarding &amp; induction');

    // 4. Pending Approvals
    expect(html).toContain('Pending Approvals');
    expect(html).toContain('Awaiting review or verification');

    // 5. Upcoming Changes
    expect(html).toContain('Upcoming Changes');
    expect(html).toContain('Approved future-dated transfers &amp; promotions');

    // 6. Offboarding
    expect(html).toContain('Offboarding');
    expect(html).toContain('Ongoing exits &amp; notice periods');
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

  it('renders all 6 Workforce module shortcuts with correct descriptions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Modules');

    // Employees
    expect(html).toContain('Employees');
    expect(html).toContain(
      'Directory, employee profiles, department mapping, and organization hierarchy.',
    );

    // Onboarding
    expect(html).toContain(
      'Preboarding stages, induction checklists, documents, and new hire conversion.',
    );

    // Transfers
    expect(html).toContain('Transfers');
    expect(html).toContain(
      'Internal job mobility, department changes, reporting manager, and location moves.',
    );

    // Promotions
    expect(html).toContain('Promotions');
    expect(html).toContain(
      'Designation advancements, career grade elevations, and compensation revisions.',
    );

    // Offboarding
    expect(html).toContain(
      'Exit requests, notice periods, departmental clearances, and final settlements.',
    );

    // Records
    expect(html).toContain('Records');
    expect(html).toContain(
      'Centralized employee documents, compliance credentials, and verification status.',
    );
  });

  it('renders the header action with Refresh button', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Refresh');
  });
});
