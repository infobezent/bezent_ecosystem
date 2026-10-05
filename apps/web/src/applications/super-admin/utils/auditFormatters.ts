import type { AuditLogEntry } from '../api/superAdminApi';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Customer / Tenant
  tenant_created: 'Customer Created',
  tenant_updated: 'Customer Details Updated',
  tenant_suspended: 'Customer Suspended',
  tenant_reactivated: 'Customer Reactivated',
  tenant_activated: 'Customer Activated',
  customer_provisioned: 'Customer Provisioned',

  // Company
  company_created: 'Company Created',
  company_updated: 'Company Details Updated',
  company_suspended: 'Company Suspended',
  company_reactivated: 'Company Reactivated',
  company_activated: 'Company Activated',
  company_profile_updated: 'Company Profile Updated',

  // Company Administrator
  company_admin_assigned: 'Company Administrator Assigned',
  company_admin_revoked: 'Company Administrator Revoked',
  company_admin_invitation_resent: 'Administrator Invitation Resent',

  // Company Users
  company_user_invited: 'Company User Invited',
  company_user_role_updated: 'Company User Role Updated',
  company_user_status_updated: 'Company User Access Status Updated',
  company_invitation_resent: 'User Invitation Resent',
  company_invitation_cancelled: 'User Invitation Cancelled',

  // Applications
  module_enabled: 'Application Enabled',
  module_disabled: 'Application Disabled',

  // Platform Users
  user_created: 'Platform User Created',
  user_status_changed: 'User Account Status Changed',
  user_role_changed: 'Super Admin Privileges Updated',

  // Authentication & Security
  otp_requested: 'Sign-In OTP Requested',
  otp_verified: 'Sign-In OTP Verified',
  otp_failed: 'Invalid OTP Attempt',
  otp_locked: 'OTP Challenge Locked',
  user_logged_in: 'User Sign-In Completed',
  user_logged_out: 'User Sign-Out',

  // Access & Roles
  custom_role_created: 'Custom Role Created',
  custom_role_updated: 'Custom Role Updated',
  role_permissions_changed: 'Role Permissions Modified',
  role_assigned: 'Role Assigned',
  role_revoked: 'Role Revoked',

  // Organization Masters
  'work_location.create': 'Work Location Created',
  'work_location.update': 'Work Location Updated',
  'work_location.deactivate': 'Work Location Deactivated',
  'work_location.reactivate': 'Work Location Reactivated',
  'department.create': 'Department Created',
  'job_level.create': 'Job Level Created',
  'job_level.update': 'Job Level Updated',
  'grade.create': 'Grade Created',
  'grade.update': 'Grade Updated',
  'designation.create': 'Designation Created',
  'designation.deactivate': 'Designation Deactivated',
  'designation.reactivate': 'Designation Reactivated',
};

export const CANONICAL_AUDIT_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Event Types' },
  { value: 'tenant_created', label: 'Customer Created' },
  { value: 'tenant_suspended', label: 'Customer Suspended' },
  { value: 'tenant_reactivated', label: 'Customer Reactivated' },
  { value: 'customer_provisioned', label: 'Customer Provisioned' },
  { value: 'company_created', label: 'Company Created' },
  { value: 'company_admin_assigned', label: 'Company Administrator Assigned' },
  { value: 'company_admin_revoked', label: 'Company Administrator Revoked' },
  { value: 'module_enabled', label: 'Application Enabled' },
  { value: 'module_disabled', label: 'Application Disabled' },
  { value: 'user_created', label: 'Platform User Created' },
  { value: 'user_status_changed', label: 'User Account Status Changed' },
  { value: 'company_user_invited', label: 'Company User Invited' },
  { value: 'company_user_role_updated', label: 'Company User Role Updated' },
  { value: 'user_logged_in', label: 'User Sign-In Completed' },
  { value: 'otp_failed', label: 'Invalid OTP Attempt' },
  { value: 'otp_locked', label: 'OTP Challenge Locked' },
];

export function formatAuditAction(action: string): string {
  if (AUDIT_ACTION_LABELS[action]) {
    return AUDIT_ACTION_LABELS[action];
  }
  // Safe generic fallback for unknown/future action codes
  return action
    .replace(/[._]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getAuditActionBadgeVariant(
  action: string,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (
    action.includes('suspended') ||
    action.includes('revoked') ||
    action.includes('locked') ||
    action.includes('deactivate') ||
    action.includes('cancelled') ||
    action.includes('failed')
  ) {
    return 'danger';
  }
  if (
    action.includes('created') ||
    action.includes('activated') ||
    action.includes('reactivated') ||
    action.includes('enabled') ||
    action.includes('verified') ||
    action.includes('provisioned')
  ) {
    return 'success';
  }
  if (
    action.includes('updated') ||
    action.includes('assigned') ||
    action.includes('invited') ||
    action.includes('resent') ||
    action.includes('changed')
  ) {
    return 'info';
  }
  return 'neutral';
}

function formatTargetType(targetType: string): string {
  return targetType
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatModuleCode(code: string): string {
  switch (code) {
    case 'hrms':
      return 'HRMS';
    case 'crm':
      return 'CRM';
    case 'project_management':
      return 'Project Management';
    default:
      return code.toUpperCase();
  }
}

export function resolveAuditTarget(
  log: AuditLogEntry,
  tenantMap?: Map<string, string>,
  companyMap?: Map<string, string>,
): { label: string; type: string; id: string } {
  const typeLabel = formatTargetType(log.targetType);
  const meta = log.metadata ?? {};

  switch (log.targetType) {
    case 'tenant': {
      const name =
        log.tenantName ||
        (tenantMap ? tenantMap.get(log.targetId) : null) ||
        (meta.name as string) ||
        (meta.code as string);
      return {
        label: name || 'Historical Customer',
        type: 'Customer',
        id: log.targetId,
      };
    }
    case 'company': {
      const name =
        log.companyName ||
        (companyMap ? companyMap.get(log.targetId) : null) ||
        (meta.name as string) ||
        (meta.code as string);
      return {
        label: name || 'Historical Company',
        type: 'Company',
        id: log.targetId,
      };
    }
    case 'module': {
      return {
        label: formatModuleCode(log.targetId),
        type: 'Application',
        id: log.targetId,
      };
    }
    case 'user': {
      const email =
        (meta.email as string) ||
        (meta.userEmail as string) ||
        (log.actorUserId === log.targetId ? log.actorEmail : null);
      const name =
        meta.firstName && meta.lastName ? `${meta.firstName} ${meta.lastName}` : meta.name as string;
      return {
        label: name || email || 'User',
        type: 'User',
        id: log.targetId,
      };
    }
    case 'company_admin': {
      const email =
        (meta.adminEmail as string) ||
        (meta.email as string) ||
        (log.actorUserId === log.targetId ? log.actorEmail : null);
      return {
        label: email || 'Company Administrator',
        type: 'Administrator',
        id: log.targetId,
      };
    }
    case 'invitation': {
      const email = meta.email as string;
      return {
        label: email || 'Invitation',
        type: 'Invitation',
        id: log.targetId,
      };
    }
    case 'otp_challenge': {
      return {
        label: log.actorEmail || 'Sign-In Challenge',
        type: 'Challenge',
        id: log.targetId,
      };
    }
    default: {
      const title =
        (meta.name as string) ||
        (meta.title as string) ||
        (meta.code as string) ||
        typeLabel;
      return {
        label: title || 'Historical Target',
        type: typeLabel,
        id: log.targetId,
      };
    }
  }
}

export function resolveAuditContext(
  log: AuditLogEntry,
  tenantMap?: Map<string, string>,
  companyMap?: Map<string, string>,
): { customer: string; company?: string } {
  let customer = 'Platform';
  if (log.tenantName) {
    customer = log.tenantName;
  } else if (log.tenantId) {
    customer = (tenantMap && tenantMap.get(log.tenantId)) || log.tenantId;
  }

  let company: string | undefined;
  if (log.companyName) {
    company = log.companyName;
  } else if (log.companyId) {
    company = (companyMap && companyMap.get(log.companyId)) || log.companyId;
  }

  return { customer, company };
}

export function formatAuditTimestamp(dateStr: string): { date: string; time: string; full: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: '—', time: '—', full: '—' };
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      full: `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    };
  } catch {
    return { date: '—', time: '—', full: '—' };
  }
}
