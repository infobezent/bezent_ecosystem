import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';

/**
 * Super Admin Platform API Client (Canonical Implementation)
 * Strict type-safe communication with /api/v1/platform endpoints.
 *
 * Governed by:
 * - AGENTS.md (Article 3: Canonical Layers)
 * - docs/architecture/FRONTEND.md (src/administration/super-admin)
 * - ADR-014 (BEZENT Architecture Terminology)
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
    id?: string;
    tenantId: string;
    tenantName?: string;
    companyId: string | null;
    companyName?: string;
    role: string;
    status: string;
  }>;
}

export type CustomerHealthStatus = 'healthy' | 'needs_attention' | 'critical';

export interface NextBestAction {
  action?: string;
  actionType?: string;
  label: string;
  targetTab?: 'overview' | 'companies' | 'applications' | 'administrators' | 'activity';
  href?: string;
  targetPath?: string;
  description?: string;
}

export interface CustomerHealth {
  status: CustomerHealthStatus;
  reason?: string;
  reasons: string[];
  nextBestAction?: NextBestAction | null;
}

export interface SetupMilestone {
  key: string;
  title: string;
  label?: string;
  description: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface SetupProgress {
  totalMilestones: number;
  completedMilestones: number;
  percentage: number;
  milestones: SetupMilestone[];
  isComplete: boolean;
}

export interface TenantCompanySummary {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'suspended';
  enabledModules: string[];
  createdAt: string;
}

export interface TenantPrimaryAdminSummary {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending';
  invitedAt: string | null;
  acceptedAt: string | null;
}

export interface TenantSubscriptionSummary {
  activePlans: string[];
  totalSeats: number;
  hasTrial: boolean;
}

export interface TenantSummaryMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
}

export interface PlanRecord {
  id: string;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  code: string;
  name: string;
  tier: string;
  status: 'active' | 'deprecated' | 'draft';
  trialEligible: boolean;
  trialDurationDays: number;
  description?: string;
  prices?: Array<{
    id: string;
    currency: string;
    amount: number;
    billingCycle: string;
    status: string;
  }>;
}

export interface Step1CompanyPayload {
  legalName: string;
  displayName: string;
  businessEmail: string;
  country: string;
  timeZone: string;
  logoUrl?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  industry?: string | null;
  companySize?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  registrationNumber?: string | null;
  taxIdentifier?: string | null;
  code?: string | null;
}

export interface Step2PrimaryAdminPayload {
  fullName: string;
  workEmail: string;
  phone?: string | null;
  jobTitle?: string | null;
}

export interface ApplicationModuleDefinition {
  key: string;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  name: string;
  description: string;
  category: string;
  availability: 'GA' | 'Beta' | 'Planned';
  isMandatory: boolean;
  dependencies: string[];
  includedInPlans: string[];
  defaultLimits?: Record<string, unknown> | null;
}

export interface PlanModuleEligibility {
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  availability: 'GA' | 'Beta' | 'Planned';
  isMandatory: boolean;
  isIncludedInPlan: boolean;
  defaultEnabled: boolean;
  dependencies: string[];
  requiresOverride: boolean;
  limits?: Record<string, unknown> | null;
}

export interface Step3ModuleOverride {
  moduleCode: string;
  overrideType: 'enable' | 'disable' | 'limit';
  reason: string;
  overrideValue?: Record<string, unknown> | null;
}

export interface Step3SubscriptionPayload {
  applicationCode: 'hrms' | 'crm' | 'project_management';
  planId: string;
  accessMode?: 'trial' | 'paid';
  licensedSeats?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  scheduledActivationAt?: string | null;
  commercialAgreementNotes?: string | null;
  selectedModules?: string[];
  moduleOverrides?: Step3ModuleOverride[];
}

export interface TenantOrchestrationPayload {
  company: Step1CompanyPayload;
  admin: Step2PrimaryAdminPayload;
  subscriptions: Step3SubscriptionPayload[];
}

export interface TenantOrchestrationPreflightResult {
  valid: boolean;
  tenantSetupPolicy: 'ready_to_create' | 'pending_setup';
  warnings: string[];
  summary: {
    companyName: string;
    tenantName: string;
    primaryCompanyName: string;
    adminEmail: string;
    selectedApplications: string[];
    applicationsCount: number;
    subscriptions: Array<{
      applicationCode: string;
      planId: string;
      accessMode: 'trial' | 'paid';
      seats: number;
      modulesCount?: number;
      selectedModules?: string[];
      overridesCount?: number;
    }>;
  };
}

export interface TenantOrchestrationResult {
  tenantId: string;
  tenantCode: string;
  primaryCompanyId: string;
  businessSetupState: 'pending_setup' | 'pending_admin_acceptance';
  subscriptions: Array<{
    id: string;
    applicationCode: string;
    planId: string;
    status: string;
    licensedSeats?: number;
    billingCycle?: string;
    selectedModules?: string[];
    overridesCount?: number;
  }>;
  invitation: {
    id: string;
    email: string;
    status: 'pending';
    expiresAt: string;
    rawToken?: string;
  };
  provisioningJobId: string;
  provisioningStatus: 'pending';
  provisioning?: {
    status: string;
    workflowId?: string;
    message?: string;
  };
  idempotentReplay: boolean;
}

export interface TenantListParams {
  search?: string;
  status?: string;
  moduleCode?: string;
  application?: string;
  planId?: string;
  trial?: boolean;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: 'name' | 'createdAt' | 'status' | 'id';
  sortOrder?: 'asc' | 'desc';
  attention?: string;
  page?: number;
  limit?: number;
  offset?: number;
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
  companyCount?: number;
  companies?: TenantCompanySummary[];
  health?: CustomerHealth;
  setupProgress?: SetupProgress;
  userCount?: number;
  logoUrl?: string | null;
  primaryAdmin?: TenantPrimaryAdminSummary | null;
  subscriptionSummary?: TenantSubscriptionSummary;
  derivedCommercialClassification?: 'active' | 'trial' | 'suspended' | 'pending_setup' | 'archived';
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
  enabledModules?: string[];
  adminsCount?: number;
  activeAdminsCount?: number;
  pendingAdminsCount?: number;
  adminAccessStatus?: 'active' | 'pending' | 'none';
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
  lastLoginAt?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  tenantName?: string | null;
  companyId: string | null;
  companyName?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface GovernanceSummary {
  authentication: {
    method: string;
    enabled: boolean;
    otpExpiryMinutes: number;
    maxVerificationAttempts: number;
    resendCooldownSeconds: number;
  };
  session: {
    ttlHours: number;
    platformAuthorization: boolean;
  };
  isolation: {
    tenantIsolation: boolean;
    companyScoping: boolean;
    identitySeparatedFromEmployee: boolean;
  };
  audit: {
    enabled: boolean;
    sensitiveMetadataProtection: boolean;
    scope: string;
  };
  applications: {
    total: number;
    available: number;
    comingSoon: number;
  };
}

export interface NeedsAttentionItem {
  tenantId: string;
  tenantName: string;
  status: 'critical' | 'needs_attention';
  reason: string;
  reasons: string[];
  nextBestAction: NextBestAction | null;
}

export interface ApplicationOverviewItem {
  code: 'hrms' | 'crm' | 'project_management';
  name: string;
  availability: 'GA' | 'Beta' | 'Planned';
  entitledTenantsCount: number;
}

export interface DashboardOverview {
  metrics: {
    customers: {
      total: number;
      active: number;
      suspended: number;
    };
    companies: {
      total: number;
      active: number;
      suspended: number;
      withoutAdmin: number;
    };
    platformUsers: {
      total: number;
      active: number;
      suspended: number;
    };
    companyAdmins: {
      uniqueAdmins: number;
      totalAssignments: number;
      companiesWithoutAdmin: number;
    };
    healthSummary: {
      healthy: number;
      needsAttention: number;
      critical: number;
    };
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalCompanies: number;
    activeCompanies: number;
    suspendedCompanies: number;
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    uniqueAdmins?: number;
    adminAssignments?: number;
    companiesWithoutAdmin?: number;
  };
  customerHealth: {
    health: {
      healthy: number;
      needsAttention: number;
      critical: number;
    };
    lifecycle: {
      active: number;
      suspended: number;
    };
  };
  applications: ApplicationOverviewItem[];
  needsAttention: NeedsAttentionItem[];
  totalNeedsAttention: number;
  recentTenants: TenantRecord[];
  recentCustomers?: TenantRecord[];
  recentAuditLogs: AuditLogEntry[];
  recentActivities?: AuditLogEntry[];
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

/* ── Phase 03C Tenant Workspace Types ─────────────────────────────── */

export interface TenantOverviewData {
  tenant: {
    id: string;
    name: string;
    code: string;
    status: 'active' | 'inactive' | 'suspended' | 'archived';
    maxCompanies: number;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  primaryCompany: {
    id: string;
    name: string;
    code: string;
    status: string;
    createdAt: string;
  } | null;
  totalCompanies: number;
  companyCapacity: {
    used: number;
    max: number;
    remaining: number;
  };
  primaryAdmin: TenantPrimaryAdminSummary | null;
  enabledApplications: Array<{
    applicationCode: string;
    planId: string;
    status: string;
    isTrial: boolean;
    seats: number;
    currentPeriodEnd?: string | null;
  }>;
  activeUsers: number;
  licensedSeats: number;
  provisioningHealth: {
    status: string;
    jobType?: string;
    stepTimeline: Record<string, unknown>;
    attemptCount: number;
    maxAttempts: number;
    retryEligible: boolean;
    errorMessage?: string | null;
    errorCategory?: string | null;
    lastUpdated?: string;
  } | null;
  setupProgress: SetupProgress;
  health: CustomerHealth;
  derivedCommercialClassification: 'active' | 'trial' | 'suspended' | 'pending_setup' | 'archived';
  attentionRequired: {
    needed: boolean;
    reason?: string;
    action?: NextBestAction | null;
  };
  importantTimestamps: {
    createdAt: string;
    updatedAt: string;
    primaryAdminInvitedAt?: string | null;
    primaryAdminAcceptedAt?: string | null;
  };
}

export interface SubscriptionDetailRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  planId: string;
  status: 'pending_activation' | 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  accessMode: 'trial' | 'paid';
  billingCycle: 'monthly' | 'annual' | 'quarterly' | 'custom';
  licensedSeats: number;
  scheduledActivationAt: string | null;
  activatedAt: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  renewsAt: string | null;
  autoRenew: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  planName?: string;
  planCode?: string;
  planTier?: string;
  currentSeatsUsed?: number;
}

export interface EffectiveModuleEntitlement {
  moduleCode: string;
  isEnabled: boolean;
  source: 'plan' | 'override' | 'legacy';
  limits?: Record<string, unknown> | null;
  overrideReason?: string | null;
}

export interface EffectiveEntitlementResult {
  tenantId: string;
  companyId: string | null;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  isEntitled: boolean;
  source: 'commercial_subscription' | 'override' | 'legacy_fallback' | 'none';
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  planId?: string | null;
  planName?: string | null;
  licensedSeats?: number;
  modules: EffectiveModuleEntitlement[];
}

export interface EntitlementOverrideRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  applicationCode: 'hrms' | 'crm' | 'project_management';
  moduleCode: string;
  overrideType: 'enable' | 'disable' | 'limit';
  overrideValue: Record<string, unknown> | null;
  reason: string;
  authorizedByUserId: string;
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisioningJobRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  jobType: 'tenant_creation' | 'subscription_activation' | 'module_provisioning' | 'admin_handoff';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  idempotencyKey: string | null;
  attemptCount: number;
  maxAttempts: number;
  retryEligible: boolean;
  nextAttemptAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  workerId: string | null;
  stepState: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerStatusRecord {
  workerId?: string;
  status: string;
  activeJobs?: number;
  lastHeartbeat?: string;
  isProcessing?: boolean;
}

export interface LifecycleEventRecord {
  id: string;
  tenantId: string;
  eventType: 'activated' | 'suspended' | 'reactivated' | 'terminated';
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export interface TenantActivityParams {
  action?: string;
  actorUserId?: string;
  actorEmail?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
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
  getTenantSummary: () => request<TenantSummaryMetrics>('/tenants/summary'),

  listTenants: (params: TenantListParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.moduleCode) query.set('moduleCode', params.moduleCode);
    if (params.application) query.set('application', params.application);
    if (params.planId) query.set('planId', params.planId);
    if (params.trial !== undefined) query.set('trial', String(params.trial));
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.attention) query.set('attention', params.attention);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: TenantRecord[]; total: number }>(`/tenants${qs}`);
  },

  getTenant: (id: string) => request<TenantRecord>(`/tenants/${id}`),

  listPlans: (params?: { applicationCode?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.applicationCode) query.set('applicationCode', params.applicationCode);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<PlanRecord[]>(`/plans${qs}`);
  },

  preflightTenantOrchestration: (data: TenantOrchestrationPayload) =>
    request<TenantOrchestrationPreflightResult>('/tenants/orchestrate/preflight', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  orchestrateTenantCreation: (data: TenantOrchestrationPayload, idempotencyKey: string) =>
    request<TenantOrchestrationResult>('/tenants/orchestrate', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    }),

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

  activateTenant: (id: string, reason?: string) =>
    request<TenantRecord>(`/tenants/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  suspendTenant: (id: string, reason?: string) =>
    request<TenantRecord>(`/tenants/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Administrative suspension' }),
    }),

  // Companies
  listCompanies: (
    params: { tenantId?: string; search?: string; status?: string; moduleCode?: string } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.moduleCode) query.set('moduleCode', params.moduleCode);
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
    modules?: Array<'hrms' | 'crm' | 'project_management'>;
    admin?: {
      userId?: string;
      newUser?: {
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
      };
    };
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

  getApplicationModules: (applicationCode: string) =>
    request<ApplicationModuleDefinition[]>(
      `/modules/catalog?applicationCode=${encodeURIComponent(applicationCode)}`,
    ),

  getPlanModules: (planId: string) =>
    request<PlanModuleEligibility[]>(`/plans/${encodeURIComponent(planId)}/modules`),

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

  resendCompanyAdminInvitation: (membershipId: string) =>
    request<{ success: boolean; invitationDelivery: SignInInvitationDelivery }>(
      `/company-admins/${membershipId}/resend-invitation`,
      {
        method: 'POST',
      },
    ),

  // Audit Logs
  listAuditLogs: (
    params: {
      tenantId?: string;
      companyId?: string;
      action?: string;
      targetType?: string;
      page?: number;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: AuditLogEntry[]; total: number }>(`/audit${qs}`);
  },

  // Governance & Platform Settings
  getGovernanceSummary: () => request<GovernanceSummary>('/governance/summary'),

  /* ── Phase 03C Tenant Workspace API Methods ─────────────────────── */

  getTenantOverview: (id: string) => request<TenantOverviewData>(`/tenants/${id}/overview`),

  getTenantSubscriptions: (tenantId: string) =>
    request<SubscriptionDetailRecord[]>(`/tenants/${tenantId}/subscriptions`),

  getTenantEntitlements: (tenantId: string) =>
    request<EffectiveEntitlementResult[]>(`/tenants/${tenantId}/entitlements`),

  getTenantOverrides: (tenantId: string) =>
    request<EntitlementOverrideRecord[]>(`/tenants/${tenantId}/entitlements/overrides`),

  createTenantOverride: (
    tenantId: string,
    data: {
      applicationCode: 'hrms' | 'crm' | 'project_management';
      moduleCode: string;
      overrideType: 'enable' | 'disable' | 'limit';
      overrideValue?: Record<string, unknown>;
      reason: string;
      validUntil?: string | null;
    },
  ) =>
    request<EntitlementOverrideRecord>(`/tenants/${tenantId}/entitlements/overrides`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  revokeTenantOverride: (tenantId: string, overrideId: string, reason?: string) =>
    request<{ success: boolean }>(
      `/tenants/${tenantId}/entitlements/overrides/${overrideId}/revoke`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    ),

  cancelSubscription: (id: string, reason?: string) =>
    request<SubscriptionDetailRecord>(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  renewSubscription: (id: string) =>
    request<SubscriptionDetailRecord>(`/subscriptions/${id}/renew`, {
      method: 'POST',
    }),

  updateSubscription: (
    id: string,
    data: { planId?: string; licensedSeats?: number; accessMode?: 'trial' | 'paid' },
  ) =>
    request<SubscriptionDetailRecord>(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listProvisioningJobs: async (
    params: { tenantId?: string; status?: string; limit?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.status) query.set('status', params.status);
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<
      { data?: ProvisioningJobRecord[]; total?: number } | ProvisioningJobRecord[]
    >(`/provisioning/jobs${qs}`);
    if (Array.isArray(res)) return { items: res, total: res.length };
    const items = Array.isArray(res?.data) ? res.data : [];
    return { items, total: res?.total ?? items.length };
  },

  getProvisioningJob: (id: string) =>
    request<ProvisioningJobRecord>(`/provisioning/jobs/${id}`),

  retryProvisioningJob: (id: string) =>
    request<{ data: ProvisioningJobRecord; message: string }>(`/provisioning/jobs/${id}/retry`, {
      method: 'POST',
    }),

  getWorkerStatus: () => request<WorkerStatusRecord>('/provisioning/workers/status'),

  getTenantLifecycleHistory: (id: string) =>
    request<LifecycleEventRecord[]>(`/tenants/${id}/lifecycle-history`),

  reactivateTenant: (id: string, reason?: string) =>
    request<TenantRecord>(`/tenants/${id}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  terminateTenant: (id: string, confirmTenantId: string, reason: string) =>
    request<{ data: TenantRecord; success: boolean }>(`/tenants/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ confirmTenantId, reason }),
    }),

  getTenantActivity: (id: string, params: TenantActivityParams = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.actorEmail) query.set('actorEmail', params.actorEmail);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ items: AuditLogEntry[]; total: number; page: number; limit: number }>(
      `/tenants/${id}/activity${qs}`,
    );
  },

  downloadTenantActivityCsv: async (
    id: string,
    params: TenantActivityParams = {},
  ): Promise<Blob> => {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.actorEmail) query.set('actorEmail', params.actorEmail);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await authorizedFetch(`${API_BASE}/tenants/${id}/activity/export${qs}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
    return res.blob();
  },
};
