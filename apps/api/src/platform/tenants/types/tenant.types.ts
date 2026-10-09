export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export type CustomerHealthStatus = 'healthy' | 'needs_attention' | 'critical';

export interface NextBestAction {
  label: string;
  actionType: string;
  targetTab?: 'overview' | 'companies' | 'applications' | 'administrators' | 'activity';
  targetPath?: string;
  description?: string;
}

export interface CustomerHealth {
  status: CustomerHealthStatus;
  reason: string;
  reasons: string[];
  nextBestAction?: NextBestAction | null;
}

export interface SetupMilestone {
  key: string;
  label: string;
  title?: string;
  completed: boolean;
  description: string;
  completedAt?: string | null;
}

export interface SetupProgress {
  totalMilestones: number;
  completedMilestones: number;
  percentage: number;
  isComplete: boolean;
  milestones: SetupMilestone[];
}

export interface CompanyCapacitySummary {
  used: number;
  max: number;
  remaining: number;
}

export interface TenantCompanySummary {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface TenantPrimaryAdminSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  invitedAt?: string | null;
  acceptedAt?: string | null;
}

export interface TenantSubscriptionSummary {
  activePlans: string[];
  totalSeats: number;
  hasTrial: boolean;
}

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  maxCompanies: number;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  companyCount?: number;
  companies?: TenantCompanySummary[];
  companyCapacity?: CompanyCapacitySummary;
  userCount?: number;
  activeModules?: string[];
  adminsCount?: number;
  primaryAdmin?: TenantPrimaryAdminSummary | null;
  subscriptionSummary?: TenantSubscriptionSummary;
  derivedCommercialClassification?: 'active' | 'trial' | 'suspended' | 'pending_setup' | 'archived';
  health?: CustomerHealth;
  setupProgress?: SetupProgress;
}

export interface CreateTenantDto {
  id?: string;
  name: string;
  code: string;
  maxCompanies?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: TenantStatus;
}

export interface UpdateTenantDto {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface UpdateCompanyCapacityDto {
  maxCompanies: number;
}

export interface TenantFilter {
  search?: string;
  status?: TenantStatus;
  moduleCode?: string;
  application?: string;
  planId?: string;
  trial?: boolean | string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: 'name' | 'createdAt' | 'status' | 'id';
  sortOrder?: 'asc' | 'desc';
  attention?: CustomerHealthStatus;
  page?: number;
  limit?: number;
}

export interface TenantActivityFilter {
  action?: string;
  actorUserId?: string;
  actorEmail?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export interface TenantOverviewDto {
  tenant: {
    id: string;
    name: string;
    code: string;
    status: TenantStatus;
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
  companyCapacity: CompanyCapacitySummary;
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
