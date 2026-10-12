import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';

export type ModuleCode = 'hrms' | 'crm' | 'pm';

/**
 * Company Admin API Client
 * Scoped communication with /api/v1/company-admin endpoints.
 * Automatically injects Bearer token and X-Company-Id headers.
 */

const API_BASE = `${appConfig.apiBaseUrl}/company-admin`;

export const ACTIVE_COMPANY_KEY = 'bezent_active_company_id';
export const PLATFORM_TOKEN_KEY = 'bezent_platform_token';

function getHeaders(companyId?: string): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem(PLATFORM_TOKEN_KEY) : null;
  const activeCompId =
    companyId ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_COMPANY_KEY) : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeCompId) {
    headers['X-Company-Id'] = activeCompId;
  }

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}, companyId?: string): Promise<T> {
  const headers = {
    ...getHeaders(companyId),
    ...(options.headers || {}),
  };

  const response = await authorizedFetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      body?.error?.message ||
      (typeof body?.error === 'string' ? body.error : undefined) ||
      body?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return (body?.data !== undefined ? body.data : body) as T;
}

/* ── Domain Types ─────────────────────────────────────────────────── */

export interface AuthorizedCompanySummary {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'suspended';
  tenantId: string;
  tenantName: string;
  role: string;
  assignedRoles?: string[];
  authoritySource?: 'tenant_admin' | 'company_admin' | 'dual' | 'platform_oversight';
  authorityLabel?: string;
  isTenantAdmin?: boolean;
  isMember?: boolean;
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
    createdAt: string;
  }>;
}

export interface CompanyProfile {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  displayName: string | null;
  legalName: string | null;
  organizationType: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  businessEmail: string | null;
  contactPhone: string | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timeZone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

export interface UpdateCompanyProfileInput {
  displayName?: string | null;
  legalName?: string | null;
  organizationType?: string | null;
  industry?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
  alternateEmail?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timeZone?: string | null;
}

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
  invitationStatus?: 'pending' | 'accepted' | 'expired' | 'cancelled' | null;
  lastLoginAt: string | null;
  joinedAt: string;
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
  expiresAt: string;
  createdAt: string;
  invitedByUserId: string | null;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  code?: string;
  moduleCode?: ModuleCode | null;
  isSystem?: boolean;
  status?: 'active' | 'inactive';
  activeAssignmentCount?: number;
}

export interface PermissionTreeAction {
  id: string;
  action: string;
  label: string;
  description: string;
  scope: string;
  isSystem: boolean;
  aliases: string[];
}

export interface PermissionTreeModule {
  module: string;
  label: string;
  permissions: PermissionTreeAction[];
}

export interface PermissionTreeApplication {
  application: string;
  label: string;
  moduleCode: ModuleCode | null;
  modules: PermissionTreeModule[];
}

export interface CreateCustomRoleInput {
  name: string;
  description?: string;
  moduleCode?: ModuleCode | null;
  permissions: string[];
}

export interface UpdateCustomRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface UserCompanyAccess {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipStatus: 'active' | 'inactive' | 'revoked';
  roles: Array<{
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    moduleCode: ModuleCode | null;
  }>;
  effectivePermissions: string[];
  essEligible: boolean;
}

export interface CompanyModuleStatus {
  code: ModuleCode;
  name: string;
  description: string;
  tenantEntitled: boolean;
  companyEnabled: boolean;
}

export interface OrganizationSummary {
  counts: {
    departments: number;
    designations: number;
    locations: number;
    grades: number;
    activeEmployees: number;
  };
  departments: Array<{ id: string; name: string; code: string }>;
  designations: Array<{ id: string; title: string }>;
  locations: Array<{ id: string; name: string; city: string | null; country: string | null }>;
}

export interface PoliciesSummary {
  onboardingStepsConfigured: number;
  protectedSystemFields: string[];
  hrmsSettingsConfigured: boolean;
  employmentTypes: string[];
  leaveTypes: string[];
  workSchedules: string[];
}

export interface CompanyAuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/* ── API Operations ───────────────────────────────────────────────── */

export const companyAdminApi = {
  // 1. Authorized Companies (for Switcher)
  async getAuthorizedCompanies(): Promise<AuthorizedCompanySummary[]> {
    return request<AuthorizedCompanySummary[]>('/companies');
  },

  // 2. Dashboard
  async getDashboard(companyId?: string): Promise<CompanyAdminDashboard> {
    return request<CompanyAdminDashboard>('/dashboard', {}, companyId);
  },

  // 3. Profile
  async getProfile(companyId?: string): Promise<CompanyProfile> {
    return request<CompanyProfile>('/profile', {}, companyId);
  },

  async updateProfile(
    input: UpdateCompanyProfileInput,
    companyId?: string,
  ): Promise<CompanyProfile> {
    return request<CompanyProfile>(
      '/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      companyId,
    );
  },

  // 4. User Directory
  async listUsers(
    params?: { search?: string; role?: string; status?: string; page?: number; limit?: number },
    companyId?: string,
  ): Promise<{ users: CompanyUserItem[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/users${qs}`, {}, companyId);
  },

  async inviteUser(
    input: InviteCompanyUserInput,
    companyId?: string,
  ): Promise<{ invitation: InvitationItem; emailDeliveryStatus: string; notice: string }> {
    return request(
      '/users/invite',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      companyId,
    );
  },

  async updateUserRole(
    userId: string,
    role: 'company_admin' | 'hr_manager' | 'employee' | 'user',
    companyId?: string,
  ): Promise<{ message: string }> {
    return request(
      `/users/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      },
      companyId,
    );
  },

  async updateUserStatus(
    userId: string,
    membershipStatus: 'active' | 'inactive' | 'revoked',
    companyId?: string,
  ): Promise<{ message: string }> {
    return request(
      `/users/${userId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ membershipStatus }),
      },
      companyId,
    );
  },

  async revokeMembership(userId: string, companyId?: string): Promise<{ message: string }> {
    return request(
      `/users/${userId}/membership`,
      {
        method: 'DELETE',
      },
      companyId,
    );
  },

  // 5. Invitations
  async listInvitations(companyId?: string): Promise<InvitationItem[]> {
    return request<InvitationItem[]>('/invitations', {}, companyId);
  },

  async resendInvitation(
    id: string,
    companyId?: string,
  ): Promise<{ invitation: InvitationItem; emailDeliveryStatus: string; notice: string }> {
    return request(
      `/invitations/${id}/resend`,
      {
        method: 'POST',
      },
      companyId,
    );
  },

  async cancelInvitation(id: string, companyId?: string): Promise<{ message: string }> {
    return request(
      `/invitations/${id}`,
      {
        method: 'DELETE',
      },
      companyId,
    );
  },

  async acceptInvitation(
    idOrToken: string,
    companyId?: string,
  ): Promise<{ message: string; invitationId: string; status: string }> {
    return request(
      `/invitations/${idOrToken}/accept`,
      {
        method: 'POST',
      },
      companyId,
    );
  },

  // 6. Roles & Permissions Catalog
  async getRoles(companyId?: string): Promise<RoleDefinition[]> {
    return request<RoleDefinition[]>('/roles', {}, companyId);
  },

  async getPermissionTree(companyId?: string): Promise<PermissionTreeApplication[]> {
    return request<PermissionTreeApplication[]>('/permissions/tree', {}, companyId);
  },

  async listAssignablePermissions(
    companyId?: string,
  ): Promise<Array<{ id: string; label: string; description: string; moduleCode: string | null }>> {
    return request('/permissions', {}, companyId);
  },

  async createCustomRole(
    input: CreateCustomRoleInput,
    companyId?: string,
  ): Promise<RoleDefinition> {
    return request<RoleDefinition>(
      '/roles',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      companyId,
    );
  },

  async updateCustomRole(
    roleId: string,
    input: UpdateCustomRoleInput,
    companyId?: string,
  ): Promise<RoleDefinition> {
    return request<RoleDefinition>(
      `/roles/${roleId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      companyId,
    );
  },

  async setCustomRoleStatus(
    roleId: string,
    status: 'active' | 'inactive',
    companyId?: string,
  ): Promise<RoleDefinition> {
    return request<RoleDefinition>(
      `/roles/${roleId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      companyId,
    );
  },

  async getUserAccess(userId: string, companyId?: string): Promise<UserCompanyAccess> {
    return request<UserCompanyAccess>(`/users/${userId}/access`, {}, companyId);
  },

  async assignRole(userId: string, roleId: string, companyId?: string): Promise<UserCompanyAccess> {
    return request<UserCompanyAccess>(
      `/users/${userId}/roles`,
      {
        method: 'POST',
        body: JSON.stringify({ roleId }),
      },
      companyId,
    );
  },

  async revokeRole(userId: string, roleId: string, companyId?: string): Promise<UserCompanyAccess> {
    return request<UserCompanyAccess>(
      `/users/${userId}/roles/${roleId}`,
      {
        method: 'DELETE',
      },
      companyId,
    );
  },

  // 7. Modules
  async getModules(companyId?: string): Promise<CompanyModuleStatus[]> {
    return request<CompanyModuleStatus[]>('/modules', {}, companyId);
  },

  async setModuleStatus(
    moduleCode: ModuleCode,
    enabled: boolean,
    companyId?: string,
  ): Promise<{ code: ModuleCode; enabled: boolean; message: string }> {
    return request(
      `/modules/${moduleCode}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      },
      companyId,
    );
  },

  // 8. Organization Masters
  async getOrganizationSummary(companyId?: string): Promise<OrganizationSummary> {
    return request<OrganizationSummary>('/organization/summary', {}, companyId);
  },

  // 9. Policies & Configuration
  async getPoliciesSummary(companyId?: string): Promise<PoliciesSummary> {
    return request<PoliciesSummary>('/policies/summary', {}, companyId);
  },

  // 10. Audit Logs
  async listAuditLogs(
    params?: { action?: string; targetType?: string; limit?: number },
    companyId?: string,
  ): Promise<CompanyAuditLogItem[]> {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<CompanyAuditLogItem[]>(`/audit-logs${qs}`, {}, companyId);
  },
};
