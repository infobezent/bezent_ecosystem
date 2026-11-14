import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { WorkforceOverviewPage } from '../pages/WorkforceOverviewPage';

describe('Workforce Overview Page', () => {
  it('renders page header with title and info popover trigger', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Overview');
    expect(html).toContain('bezent-wf-help-btn');
  });

  it('renders Tier 1: all 6 Executive KPI summary cards cleanly', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Total Employees');
    expect(html).toContain('Employees Onboarding');
    expect(html).toContain('Total Transfers');
    expect(html).toContain('Total Promotions');
    expect(html).toContain('Employees in Offboarding');
    expect(html).toContain('Workforce Compliance');
  });

  it('renders Workforce Analytics unified card with category and dynamic filters', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Analytics');
    expect(html).toContain('Distribution');
    expect(html).toContain('Growth');
    expect(html).toContain('Retention');
  });

  it('renders Tier 2: Executive Dual Deck with Workforce Analytics and Workforce Composition in one row', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('bezent-wf-executive-deck-grid');
    expect(html).toContain('Workforce Analytics');
    expect(html).toContain('Workforce Composition');
    expect(html).toContain('Largest Department');
    expect(html).toContain('Largest Location');
  });

  it('renders Workforce Composition single card with demographics and filter dropdowns', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Composition');
    expect(html).toContain('Gender');
    expect(html).toContain('Age Group');
    expect(html).toContain('Experience');
    expect(html).toContain('Tenure');
    expect(html).toContain('Employment Status');
  });

  it('renders Tier 4: Workforce Planning and Workforce Alerts 50/50 command row', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    // 50% + 50% two-column layout row
    expect(html).toContain('bezent-wf-planning-row');
    expect(html).toContain('bezent-wf-planning-card');
    expect(html).toContain('bezent-wf-alerts-card');

    // Card 1: Workforce Planning
    expect(html).toContain('Workforce Planning');
    expect(html).toContain('Workforce Capacity');
    expect(html).toContain('Planned Workforce');
    expect(html).toContain('Current Workforce');
    expect(html).toContain('Hiring Demand');
    expect(html).toContain('Expected Exits');

    // Card 2: Workforce Alerts
    expect(html).toContain('Workforce Alerts');
    expect(html).toContain('Documents Expiring');
    expect(html).toContain('Probation Reviews Due');
    expect(html).toContain('Attendance Exceptions');
  });

  it('renders Tier 5: Employee Lifecycle segmented pipeline', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Employee Lifecycle');
    expect(html).toContain(
      'Track workforce progression through hiring, onboarding, probation, confirmation, and alumni stages.',
    );
    expect(html).toContain('bezent-wf-lifecycle-box');
  });

  it('renders Tier 6: HR Action Center compact action card and structure cleanly', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('HR Action Center');
    expect(html).toContain('bezent-wf-action-card');
    expect(html).toContain('Pending reviews');
  });

  it('renders Tier 7: Recent Workforce Activity vertical timeline cleanly', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Recent Workforce Activity');
    expect(html).toContain('bezent-wf-timeline-card');
    expect(html).toContain('bezent-wf-timeline-track-line');
  });
});
