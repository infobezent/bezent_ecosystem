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

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  maxCompanies: number;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  companyCount?: number;
  companies?: TenantCompanySummary[];
  companyCapacity?: CompanyCapacitySummary;
  userCount?: number;
  activeModules?: string[];
  adminsCount?: number;
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
  attention?: CustomerHealthStatus;
  page?: number;
  limit?: number;
}
