import type { EmploymentStatus, EmploymentType, SourceOfHire } from '../api/employeesApi';

/** Canonical employee route base. The Employee Directory lives here. */
export const EMPLOYEES_PATH = '/hrms/administration/employees';

/** The single canonical Employee Profile location. */
export function employeeProfilePath(employeeId: string): string {
  return `${EMPLOYEES_PATH}/${encodeURIComponent(employeeId)}`;
}

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  probation: 'Probation',
  notice: 'Notice Period',
  terminated: 'Terminated',
  suspended: 'Suspended',
  resigned: 'Resigned',
};

export function employmentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function employmentStatusVariant(
  status: EmploymentStatus,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'probation':
      return 'info';
    case 'notice':
    case 'suspended':
      return 'warning';
    case 'terminated':
      return 'danger';
    default:
      return 'neutral';
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Formats YYYY-MM-DD dates (calendar dates, no timezone shift) and ISO timestamps. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  if (DATE_ONLY.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export const SOURCE_OF_HIRE_LABELS: Record<SourceOfHire, string> = {
  direct_applicant: 'Direct Applicant',
  referral: 'Referral',
  agency: 'Agency',
  campus: 'Campus',
  linkedin: 'LinkedIn',
  other: 'Other',
};

export function formatNoticePeriod(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return 'No notice period';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
