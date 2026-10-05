import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';
import type {
  TenantAdminCapacitySummary,
  TenantAdminCompanySummary,
  TenantAdminContextSummary,
  TenantAdminTenantSummary,
  TenantApplicationSummary,
  TenantMemberSummary,
} from '../types/tenantAdmin.types';

const API_BASE = `${appConfig.apiBaseUrl}/tenant-admin`;

export class TenantAdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'TenantAdminApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await authorizedFetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    capacity?: TenantAdminCapacitySummary;
    error?: { code?: string; message?: string } | string;
    message?: string;
  };

  if (!response.ok) {
    const errorMsg =
      (typeof body?.error === 'object' ? body.error?.message : undefined) ||
      (typeof body?.error === 'string' ? body.error : undefined) ||
      body?.message ||
      `Request failed with status ${response.status}`;
    const code = typeof body?.error === 'object' ? body.error?.code : undefined;
    throw new TenantAdminApiError(errorMsg, response.status, code);
  }

  return (body.data !== undefined ? body.data : (body as unknown as T)) as T;
}

export const tenantAdminApi = {
  /** Resolves caller's Tenant Admin context summary from /api/v1/tenant-admin/context */
  async getContext(): Promise<TenantAdminContextSummary> {
    return request<TenantAdminContextSummary>('/context');
  },

  /** Reads tenant details for the active tenant admin */
  async getTenantDetails(): Promise<TenantAdminTenantSummary> {
    return request<TenantAdminTenantSummary>('/tenant');
  },

  /** Lists companies managed by the tenant admin, including capacity */
  async listCompanies(): Promise<{
    items: TenantAdminCompanySummary[];
    capacity?: TenantAdminCapacitySummary;
  }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await authorizedFetch(`${API_BASE}/companies`, { headers });
    const body = (await response.json().catch(() => ({}))) as {
      data?: TenantAdminCompanySummary[];
      capacity?: TenantAdminCapacitySummary;
    };
    if (!response.ok) {
      throw new TenantAdminApiError(
        `Failed to fetch companies (${response.status})`,
        response.status,
      );
    }
    return {
      items: body.data || [],
      capacity: body.capacity,
    };
  },

  /** Creates a company within tenant capacity limits */
  async createCompany(dto: {
    name: string;
    code: string;
    legalName?: string;
    country?: string;
    timeZone?: string;
    currency?: string;
    fiscalYearStart?: string;
  }): Promise<TenantAdminCompanySummary> {
    return request<TenantAdminCompanySummary>('/companies', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /** Verifies company context within the tenant */
  async getCompanyContext(companyId: string): Promise<TenantAdminCompanySummary> {
    return request<TenantAdminCompanySummary>(`/companies/${encodeURIComponent(companyId)}/context`);
  },

  /** Reads company profile for a managed company */
  async getCompanyProfile(companyId: string): Promise<TenantAdminCompanySummary> {
    return request<TenantAdminCompanySummary>(`/companies/${encodeURIComponent(companyId)}/profile`);
  },

  /** Updates company profile for a managed company */
  async updateCompanyProfile(
    companyId: string,
    dto: Partial<TenantAdminCompanySummary>,
  ): Promise<TenantAdminCompanySummary> {
    return request<TenantAdminCompanySummary>(`/companies/${encodeURIComponent(companyId)}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  /** Lists tenant administrators */
  async listAdmins(): Promise<unknown[]> {
    return request<unknown[]>('/admins');
  },

  /** Lists tenant members directory */
  async listMembers(params?: { authority?: 'tenant_admin' | 'standard'; search?: string }): Promise<TenantMemberSummary[]> {
    const query = new URLSearchParams();
    if (params?.authority) query.set('authority', params.authority);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<TenantMemberSummary[]>(`/members${qs ? `?${qs}` : ''}`);
  },

  /** Reads a single member's details and company memberships */
  async getMember(userId: string): Promise<TenantMemberSummary> {
    return request<TenantMemberSummary>(`/members/${encodeURIComponent(userId)}`);
  },

  /** Reads tenant application catalog and distribution */
  async listApplications(): Promise<TenantApplicationSummary[]> {
    return request<TenantApplicationSummary[]>('/applications');
  },

  /** Reads enabled applications for a specific company */
  async getCompanyApplications(companyId: string): Promise<string[]> {
    return request<string[]>(`/companies/${encodeURIComponent(companyId)}/applications`);
  },

  /** Enables an application for a company within tenant entitlements */
  async enableCompanyApplication(companyId: string, moduleCode: string): Promise<void> {
    await request<void>(
      `/companies/${encodeURIComponent(companyId)}/applications/${encodeURIComponent(moduleCode)}/enable`,
      { method: 'POST' },
    );
  },

  /** Disables an application for a company */
  async disableCompanyApplication(companyId: string, moduleCode: string): Promise<void> {
    await request<void>(
      `/companies/${encodeURIComponent(companyId)}/applications/${encodeURIComponent(moduleCode)}/disable`,
      { method: 'POST' },
    );
  },
};
