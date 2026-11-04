import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  WorkforceKpiCards,
  WorkforceRing,
  WorkforceSkyline,
  WorkforceNetwork,
  OnboardingPathway,
  ArchiveVault,
  computeWorkforceMonthlyTrends,
} from '../components/WorkforceKpiCards';
import type { EmployeeRecord } from '../api/employeesApi';

describe('WorkforceKpiCards (Number + Mini Trend Chart)', () => {
  const sampleEmployees: EmployeeRecord[] = [
    {
      id: 'emp_01',
      employeeNumber: 'EMP-001',
      firstName: 'Vikram',
      lastName: 'Seth',
      fullName: 'Vikram Seth',
      email: 'vikram@example.com',
      phone: null,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      designationId: 'desig_se',
      designationName: 'Staff Engineer',
      locationId: 'loc_hq',
      locationName: 'HQ',
      reportingManagerId: null,
      reportingManagerName: null,
      joiningDate: '2026-05-10',
      probationEndDate: null,
      confirmationDate: '2026-05-10',
      lastWorkingDate: null,
      sourceOfHire: 'direct_applicant',
      noticePeriodDays: 30,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'active',
    },
    {
      id: 'emp_02',
      employeeNumber: 'EMP-002',
      firstName: 'Ananya',
      lastName: 'Rao',
      fullName: 'Ananya Rao',
      email: 'ananya@example.com',
      phone: null,
      departmentId: 'dept_hr',
      departmentName: 'Human Resources',
      designationId: 'desig_hr',
      designationName: 'HR Manager',
      locationId: 'loc_hq',
      locationName: 'HQ',
      reportingManagerId: null,
      reportingManagerName: null,
      joiningDate: '2026-06-15',
      probationEndDate: '2026-12-15',
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: 'referral',
      noticePeriodDays: 30,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'probation',
    },
    {
      id: 'emp_03',
      employeeNumber: 'EMP-003',
      firstName: 'Rohan',
      lastName: 'Sharma',
      fullName: 'Rohan Sharma',
      email: 'rohan@example.com',
      phone: null,
      departmentId: 'dept_eng',
      departmentName: 'Engineering',
      designationId: 'desig_se',
      designationName: 'Software Engineer',
      locationId: 'loc_hq',
      locationName: 'HQ',
      reportingManagerId: null,
      reportingManagerName: null,
      joiningDate: '2026-08-01',
      probationEndDate: null,
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: 'campus',
      noticePeriodDays: 30,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'pending_activation',
    },
  ];

  it('renders all four KPI cards with prominent values, titles, subtitles, and accents', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: 14,
          active: 13,
          pendingActivation: 1,
          inactive: 0,
          loading: false,
        }}
        employees={sampleEmployees}
        referenceDate={new Date(2026, 7, 15)} // August 2026
      />,
    );

    // Titles
    expect(html).toContain('Total Employees');
    expect(html).toContain('Active Employees');
    expect(html).toContain('Pending Activation');
    expect(html).toContain('Inactive Employees');

    // Values
    expect(html).toContain('14');
    expect(html).toContain('13');
    expect(html).toContain('1');
    expect(html).toContain('0');

    // Accent badges
    expect(html).toContain('bezent-trend-kpi-card__icon-badge--blue');
    expect(html).toContain('bezent-trend-kpi-card__icon-badge--green');
    expect(html).toContain('bezent-trend-kpi-card__icon-badge--amber');
    expect(html).toContain('bezent-trend-kpi-card__icon-badge--coral');

    // Tooltip info buttons
    expect(html).toContain('Total count of all recorded employees across all statuses.');
    expect(html).toContain(
      'Employees with confirmed active or probation status eligible for daily operations.',
    );
  });

  it('renders clean minimal executive metric cards without cluttered chart illustrations', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: 14,
          active: 13,
          pendingActivation: 1,
          inactive: 0,
          loading: false,
        }}
        employees={sampleEmployees}
        referenceDate={new Date(2026, 7, 15)}
      />,
    );

    // Cards render clean values and titles with minimalist sparkline wave charts, without cluttered illustrations
    expect(html).toContain('bezent-trend-kpi-card__chart');
    expect(html).toContain('bezent-trend-kpi-card__chart-svg');
    expect(html).not.toContain('bezent-workforce-skyline');
    expect(html).not.toContain('bezent-workforce-network');
    expect(html).not.toContain('bezent-onboarding-pathway');
    expect(html).not.toContain('bezent-archive-vault');
  });

  it('exports and renders standalone workforce visual components cleanly', () => {
    const skylineHtml = renderToStaticMarkup(<WorkforceSkyline />);
    expect(skylineHtml).toContain('bezent-workforce-skyline');
    expect(skylineHtml).toContain('bezent-workforce-skyline__person--hero');

    const networkHtml = renderToStaticMarkup(<WorkforceNetwork />);
    expect(networkHtml).toContain('bezent-workforce-network');
    expect(networkHtml).toContain('bezent-workforce-network__employee-node');

    const pathwayHtml = renderToStaticMarkup(<OnboardingPathway />);
    expect(pathwayHtml).toContain('bezent-onboarding-pathway');

    const vaultHtml = renderToStaticMarkup(<ArchiveVault />);
    expect(vaultHtml).toContain('bezent-archive-vault');
    expect(vaultHtml).toContain('bezent-archive-vault__badge');
    expect(vaultHtml).toContain('bezent-archive-vault__transition');
    expect(vaultHtml).toContain('bezent-archive-vault__exit-seal');
  });

  it('exports and renders WorkforceRing component cleanly', () => {
    const html = renderToStaticMarkup(<WorkforceRing />);
    expect(html).toContain('bezent-workforce-ring');
    expect(html).toContain('bezent-workforce-ring__svg');
    expect(html).toContain('bezent-workforce-ring__bg');
    expect(html).toContain('bezent-workforce-ring__segment');
    expect(html).toContain('bezent-workforce-ring__icon');
  });

  it('renders clean neutral dashed baseline placeholder when historical data is missing or empty', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: 14,
          active: 13,
          pendingActivation: 1,
          inactive: 0,
          loading: false,
        }}
        employees={[]} // No historical employees
      />,
    );

    // Does NOT render fake growth percentages or fake trend indicators
    expect(html).not.toContain('bezent-trend-kpi-card__trend');
    // Renders the subtitles as honest fallback
    expect(html).toContain('Total recorded workforce');
    expect(html).toContain('Confirmed active employees');
  });

  it('renders skeleton shimmer placeholders during loading state', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: null,
          active: null,
          pendingActivation: null,
          inactive: null,
          loading: true,
        }}
      />,
    );

    expect(html).toContain('bezent-kpi-card__skeleton');
    expect(html).toContain('aria-label="Loading metric"');
  });

  it('renders "—" fallback when KPI values are null', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: null,
          active: null,
          pendingActivation: null,
          inactive: null,
          loading: false,
        }}
      />,
    );

    expect(html).toContain('—');
  });

  it('supports zero values gracefully', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: 0,
          active: 0,
          pendingActivation: 0,
          inactive: 0,
          loading: false,
        }}
        employees={[]}
      />,
    );

    // Value 0 is rendered cleanly
    expect(html).toContain('<div class="bezent-trend-kpi-card__value">0</div>');
  });

  it('highlights the active card based on activeStatusTab and renders pastel tone classes', () => {
    const html = renderToStaticMarkup(
      <WorkforceKpiCards
        kpis={{
          total: 14,
          active: 13,
          pendingActivation: 1,
          inactive: 0,
          loading: false,
        }}
        activeStatusTab="active"
      />,
    );

    expect(html).toContain('bezent-trend-kpi-card--blue');
    expect(html).toContain('bezent-trend-kpi-card--green');
    expect(html).toContain('bezent-trend-kpi-card--amber');
    expect(html).toContain('bezent-trend-kpi-card--coral');
    expect(html).toContain('is-active');
  });

  describe('computeWorkforceMonthlyTrends helper', () => {
    it('returns null trends for empty employee list without faking data', () => {
      const result = computeWorkforceMonthlyTrends([]);
      expect(result.total.trendData).toBeNull();
      expect(result.total.trendChange).toBeNull();
      expect(result.active.trendData).toBeNull();
    });

    it('calculates real monthly trend series and positive delta change correctly', () => {
      const result = computeWorkforceMonthlyTrends(sampleEmployees, new Date(2026, 7, 15));
      expect(result.total.trendData).toBeDefined();
      expect(result.total.trendData?.length).toBe(6);
      expect(result.total.trendChange?.direction).toBe('up');
      expect(result.total.trendChange?.label).toContain('+1 this month');
    });
  });
});
