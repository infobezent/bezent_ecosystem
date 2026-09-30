import type { AccessOverview, CompanyAccess } from './authApi';

export interface ResolvedProfileIdentity {
  userName: string;
  userEmail: string;
  userInitials: string;
  userRole: string;
}

/**
 * Derives informational user display properties (name, email, initials, contextual access badge)
 * from the authenticated session and active company access.
 *
 * NOTE: The derived role badge is informational for user context only.
 * Application authorization remains strictly permission-based.
 */
export function resolveProfileIdentity(
  access: AccessOverview | null,
  activeCompany: CompanyAccess | null,
): ResolvedProfileIdentity {
  const user = access?.user;
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'User';
  const userEmail = user?.email || '';

  let userInitials = 'U';
  if (user) {
    const first = user.firstName?.trim()?.[0] || '';
    const last = user.lastName?.trim()?.[0] || '';
    if (first && last) {
      userInitials = (first + last).toUpperCase();
    } else if (first) {
      userInitials = first.toUpperCase();
    } else if (user.email) {
      userInitials = user.email[0]!.toUpperCase();
    }
  }

  let userRole = 'Member';
  if (user?.isSuperAdmin) {
    userRole = 'Super Admin';
  } else if (activeCompany) {
    if (
      activeCompany.isPlatformOversight ||
      activeCompany.roles.some((r) => r.code === 'company_admin')
    ) {
      userRole = 'Company Admin';
    } else if (activeCompany.roles.some((r) => r.code === 'hr_manager' || r.code === 'hr')) {
      userRole = 'HR • HRMS';
    } else if (activeCompany.roles.some((r) => r.code === 'manager')) {
      userRole = 'Manager • HRMS';
    } else if (
      activeCompany.essEligible ||
      activeCompany.roles.some((r) => r.code === 'employee')
    ) {
      userRole = 'Employee • ESS';
    } else if (activeCompany.roles[0]) {
      const firstRole = activeCompany.roles[0];
      userRole = firstRole.moduleCode
        ? `${firstRole.name} • ${firstRole.moduleCode.toUpperCase()}`
        : firstRole.name;
    }
  }

  return {
    userName,
    userEmail,
    userInitials,
    userRole,
  };
}
