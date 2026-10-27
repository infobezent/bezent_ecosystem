import type { EmploymentStatus, EmploymentType, SourceOfHire } from '../api/employeesApi';

/** Canonical employee route base. The Employee Directory lives here. */
export const EMPLOYEES_PATH = '/hrms/workforce/employees';
export const LEGACY_EMPLOYEES_PATH = '/hrms/administration/employees';

/** The single canonical Employee Profile location. */
export function employeeProfilePath(employeeId: string): string {
  return `${EMPLOYEES_PATH}/${encodeURIComponent(employeeId)}`;
}

/** The standalone Employee Edit workspace location. */
export function employeeEditPath(employeeId: string): string {
  return `${EMPLOYEES_PATH}/${encodeURIComponent(employeeId)}/edit`;
}

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  pending_activation: 'Pending Activation',
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
    case 'pending_activation':
    case 'resigned':
    default:
      return 'neutral';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1]![0] || '';
    return `${first}${last}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const AVATAR_COLORS: ('blue' | 'pink' | 'purple' | 'amber' | 'green' | 'cyan')[] = [
  'blue',
  'pink',
  'purple',
  'amber',
  'green',
  'cyan',
];

export function getAvatarColor(
  id: string,
): 'blue' | 'pink' | 'purple' | 'amber' | 'green' | 'cyan' {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

/**
 * Canonical verified 3D human avatars used for workforce directory representation.
 */
export const DIRECTORY_3D_AVATARS: readonly string[] = [
  'human-3d-dev-male',
  'human-3d-exec-female',
  'human-3d-product-male',
  'human-3d-hr-female',
  'human-3d-lead-female',
  'human-3d-finance-male',
  'human-classic-male',
  'human-classic-female',
] as const;

/**
 * Returns a stable, deterministic 3D avatar ID for an employee based on their ID or employee number,
 * ensuring consistent and diverse 3D avatars across the workforce directory.
 */
export function getEmployeeAvatarId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return DIRECTORY_3D_AVATARS[Math.abs(hash) % DIRECTORY_3D_AVATARS.length]!;
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
