import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { WorkforceAnalyticsCard } from '../components/WorkforceAnalyticsCard';
import type { EmployeeRecord } from '../../employees/api/employeesApi';

const MOCK_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp_1',
    employeeNumber: 'EMP001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    fullName: 'Aarav Sharma',
    email: 'aarav@company.com',
    phone: null,
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_se',
    designationName: 'Software Engineer',
    locationId: 'loc_blr',
    locationName: 'Bangalore HQ',
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2025-01-15',
    probationEndDate: null,
    confirmationDate: '2025-04-15',
    lastWorkingDate: null,
    sourceOfHire: null,
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'active',
  },
  {
    id: 'emp_2',
    employeeNumber: 'EMP002',
    firstName: 'Diya',
    lastName: 'Patel',
    fullName: 'Diya Patel',
    email: 'diya@company.com',
    phone: null,
    departmentId: 'dept_des',
    departmentName: 'Design',
    designationId: 'desig_ui',
    designationName: 'UI Designer',
    locationId: 'loc_chn',
    locationName: 'Chennai (HQ)',
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2025-02-01',
    probationEndDate: null,
    confirmationDate: '2025-05-01',
    lastWorkingDate: null,
    sourceOfHire: null,
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'active',
  },
  {
    id: 'emp_3',
    employeeNumber: 'EMP003',
    firstName: 'Karan',
    lastName: 'Mehta',
    fullName: 'Karan Mehta',
    email: 'karan@company.com',
    phone: null,
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_qa',
    designationName: 'QA Engineer',
    locationId: 'loc_blr',
    locationName: 'Bangalore HQ',
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2024-06-01',
    probationEndDate: null,
    confirmationDate: '2024-09-01',
    lastWorkingDate: '2025-11-30',
    sourceOfHire: null,
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'resigned',
  },
];

describe('WorkforceAnalyticsCard – Single Card with Dynamic Views', () => {
  it('renders Card Header with title and analytics icon on a unified row', () => {
    const html = renderToStaticMarkup(<WorkforceAnalyticsCard />);

    expect(html).toContain('Workforce Analytics');
    expect(html).toContain('bezent-wf-analytics-card__icon');
    expect(html).not.toContain(
      'Understand workforce distribution, growth and retention trends.',
    );
  });

  it('renders Dropdown 1 (Analytics Category) with Distribution, Growth, and Retention options', () => {
    const html = renderToStaticMarkup(<WorkforceAnalyticsCard />);

    expect(html).toContain('Analytics Category');
    expect(html).toContain('Distribution');
    expect(html).toContain('Growth');
    expect(html).toContain('Retention');
  });

  it('renders Dropdown 2 (Distribution By) when Distribution category is selected', () => {
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard selectedCategory="distribution" />,
    );

    expect(html).toContain('Distribution By');
    expect(html).toContain('Department');
    expect(html).toContain('Branch');
    expect(html).toContain('Employment Type');
    expect(html).toContain('Job Level');
  });

  it('renders View A: Workforce Distribution with Donut chart and legend from live employees', () => {
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard
        employees={MOCK_EMPLOYEES}
        selectedCategory="distribution"
        selectedDistributionBy="department"
      />,
    );

    expect(html).toContain('bezent-wf-donut-analytics-svg');
    expect(html).toContain('Engineering');
    expect(html).toContain('Design');
    expect(html).toContain('Total Employees');
  });

  it('renders View B: Growth with Time Period filter and clean trend line chart', () => {
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard
        employees={MOCK_EMPLOYEES}
        selectedCategory="growth"
      />,
    );

    // Time Period dropdown
    expect(html).toContain('Time Period');
    expect(html).toContain('Monthly');

    // Clean Trend chart SVG without cluttered metrics
    expect(html).toContain('bezent-wf-line-chart-svg');
    expect(html).not.toContain('bezent-wf-analytics-metrics-row');
    expect(html).not.toContain('bezent-wf-analytics-insights-row');
  });

  it('renders View C: Retention with Time Period filter and clean trend line chart', () => {
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard
        employees={MOCK_EMPLOYEES}
        selectedCategory="retention"
      />,
    );

    // Time Period dropdown
    expect(html).toContain('Time Period');

    // Clean Trend chart SVG without cluttered metrics
    expect(html).toContain('bezent-wf-line-chart-svg');
    expect(html).not.toContain('bezent-wf-analytics-metrics-row');
    expect(html).not.toContain('bezent-wf-analytics-insights-row');
  });

  it('renders loading skeleton state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<WorkforceAnalyticsCard loading={true} />);

    expect(html).toContain('bezent-wf-analytics-skeleton');
  });

  it('renders empty state when there are no employee records', () => {
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard employees={[]} loading={false} />,
    );

    expect(html).toContain('No Employee Data Available');
  });

  it('renders error state with retry option when error prop is passed', () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(
      <WorkforceAnalyticsCard
        error="Unable to fetch analytics data"
        onRetry={onRetry}
      />,
    );

    expect(html).toContain('Failed to load workforce analytics');
    expect(html).toContain('Unable to fetch analytics data');
    expect(html).toContain('Retry');
  });
});
