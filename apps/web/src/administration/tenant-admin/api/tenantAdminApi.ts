import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';
import type {
  BusinessUnitRecord,
  CompanyApplicationItem,
  CompanyBrandingMode,
  CompanyOrgCounts,
  DepartmentRecord,
  DivisionRecord,
  EligibleHead,
  LocationType,
  MediaAssetSummary,
  OrganizationHierarchy,
  StructuralStatus,
  TenantAdminCapacitySummary,
  TenantAdminCompanySummary,
  TenantAdminContextSummary,
  TenantAdminTenantSummary,
  TenantApplicationSummary,
  TenantMemberSummary,
  WorkLocationRecord,
  WorkLocationStatus,
  CompanyAccessUserItem,
  AvailableTenantUserItem,
  AssignCompanyUserPayload,
  InviteCompanyUserPayload,
  UpdateCompanyUserRolePayload,
  CompanyRoleOverviewItem,
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

  /** Updates tenant details if canonical endpoint is supported */
  async updateTenantDetails(dto: {
    name?: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  }): Promise<TenantAdminTenantSummary> {
    return request<TenantAdminTenantSummary>('/tenant', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
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
    displayName?: string | null;
    legalName?: string | null;
    organizationType?: string | null;
    industry?: string | null;
    businessEmail?: string | null;
    contactPhone?: string | null;
    country?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    timeZone?: string | null;
    registrationNumber?: string | null;
    currency?: string | null;
    locale?: string | null;
    dateFormat?: string | null;
    weekStartsOn?: string | null;
    financialYearStart?: string | null;
    logoUrl?: string | null;
    fiscalYearStart?: string | null;
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

  /** Lists tenant members directory, optionally filtered by authority, search, or companyId */
  async listMembers(params?: {
    authority?: 'tenant_admin' | 'standard';
    search?: string;
    companyId?: string;
  }): Promise<TenantMemberSummary[]> {
    const query = new URLSearchParams();
    if (params?.authority) query.set('authority', params.authority);
    if (params?.search) query.set('search', params.search);
    if (params?.companyId) query.set('companyId', params.companyId);
    const qs = query.toString();
    return request<TenantMemberSummary[]>(`/members${qs ? `?${qs}` : ''}`);
  },

  /** Reads organization master and structure counts for a managed company */
  async getCompanyOrgCounts(companyId: string): Promise<CompanyOrgCounts> {
    try {
      const [structureRes, summaryRes] = await Promise.all([
        request<{ totalBusinessUnits?: number; totalDivisions?: number; businessUnits?: unknown[] }>(
          `/companies/${encodeURIComponent(companyId)}/organization/structure`,
        ).catch(() => ({ totalBusinessUnits: 0, totalDivisions: 0, businessUnits: [] })),
        request<{ departments?: unknown[]; locations?: unknown[] }>(
          `/companies/${encodeURIComponent(companyId)}/organization/summary`,
        ).catch(() => ({ departments: [], locations: [] })),
      ]);

      return {
        businessUnits: structureRes?.totalBusinessUnits ?? (Array.isArray(structureRes?.businessUnits) ? structureRes.businessUnits.length : 0),
        divisions: structureRes?.totalDivisions ?? 0,
        departments: Array.isArray(summaryRes?.departments) ? summaryRes.departments.length : 0,
        workLocations: Array.isArray(summaryRes?.locations) ? summaryRes.locations.length : 0,
      };
    } catch {
      return {
        businessUnits: 0,
        divisions: 0,
        departments: 0,
        workLocations: 0,
      };
    }
  },

  /** Reads a single member's details and company memberships */
  async getMember(userId: string): Promise<TenantMemberSummary> {
    return request<TenantMemberSummary>(`/members/${encodeURIComponent(userId)}`);
  },

  /** Reads tenant application catalog and distribution */
  async listApplications(): Promise<TenantApplicationSummary[]> {
    interface RawApplicationDistribution {
      id?: string;
      code?: string;
      moduleCode?: string;
      name?: string;
      description?: string;
      category?: string;
      availability?: string;
      tenantEntitled?: boolean;
      status?: 'active' | 'inactive' | string;
      companyCount?: number;
      totalCompaniesCount?: number;
      enabledCompanyCount?: number;
      enabledCompaniesCount?: number;
    }

    const rawList = await request<RawApplicationDistribution[]>('/applications');
    if (!Array.isArray(rawList)) {
      return [];
    }

    return rawList.map((item) => {
      const normalizedCode = (item.code || item.moduleCode || item.id || '').trim();
      const isEntitled = Boolean(
        item.tenantEntitled !== undefined
          ? item.tenantEntitled
          : item.status === 'active',
      );
      return {
        id: item.id || normalizedCode,
        code: normalizedCode,
        moduleCode: item.moduleCode || normalizedCode,
        name: item.name || normalizedCode.toUpperCase(),
        description: item.description,
        category: item.category,
        availability: item.availability,
        enabledCompaniesCount: item.enabledCompanyCount ?? item.enabledCompaniesCount ?? 0,
        totalCompaniesCount: item.companyCount ?? item.totalCompaniesCount ?? 0,
        status: isEntitled ? 'active' : 'inactive',
        tenantEntitled: isEntitled,
      };
    });
  },

  /** Reads enabled applications for a specific company */
  async getCompanyApplications(companyId: string): Promise<Array<CompanyApplicationItem | string>> {
    return request<Array<CompanyApplicationItem | string>>(`/companies/${encodeURIComponent(companyId)}/applications`);
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

  /** Uploads canonical Tenant Logo */
  async uploadTenantLogo(file: File): Promise<MediaAssetSummary> {
    const fileData = await readFileAsBase64(file);
    return request<MediaAssetSummary>('/tenant/logo', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'image/png',
        fileData,
      }),
    });
  },

  /** Removes canonical Tenant Logo and resets to default branding */
  async removeTenantLogo(): Promise<void> {
    await request<void>('/tenant/logo', { method: 'DELETE' });
  },

  /** Uploads canonical Tenant Banner / Cover */
  async uploadTenantBanner(file: File): Promise<MediaAssetSummary> {
    const fileData = await readFileAsBase64(file);
    return request<MediaAssetSummary>('/tenant/banner', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'image/png',
        fileData,
      }),
    });
  },

  /** Removes canonical Tenant Banner / Cover */
  async removeTenantBanner(): Promise<void> {
    await request<void>('/tenant/banner', { method: 'DELETE' });
  },

  /** Uploads company logo for a company in the tenant */
  async uploadCompanyLogo(companyId: string, file: File): Promise<MediaAssetSummary> {
    const fileData = await readFileAsBase64(file);
    return request<MediaAssetSummary>(`/companies/${encodeURIComponent(companyId)}/logo`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'image/png',
        fileData,
      }),
    });
  },

  /** Removes company logo */
  async removeCompanyLogo(companyId: string): Promise<void> {
    await request<void>(`/companies/${encodeURIComponent(companyId)}/logo`, { method: 'DELETE' });
  },

  /** Updates company branding mode (own_logo, tenant_logo, initials) */
  async updateCompanyBranding(
    companyId: string,
    brandingMode: CompanyBrandingMode,
  ): Promise<{ brandingMode: CompanyBrandingMode; logoUrl: string | null }> {
    return request<{ brandingMode: CompanyBrandingMode; logoUrl: string | null }>(
      `/companies/${encodeURIComponent(companyId)}/branding`,
      {
        method: 'PATCH',
        body: JSON.stringify({ brandingMode }),
      },
    );
  },

  /** Fetches complete organization hierarchy (Company, BUs, Divisions) for a company */
  async getCompanyOrgHierarchy(companyId: string): Promise<OrganizationHierarchy> {
    return request<OrganizationHierarchy>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure`,
    );
  },

  /** Fetches departments for a company */
  async getCompanyDepartments(companyId: string): Promise<DepartmentRecord[]> {
    return request<DepartmentRecord[]>(
      `/companies/${encodeURIComponent(companyId)}/organization/departments`,
    );
  },

  /** Fetches eligible heads for an organization unit */
  async getCompanyEligibleHeads(companyId: string): Promise<EligibleHead[]> {
    return request<EligibleHead[]>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure/heads`,
    );
  },

  /** Creates a Business Unit in a company */
  async createCompanyBusinessUnit(
    companyId: string,
    payload: {
      name: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: StructuralStatus;
    },
  ): Promise<BusinessUnitRecord> {
    return request<BusinessUnitRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure/business-units`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Updates a Business Unit in a company */
  async updateCompanyBusinessUnit(
    companyId: string,
    id: string,
    payload: {
      name?: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: StructuralStatus;
    },
  ): Promise<BusinessUnitRecord> {
    return request<BusinessUnitRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure/business-units/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Creates a Division in a company */
  async createCompanyDivision(
    companyId: string,
    payload: {
      businessUnitId: string;
      name: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: StructuralStatus;
    },
  ): Promise<DivisionRecord> {
    return request<DivisionRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure/divisions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Updates a Division in a company */
  async updateCompanyDivision(
    companyId: string,
    id: string,
    payload: {
      businessUnitId?: string;
      name?: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: StructuralStatus;
    },
  ): Promise<DivisionRecord> {
    return request<DivisionRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/structure/divisions/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Creates a Department in a company */
  async createCompanyDepartment(
    companyId: string,
    payload: {
      divisionId: string;
      businessUnitId?: string | null;
      name: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: 'active' | 'inactive';
    },
  ): Promise<DepartmentRecord> {
    return request<DepartmentRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/departments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Updates a Department in a company */
  async updateCompanyDepartment(
    companyId: string,
    id: string,
    payload: {
      divisionId?: string;
      businessUnitId?: string | null;
      name?: string;
      code?: string | null;
      description?: string | null;
      headEmployeeId?: string | null;
      status?: 'active' | 'inactive';
    },
  ): Promise<DepartmentRecord> {
    return request<DepartmentRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/departments/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  /** Fetches all work locations for a company */
  async getCompanyWorkLocations(
    companyId: string,
    filters?: { status?: string; locationType?: string; search?: string },
  ): Promise<WorkLocationRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.locationType && filters.locationType !== 'all') params.set('locationType', filters.locationType);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<WorkLocationRecord[] | { items?: WorkLocationRecord[]; data?: WorkLocationRecord[] }>(
      `/companies/${encodeURIComponent(companyId)}/organization/work-locations${qs}`,
    );
    if (Array.isArray(res)) return res;
    if (Array.isArray((res as { items?: WorkLocationRecord[] }).items)) {
      return (res as { items: WorkLocationRecord[] }).items;
    }
    if (Array.isArray((res as { data?: WorkLocationRecord[] }).data)) {
      return (res as { data: WorkLocationRecord[] }).data;
    }
    return [];
  },

  /** Creates a work location for a company */
  async createCompanyWorkLocation(
    companyId: string,
    payload: {
      name: string;
      code?: string | null;
      type: LocationType;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postalCode?: string | null;
      timezone?: string | null;
      description?: string | null;
      status?: WorkLocationStatus;
    },
  ): Promise<WorkLocationRecord> {
    const res = await request<{ data?: WorkLocationRecord } | WorkLocationRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/work-locations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return (res as { data?: WorkLocationRecord }).data || (res as WorkLocationRecord);
  },

  /** Updates a work location for a company */
  async updateCompanyWorkLocation(
    companyId: string,
    id: string,
    payload: {
      name?: string;
      code?: string | null;
      type?: LocationType;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postalCode?: string | null;
      timezone?: string | null;
      description?: string | null;
      status?: WorkLocationStatus;
    },
  ): Promise<WorkLocationRecord> {
    const res = await request<{ data?: WorkLocationRecord } | WorkLocationRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/work-locations/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
    return (res as { data?: WorkLocationRecord }).data || (res as WorkLocationRecord);
  },

  /** Deactivates a work location for a company */
  async deactivateCompanyWorkLocation(companyId: string, id: string): Promise<WorkLocationRecord> {
    const res = await request<{ data?: WorkLocationRecord } | WorkLocationRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/work-locations/${encodeURIComponent(id)}/deactivate`,
      {
        method: 'POST',
      },
    );
    return (res as { data?: WorkLocationRecord }).data || (res as WorkLocationRecord);
  },

  /** Reactivates a work location for a company */
  async reactivateCompanyWorkLocation(companyId: string, id: string): Promise<WorkLocationRecord> {
    const res = await request<{ data?: WorkLocationRecord } | WorkLocationRecord>(
      `/companies/${encodeURIComponent(companyId)}/organization/work-locations/${encodeURIComponent(id)}/reactivate`,
      {
        method: 'POST',
      },
    );
    return (res as { data?: WorkLocationRecord }).data || (res as WorkLocationRecord);
  },

  // =========================================================================
  // Company Access V1
  // =========================================================================

  /** List all company members and pending invitations */
  async getCompanyAccessUsers(companyId: string): Promise<CompanyAccessUserItem[]> {
    const res = await request<{ data?: CompanyAccessUserItem[] } | CompanyAccessUserItem[]>(
      `/companies/${encodeURIComponent(companyId)}/access/users`,
    );
    return (res as { data?: CompanyAccessUserItem[] }).data || (res as CompanyAccessUserItem[]);
  },

  /** List available tenant users who do not have access to this company yet */
  async getAvailableTenantUsers(companyId: string): Promise<AvailableTenantUserItem[]> {
    const res = await request<{ data?: AvailableTenantUserItem[] } | AvailableTenantUserItem[]>(
      `/companies/${encodeURIComponent(companyId)}/access/available-users`,
    );
    return (res as { data?: AvailableTenantUserItem[] }).data || (res as AvailableTenantUserItem[]);
  },

  /** Assign an existing tenant user to the company */
  async assignTenantUserToCompany(
    companyId: string,
    payload: AssignCompanyUserPayload,
  ): Promise<{ message: string; user: CompanyAccessUserItem }> {
    const res = await request<{ data?: { message: string; user: CompanyAccessUserItem } }>(
      `/companies/${encodeURIComponent(companyId)}/access/users/assign`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return (res as { data?: { message: string; user: CompanyAccessUserItem } }).data || (res as unknown as { message: string; user: CompanyAccessUserItem });
  },

  /** Invite a new user to the company */
  async inviteUserToCompany(
    companyId: string,
    payload: InviteCompanyUserPayload,
  ): Promise<{ message: string; invitation: CompanyAccessUserItem }> {
    const res = await request<{ data?: { message: string; invitation: CompanyAccessUserItem } }>(
      `/companies/${encodeURIComponent(companyId)}/access/users/invite`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return (res as { data?: { message: string; invitation: CompanyAccessUserItem } }).data || (res as unknown as { message: string; invitation: CompanyAccessUserItem });
  },

  /** Update a company user's role (member <-> company_admin) */
  async updateCompanyUserRole(
    companyId: string,
    userId: string,
    payload: UpdateCompanyUserRolePayload,
  ): Promise<{ message: string }> {
    const res = await request<{ data?: { message: string } }>(
      `/companies/${encodeURIComponent(companyId)}/access/users/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    return (res as { data?: { message: string } }).data || (res as unknown as { message: string });
  },

  /** Revoke a user's company access */
  async revokeCompanyUserAccess(
    companyId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const res = await request<{ data?: { message: string } }>(
      `/companies/${encodeURIComponent(companyId)}/access/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
      },
    );
    return (res as { data?: { message: string } }).data || (res as unknown as { message: string });
  },

  /** Resend pending invitation */
  async resendCompanyInvitation(
    companyId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    const res = await request<{ data?: { message: string } }>(
      `/companies/${encodeURIComponent(companyId)}/access/invitations/${encodeURIComponent(invitationId)}/resend`,
      {
        method: 'POST',
      },
    );
    return (res as { data?: { message: string } }).data || (res as unknown as { message: string });
  },

  /** Cancel pending invitation */
  async cancelCompanyInvitation(
    companyId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    const res = await request<{ data?: { message: string } }>(
      `/companies/${encodeURIComponent(companyId)}/access/invitations/${encodeURIComponent(invitationId)}`,
      {
        method: 'DELETE',
      },
    );
    return (res as { data?: { message: string } }).data || (res as unknown as { message: string });
  },

  /** Get company roles and permissions overview */
  async getCompanyRolesOverview(companyId: string): Promise<CompanyRoleOverviewItem[]> {
    const res = await request<{ data?: CompanyRoleOverviewItem[] } | CompanyRoleOverviewItem[]>(
      `/companies/${encodeURIComponent(companyId)}/access/roles-overview`,
    );
    return (res as { data?: CompanyRoleOverviewItem[] }).data || (res as CompanyRoleOverviewItem[]);
  },
};

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
