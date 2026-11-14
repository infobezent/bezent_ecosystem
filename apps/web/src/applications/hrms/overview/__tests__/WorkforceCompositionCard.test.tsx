import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { WorkforceCompositionCard } from '../components/WorkforceCompositionCard';
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
    locationName: 'Bengaluru HQ',
    gender: 'Male',
    dateOfBirth: '1998-05-15', // ~28 years old (25-34)
    totalExperienceYears: 4, // 3-5 Years
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2024-01-15', // ~2+ years tenure (1-3 Years)
    probationEndDate: null,
    confirmationDate: '2024-04-15',
    lastWorkingDate: null,
    sourceOfHire: 'direct_applicant',
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
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_lead',
    designationName: 'Lead Architect',
    locationId: 'loc_chn',
    locationName: 'Chennai',
    gender: 'Female',
    dateOfBirth: '1985-03-20', // ~41 years old (35-44)
    totalExperienceYears: 12, // 11-15 Years
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2021-02-01', // ~5+ years tenure (5+ Years)
    probationEndDate: null,
    confirmationDate: '2021-05-01',
    lastWorkingDate: null,
    sourceOfHire: 'direct_applicant',
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'active',
  },
  {
    id: 'emp_3',
    employeeNumber: 'EMP003',
    firstName: 'Priya',
    lastName: 'Nair',
    fullName: 'Priya Nair',
    email: 'priya@company.com',
    phone: null,
    departmentId: 'dept_hr',
    departmentName: 'Human Resources',
    designationId: 'desig_dir',
    designationName: 'HR Director',
    locationId: 'loc_cbe',
    locationName: 'Coimbatore',
    gender: 'Female',
    dateOfBirth: '1970-11-10', // ~55+ years old
    totalExperienceYears: 18, // 15+ Years
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2025-10-01', // ~4-5 months (Under 6 Months)
    probationEndDate: null,
    confirmationDate: null,
    lastWorkingDate: null,
    sourceOfHire: 'direct_applicant',
    noticePeriodDays: 60,
    contractEndDate: null,
    employmentType: 'contract',
    employmentStatus: 'probation',
  },
  {
    id: 'emp_4',
    employeeNumber: 'EMP004',
    firstName: 'Rohan',
    lastName: 'Verma',
    fullName: 'Rohan Verma',
    email: 'rohan@company.com',
    phone: null,
    departmentId: 'dept_fin',
    departmentName: 'Finance',
    designationId: 'desig_intern',
    designationName: 'Finance Intern',
    locationId: 'loc_blr',
    locationName: 'Bengaluru HQ',
    gender: 'Male',
    dateOfBirth: '2004-08-12', // ~22 years old (Under 25)
    totalExperienceYears: 1, // 0-2 Years
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2026-02-01', // ~1 month (Under 6 Months)
    probationEndDate: null,
    confirmationDate: null,
    lastWorkingDate: null,
    sourceOfHire: 'campus',
    noticePeriodDays: 15,
    contractEndDate: null,
    employmentType: 'intern',
    employmentStatus: 'notice',
  },
  {
    id: 'emp_separated',
    employeeNumber: 'EMP999',
    firstName: 'Ex',
    lastName: 'Employee',
    fullName: 'Ex Employee',
    email: 'ex@company.com',
    phone: null,
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_se',
    designationName: 'Software Engineer',
    locationId: 'loc_blr',
    locationName: 'Bengaluru HQ',
    gender: 'Male',
    dateOfBirth: '1990-01-01',
    totalExperienceYears: 8,
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2022-01-01',
    probationEndDate: null,
    confirmationDate: null,
    lastWorkingDate: '2026-01-01',
    sourceOfHire: 'direct_applicant',
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'terminated', // Excluded from active workforce
  },
];

describe('WorkforceCompositionCard', () => {
  it('renders card header with title and icon on unified row cleanly', () => {
    const html = renderToStaticMarkup(<WorkforceCompositionCard employees={MOCK_EMPLOYEES} />);

    expect(html).toContain('Workforce Composition');
    expect(html).toContain('bezent-wf-comp-icon-badge');
    expect(html).not.toContain('Explore your workforce structure and employee demographics.');
    // 4 active employees in donut chart center
    expect(html).toContain('4');
  });

  it('renders both Dropdown 1 (Composition By) and Dropdown 2 (Filter By) selection controls', () => {
    const html = renderToStaticMarkup(<WorkforceCompositionCard employees={MOCK_EMPLOYEES} />);

    // Dropdown labels
    expect(html).toContain('Composition By');
    expect(html).toContain('Filter By');

    // Dropdown 1 options
    expect(html).toContain('Gender');
    expect(html).toContain('Age Group');
    expect(html).toContain('Experience');
    expect(html).toContain('Tenure');
    expect(html).toContain('Employment Status');

    // Dropdown 2 default options
    expect(html).toContain('All Employees');
  });

  it('renders Gender composition as donut chart with legend and percentages by default', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="gender" />,
    );

    // Donut visualization SVG
    expect(html).toContain('bezent-wf-comp-donut-svg');
    expect(html).toContain('Male');
    expect(html).toContain('Female');
    // 2 Male, 2 Female out of 4 = 50% each
    expect(html).toContain('50%');
  });

  it('renders Age Group composition as donut chart with legend and percentages', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="age_group" />,
    );

    expect(html).toContain('Under 25');
    expect(html).toContain('25–34');
    expect(html).toContain('35–44');
    expect(html).toContain('45–54');
    expect(html).toContain('55+');
    expect(html).toContain('bezent-wf-comp-donut-svg');
    expect(html).toContain('bezent-wf-comp-donut-split');
  });

  it('renders Experience composition as donut chart with legend and percentages', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="experience" />,
    );

    expect(html).toContain('0–2 Years');
    expect(html).toContain('3–5 Years');
    expect(html).toContain('6–10 Years');
    expect(html).toContain('11–15 Years');
    expect(html).toContain('15+ Years');
    expect(html).toContain('bezent-wf-comp-donut-svg');
    expect(html).toContain('bezent-wf-comp-donut-split');
  });

  it('renders Tenure composition as donut chart with legend and percentages', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="tenure" />,
    );

    expect(html).toContain('Under 6 Months');
    expect(html).toContain('6–12 Months');
    expect(html).toContain('1–3 Years');
    expect(html).toContain('3–5 Years');
    expect(html).toContain('5+ Years');
    expect(html).toContain('bezent-wf-comp-donut-svg');
    expect(html).toContain('bezent-wf-comp-donut-split');
  });

  it('renders Employment Status composition as donut chart with canonical stages', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="employment_status" />,
    );

    expect(html).toContain('bezent-wf-comp-donut-svg');
    expect(html).toContain('Active');
    expect(html).toContain('Probation');
    expect(html).toContain('Notice Period');
  });

  it('renders clean composition view without cluttered bottom insights', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard employees={MOCK_EMPLOYEES} selectedDimension="gender" />,
    );

    expect(html).not.toContain('bezent-wf-comp-insights-row');
  });

  it('filters underlying population when Filter By is set to a specific department', () => {
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard
        employees={MOCK_EMPLOYEES}
        selectedDimension="gender"
        selectedFilter="dept_eng"
      />,
    );

    // In Engineering, Aarav is Male and Diya is Female -> 2 employees total
    expect(html).toContain('Engineering');
    expect(html).toContain('2');
  });

  it('renders skeleton loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<WorkforceCompositionCard loading={true} />);

    expect(html).toContain('bezent-wf-comp-skeleton-wrap');
    expect(html).toContain('bezent-wf-comp-skeleton-row');
  });

  it('renders empty state when there are no eligible active employees', () => {
    const html = renderToStaticMarkup(<WorkforceCompositionCard employees={[]} loading={false} />);

    expect(html).toContain('No workforce records found');
    expect(html).toContain(
      'No eligible employee records are available for this composition breakdown.',
    );
  });

  it('renders error state with retry option when error is present', () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(
      <WorkforceCompositionCard error="Failed to connect to HRMS database" onRetry={onRetry} />,
    );

    expect(html).toContain('Unable to load composition data');
    expect(html).toContain('Failed to connect to HRMS database');
    expect(html).toContain('Retry');
  });
});
