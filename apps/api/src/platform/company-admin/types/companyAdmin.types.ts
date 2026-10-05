import type { ModuleCode } from '../../modules/types/module.types.js';

export interface AuthorizedCompanySummary {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'suspended';
  tenantId: string;
  tenantName: string;
  role: string;
}

export interface CompanyAdminDashboard {
  company: {
    id: string;
    tenantId: string;
    name: string;
    code: string;
    status: string;
    tenantName: string;
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    assignedRolesCount: Record<string, number>;
    enabledModulesCount: number;
    activeEmployees: number;
    pendingOnboardingCases: number;
  };
  modules: Array<{
    code: ModuleCode;
    name: string;
    description: string;
    tenantEntitled: boolean;
    companyEnabled: boolean;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    targetType: string;
    targetId: string;
    createdAt: Date | string;
  }>;
}

export type {
  CompanyProfile,
  UpdateCompanyProfileInput,
} from '../../companies/types/company.types.js';

export interface CompanyUserItem {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'company_admin' | 'hr_manager' | 'employee' | 'user';
  membershipStatus: 'active' | 'inactive' | 'revoked';
  userStatus: 'active' | 'inactive' | 'suspended';
  lastLoginAt: Date | string | null;
  joinedAt: Date | string;
}

export interface InviteCompanyUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: 'company_admin' | 'hr_manager' | 'employee' | 'user';
}

export interface InvitationItem {
  id: string;
  email: string;
  role: 'company_admin' | 'hr_manager' | 'employee' | 'user';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  invitedByUserId: string | null;
}

export interface CompanyModuleStatus {
  code: ModuleCode;
  name: string;
  description: string;
  tenantEntitled: boolean;
  companyEnabled: boolean;
}
