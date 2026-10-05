import type {
  CustomerHealth,
  CustomerHealthStatus,
  SetupProgress,
  SetupMilestone,
  TenantStatus,
} from '../types/tenant.types.js';

export interface EvaluationTenantInput {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: Date | string;
}

export interface EvaluationCompanyInput {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface EvaluationAdminInput {
  userId: string;
  companyId: string;
  status: string;
  email?: string | null;
  lastLoginAt?: Date | string | null;
}

export function evaluateCustomerHealth(
  tenant: EvaluationTenantInput,
  companies: EvaluationCompanyInput[],
  activeModules: string[],
  admins: EvaluationAdminInput[],
): CustomerHealth {
  const activeCompanies = companies.filter((c) => c.status === 'active');
  const activeAdmins = admins.filter((a) => a.status === 'active');
  const hasAdminLoggedIn = activeAdmins.some((a) => Boolean(a.lastLoginAt));

  // Critical checks
  if (tenant.status === 'suspended') {
    const reason = 'Tenant is suspended. Users are restricted from accessing all applications.';
    return {
      status: 'critical',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Reactivate Tenant',
        actionType: 'reactivate_tenant',
        targetTab: 'overview',
        description: 'Restore platform access for all companies and users under this customer.',
      },
    };
  }

  if (companies.length === 0) {
    const reason = 'No legal company entity has been created under this customer account.';
    return {
      status: 'critical',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Create Company',
        actionType: 'create_company',
        targetTab: 'companies',
        targetPath: '/super-admin/companies',
        description: 'Set up the primary legal entity so administrators and users can be onboarded.',
      },
    };
  }

  if (activeAdmins.length === 0) {
    const reason = 'No active Company Administrator is assigned to manage this customer account.';
    return {
      status: 'critical',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Assign Administrator',
        actionType: 'assign_admin',
        targetTab: 'administrators',
        description: 'Assign a designated administrator to manage company settings and users.',
      },
    };
  }

  // Needs Attention checks
  if (activeCompanies.length === 0) {
    const reason = 'All companies under this tenant are currently inactive or suspended.';
    return {
      status: 'needs_attention',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Review Companies',
        actionType: 'review_companies',
        targetTab: 'companies',
        targetPath: '/super-admin/companies',
        description: 'Activate at least one company to allow customer users to access services.',
      },
    };
  }

  if (activeModules.length === 0) {
    const reason = 'No business application entitlements are active for this customer.';
    return {
      status: 'needs_attention',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Configure Applications',
        actionType: 'configure_applications',
        targetTab: 'applications',
        description: 'Enable HRMS or other platform modules in the customer entitlement ceiling.',
      },
    };
  }

  if (!hasAdminLoggedIn) {
    const reason = 'Company Administrator has been assigned but has not yet signed in.';
    return {
      status: 'needs_attention',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Resend Admin Invitation',
        actionType: 'resend_invitation',
        targetTab: 'administrators',
        description: 'Send sign-in instructions via Email OTP to the designated administrator.',
      },
    };
  }

  const assignedCompanyIds = new Set(activeAdmins.map((a) => a.companyId));
  const companiesWithoutAdmin = activeCompanies.filter((c) => !assignedCompanyIds.has(c.id));
  if (companies.length > 1 && companiesWithoutAdmin.length > 0) {
    const reason = `${companiesWithoutAdmin.length} compan${companiesWithoutAdmin.length > 1 ? 'ies' : 'y'} in this tenant do not have an assigned Company Administrator.`;
    return {
      status: 'needs_attention',
      reason,
      reasons: [reason],
      nextBestAction: {
        label: 'Assign Administrator',
        actionType: 'assign_admin',
        targetTab: 'administrators',
        description: `Assign a Company Administrator for ${companiesWithoutAdmin[0]?.name || 'unmanaged company'}.`,
      },
    };
  }

  const healthyReason = 'Account is fully configured with active administrators and application entitlements.';
  return {
    status: 'healthy',
    reason: healthyReason,
    reasons: [healthyReason],
    nextBestAction: null,
  };
}

export function evaluateSetupProgress(
  tenant: EvaluationTenantInput,
  companies: EvaluationCompanyInput[],
  activeModules: string[],
  admins: EvaluationAdminInput[],
): SetupProgress {
  const activeAdmins = admins.filter((a) => a.status === 'active');
  const hasAdminLoggedIn = activeAdmins.some((a) => Boolean(a.lastLoginAt));

  const milestones: SetupMilestone[] = [
    {
      key: 'tenant_created',
      label: 'Customer Tenant Created',
      title: 'Customer Tenant Created',
      completed: true,
      description: 'Tenant account and root isolation boundary registered',
      completedAt: typeof tenant.createdAt === 'string' ? tenant.createdAt : tenant.createdAt.toISOString(),
    },
    {
      key: 'company_created',
      label: 'Primary Company Created',
      title: 'Primary Company Created',
      completed: companies.length > 0,
      description:
        companies.length > 0
          ? `Primary legal entity '${companies[0]?.name}' created`
          : 'No legal company created yet',
    },
    {
      key: 'applications_entitled',
      label: 'Application Entitlements Assigned',
      title: 'Application Entitlements Assigned',
      completed: activeModules.length > 0,
      description:
        activeModules.length > 0
          ? `${activeModules.length} application${activeModules.length > 1 ? 's' : ''} entitled (${activeModules.map((m) => m.toUpperCase()).join(', ')})`
          : 'No application entitlements configured',
    },
    {
      key: 'admin_assigned',
      label: 'Company Administrator Assigned',
      title: 'Company Administrator Assigned',
      completed: activeAdmins.length > 0,
      description:
        activeAdmins.length > 0
          ? `${activeAdmins.length} Company Administrator${activeAdmins.length > 1 ? 's' : ''} assigned`
          : 'No administrator assigned',
    },
    {
      key: 'admin_activated',
      label: 'Administrator Activated',
      title: 'Administrator Activated',
      completed: hasAdminLoggedIn,
      description: hasAdminLoggedIn
        ? 'Administrator has signed in via universal Email OTP'
        : 'Pending initial administrator sign-in',
    },
  ];

  const completedMilestones = milestones.filter((m) => m.completed).length;
  const totalMilestones = milestones.length;
  const percentage = Math.round((completedMilestones / totalMilestones) * 100);

  return {
    totalMilestones,
    completedMilestones,
    percentage,
    isComplete: completedMilestones === totalMilestones,
    milestones,
  };
}
