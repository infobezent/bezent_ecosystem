import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';

/**
 * Super Admin Platform API Client
 * Strict type-safe communication with /api/v1/platform endpoints.
 */

const API_BASE = `${appConfig.apiBaseUrl}/platform`;

function getAuthHeader(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('bezent_platform_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
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

/* ── Types ─────────────────────────────────────────────────────────── */

export interface PlatformUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  isSuperAdmin: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  memberships?: Array<{
    tenantId: string;
    companyId: string | null;
    role: string;
    status: string;
  }>;
}

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  activeModules?: string[];
  companiesCount?: number;
}

export interface CompanyRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  code: string;
  legalName: string | null;
  businessEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  timeZone: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ModuleCatalogItem {
  code: 'hrms' | 'crm' | 'project_management';
  name: string;
  description: string;
  category: string;
  version: string;
  availability: 'GA' | 'Beta' | 'Planned';
}

export interface TenantModuleStatus {
  id: string;
  tenantId: string;
  companyId: string | null;
  moduleCode: 'hrms' | 'crm' | 'project_management';
  status: 'enabled' | 'disabled';
  enabledAt: string | null;
  disabledAt: string | null;
}

/** Mirrors the API's CompanyAdminAssignment (platform/company-admins/types). */
export interface CompanyAdminAssignment {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tenantId: string;
  tenantName?: string;
  companyId: string;
  companyName?: string;
  role: string;
  status: string;
  assignedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  companyId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardOverview {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    activeUsers: number;
  };
  recentTenants: TenantRecord[];
  recentAuditLogs: AuditLogEntry[];
}

export interface CustomerProvisioningPayload {
  tenant: {
    name: string;
    code: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  company: {
    name: string;
    code: string;
    legalName?: string;
    businessEmail?: string;
    contactPhone?: string;
    country?: string;
    timeZone?: string;
  };
  modules: Array<'hrms' | 'crm' | 'project_management'>;
  admin: {
    userId?: string;
    newUser?: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
  activateImmediately?: boolean;
}

/**
 * How the new administrator was told to sign in. BEZENT is passwordless
 * (ADR-018): no password is generated or shown; they sign in with Email OTP.
 */
export interface SignInInvitationDelivery {
  status: 'INVITATION_EMAILED' | 'INVITATION_EMAIL_FAILED';
  message: string;
}

export interface ProvisioningResponse {
  tenant: TenantRecord;
  company: CompanyRecord;
  modules: TenantModuleStatus[];
  admin: CompanyAdminAssignment;
  invitationDelivery: SignInInvitationDelivery;
}

/* ── API Client ─────────────────────────────────────────────────────── */

export const superAdminApi = {
  // Sign-in is the shared Email OTP flow (platform/auth); there is no password login.
  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<PlatformUserSummary>('/auth/me'),

  // Dashboard
  getDashboard: () => request<DashboardOverview>('/dashboard/overview'),

  // Tenants
  listTenants: (
    params: { search?: string; status?: string; limit?: number; offset?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: TenantRecord[]; total: number }>(`/tenants${qs}`);
  },

  getTenant: (id: string) => request<TenantRecord>(`/tenants/${id}`),

  createTenant: (data: {
    name: string;
    code: string;
    contactEmail?: string;
    contactPhone?: string;
  }) =>
    request<TenantRecord>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTenant: (
    id: string,
    data: { name?: string; contactEmail?: string; contactPhone?: string },
  ) =>
    request<TenantRecord>(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  activateTenant: (id: string) =>
    request<TenantRecord>(`/tenants/${id}/activate`, {
      method: 'POST',
    }),

  suspendTenant: (id: string) =>
    request<TenantRecord>(`/tenants/${id}/suspend`, {
      method: 'POST',
    }),

  // Companies
  listCompanies: (params: { tenantId?: string; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: CompanyRecord[]; total: number }>(`/companies${qs}`);
  },

  getCompany: (id: string) => request<CompanyRecord>(`/companies/${id}`),

  createCompany: (data: {
    tenantId: string;
    name: string;
    code: string;
    legalName?: string;
    businessEmail?: string;
    contactPhone?: string;
    country?: string;
    timeZone?: string;
  }) =>
    request<CompanyRecord>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCompany: (
    id: string,
    data: {
      name?: string;
      legalName?: string;
      businessEmail?: string;
      contactPhone?: string;
      country?: string;
      timeZone?: string;
    },
  ) =>
    request<CompanyRecord>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  activateCompany: (id: string) =>
    request<CompanyRecord>(`/companies/${id}/activate`, {
      method: 'POST',
    }),

  suspendCompany: (id: string) =>
    request<CompanyRecord>(`/companies/${id}/suspend`, {
      method: 'POST',
    }),

  // Provisioning
  provisionCustomer: (payload: CustomerProvisioningPayload) =>
    request<ProvisioningResponse>('/provisioning', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Modules
  getModuleCatalog: () => request<ModuleCatalogItem[]>('/modules/catalog'),

  getTenantModules: (tenantId: string, companyId?: string) => {
    const qs = companyId ? `?companyId=${companyId}` : '';
    return request<TenantModuleStatus[]>(`/modules/tenants/${tenantId}${qs}`);
  },

  enableModule: (tenantId: string, moduleCode: string, companyId?: string) =>
    request<TenantModuleStatus>(`/modules/tenants/${tenantId}/enable`, {
      method: 'POST',
      body: JSON.stringify({ moduleCode, companyId }),
    }),

  disableModule: (tenantId: string, moduleCode: string, companyId?: string) =>
    request<TenantModuleStatus>(`/modules/tenants/${tenantId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ moduleCode, companyId }),
    }),

  // Users
  listUsers: (params: { tenantId?: string; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: PlatformUserSummary[]; total: number }>(`/users${qs}`);
  },

  getUser: (id: string) => request<PlatformUserSummary>(`/users/${id}`),

  updateUserStatus: (id: string, status: 'active' | 'suspended' | 'inactive') =>
    request<PlatformUserSummary>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Company Admins
  listCompanyAdmins: (params: { tenantId?: string; companyId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.companyId) query.set('companyId', params.companyId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<CompanyAdminAssignment[]>(`/company-admins${qs}`);
  },

  assignCompanyAdmin: (data: {
    tenantId: string;
    companyId?: string;
    userId?: string;
    newUser?: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };
  }) =>
    request<{ assignment: CompanyAdminAssignment; invitationDelivery: SignInInvitationDelivery }>(
      '/company-admins/assign',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  revokeCompanyAdmin: (membershipId: string) =>
    request<{ success: boolean }>(`/company-admins/${membershipId}/revoke`, {
      method: 'POST',
    }),

  // Audit Logs
  listAuditLogs: (
    params: {
      tenantId?: string;
      action?: string;
      targetType?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: AuditLogEntry[]; total: number }>(`/audit${qs}`);
  },
};
