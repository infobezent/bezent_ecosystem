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
    expect(html).toContain('Active Employees');
    expect(html).toContain('New Joiners');
    expect(html).toContain('Employee Exits');
    expect(html).toContain('Retention Rate');
    expect(html).toContain('Workforce Growth');
    expect(html).toContain('bezent-exec-kpi-card--blue');
    expect(html).toContain('bezent-exec-kpi-card--teal');
    expect(html).toContain('bezent-exec-kpi-card--amber');
    expect(html).toContain('bezent-exec-kpi-card--red');
    expect(html).toContain('bezent-exec-kpi-card--purple');
  });

  it('renders Tier 2: compact 3-line distribution chart card and live breakdown panel', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('bezent-wf-tier2-split');
    expect(html).toContain('bezent-wf-trend-card');
    expect(html).toContain('bezent-wf-dist-detail-card');
    expect(html).toContain('bezent-wf-trend-svg');
    expect(html).toContain('bezent-wf-trend-dull-line');
    expect(html).not.toContain('bezent-wf-trend-tooltip-bg');
    expect(html).toContain('01. Department Distribution');
    expect(html).toContain('02. Location Distribution');
    expect(html).toContain('03. Employment Type');
    expect(html).toContain('Day');
    expect(html).toContain('Month');
    expect(html).toContain('Year');
    expect(html).toContain('Largest Department');
    expect(html).toContain('Total Departments');
  });

  it('renders Tier 3: 2-column Experience & Job Level Distribution cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('bezent-wf-tier3-grid--two');
    expect(html).toContain('1. Experience Distribution');
    expect(html).toContain('2. Job Level Distribution');
  });

  it('renders Tier 4: Workforce Planning command deck and insights', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WorkforceOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Workforce Planning');
    expect(html).toContain('Approved Headcount');
    expect(html).toContain('Current Headcount');
    expect(html).toContain('Open Positions');
    expect(html).toContain('Headcount Gap');
    expect(html).toContain('Utilization');
    expect(html).toContain('Department Headcount &amp; Capacity');
    expect(html).toContain('Hiring Requirements');
    expect(html).toContain('Highest Staffing Gap');
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
