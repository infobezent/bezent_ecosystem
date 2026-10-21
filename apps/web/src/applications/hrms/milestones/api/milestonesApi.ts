import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

export interface WorkingHoursSummary {
  lifetimeHours: number;
  lifetimeMinutes: number;
  attendanceHours: number;
  timesheetApprovedHours: number;
  timesheetDedupedHours: number;
  preventedDuplicateHours: number;
  totalVerifiedWorkdays: number;
  calculationExplanation: string;
  yearlySummaries: Array<{
    year: string;
    attendanceHours: number;
    timesheetHours: number;
    totalHours: number;
    workdaysCount: number;
  }>;
  monthlySummaries: Array<{
    month: string;
    attendanceHours: number;
    timesheetHours: number;
    totalHours: number;
    workdaysCount: number;
  }>;
  recentDailyBreakdown: Array<{
    date: string;
    source: 'attendance' | 'timesheet' | 'both';
    attendanceMinutes: number;
    timesheetHours: number;
    verifiedHours: number;
    isDuplicatePrevented: boolean;
    status: string;
    notes?: string;
  }>;
}

export interface MilestoneProgressItem {
  milestoneKey: string;
  title: string;
  description: string | null;
  requiredHours: number;
  badgeIcon: string;
  badgeLabel: string;
  currentHours: number;
  percentComplete: number;
  isAchieved: boolean;
  achievedAt?: string | null;
  status?: 'unlocked' | 'reviewed' | 'published' | null;
  posterData?: {
    employeeName: string;
    employeeNumber?: string;
    designation?: string;
    department?: string;
    companyName: string;
    photoUrl?: string;
    milestoneHours: number;
    milestoneTitle: string;
    achievedDate: string;
    publishedToFeed: boolean;
  } | null;
  achievementId?: string | null;
}

export interface EmployeeMilestoneOverview {
  employeeId: string;
  workingHours: WorkingHoursSummary;
  milestones: MilestoneProgressItem[];
  achievements: Array<{
    id: string;
    milestoneKey: string;
    milestoneTitle: string;
    milestoneHours: number;
    achievedHours: number;
    status: 'unlocked' | 'reviewed' | 'published';
    achievedAt: string;
    posterPublishedAt?: string | null;
    posterData?: {
      employeeName: string;
      employeeNumber?: string;
      designation?: string;
      department?: string;
      companyName: string;
      photoUrl?: string;
      milestoneHours: number;
      milestoneTitle: string;
      achievedDate: string;
      publishedToFeed: boolean;
    } | null;
  }>;
  rewardAssignments: Array<{
    id: string;
    achievementId: string;
    rewardId: string;
    rewardName: string;
    status: string;
    approvedAt?: string | null;
    fulfilledAt?: string | null;
    notes?: string | null;
    auditHistory?: Array<{
      status: string;
      changedBy: string;
      timestamp: string;
      reason?: string;
    }>;
  }>;
}

export interface MilestoneConfigDto {
  id: string;
  tenantId: string;
  companyId: string;
  milestoneKey: string;
  title: string;
  description: string | null;
  requiredHours: number;
  badgeIcon: string;
  badgeLabel: string;
  posterTemplate: {
    titleTemplate?: string;
    subtitleTemplate?: string;
    primaryColor?: string;
    includePhoto?: boolean;
    includeDepartment?: boolean;
    includeJoiningDate?: boolean;
  } | null;
  approvalRequired: boolean;
  isActive: boolean;
}

export interface RewardsCatalogueItemDto {
  id: string;
  tenantId: string;
  companyId: string;
  milestoneKey: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
}

export interface EmployeeRewardAssignmentDto {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string;
  achievementId: string;
  rewardId: string;
  rewardName: string;
  status: string;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  fulfilledAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  auditHistory?: Array<{
    status: string;
    changedBy: string;
    timestamp: string;
    reason?: string;
  }>;
}

export class MilestonesApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'MilestonesApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${appConfig.apiBaseUrl}${path}`;
  const res = await authorizedFetch(url, init);

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = (body as { error?: { message?: string; code?: string } } | null)?.error;
    throw new MilestonesApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.code ?? 'REQUEST_FAILED',
    );
  }

  return body as T;
}

export const milestonesApi = {
  async getEmployeeWorkingHours(employeeId: string): Promise<WorkingHoursSummary> {
    const res = await request<{ data: WorkingHoursSummary }>(
      `/hrms/milestones/working-hours/${encodeURIComponent(employeeId)}`,
    );
    return res.data;
  },

  async getEmployeeMilestones(employeeId: string): Promise<EmployeeMilestoneOverview> {
    const res = await request<{ data: EmployeeMilestoneOverview }>(
      `/hrms/milestones/employee/${encodeURIComponent(employeeId)}`,
    );
    return res.data;
  },

  async evaluateEmployeeMilestones(employeeId: string): Promise<EmployeeMilestoneOverview> {
    const res = await request<{ data: EmployeeMilestoneOverview }>(
      `/hrms/milestones/employee/${encodeURIComponent(employeeId)}/evaluate`,
      { method: 'POST' },
    );
    return res.data;
  },

  async publishAchievementPoster(
    achievementId: string,
  ): Promise<{ achievement: Record<string, unknown>; feedPostId: string; message: string }> {
    return request<{ achievement: Record<string, unknown>; feedPostId: string; message: string }>(
      `/hrms/milestones/achievements/${encodeURIComponent(achievementId)}/publish-poster`,
      { method: 'POST' },
    );
  },

  async getMilestoneConfigs(): Promise<MilestoneConfigDto[]> {
    const res = await request<{ data: MilestoneConfigDto[] }>('/hrms/milestones/configs');
    return res.data;
  },

  async updateMilestoneConfig(config: Partial<MilestoneConfigDto>): Promise<MilestoneConfigDto> {
    const res = await request<{ data: MilestoneConfigDto }>('/hrms/milestones/configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.data;
  },

  async getRewardsCatalogue(milestoneKey?: string): Promise<RewardsCatalogueItemDto[]> {
    const qs = milestoneKey ? `?milestoneKey=${encodeURIComponent(milestoneKey)}` : '';
    const res = await request<{ data: RewardsCatalogueItemDto[] }>(
      `/hrms/milestones/rewards/catalogue${qs}`,
    );
    return res.data;
  },

  async addRewardCatalogueItem(
    item: Partial<RewardsCatalogueItemDto>,
  ): Promise<RewardsCatalogueItemDto> {
    const res = await request<{ data: RewardsCatalogueItemDto }>(
      '/hrms/milestones/rewards/catalogue',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      },
    );
    return res.data;
  },

  async getRewardAssignments(employeeId?: string): Promise<EmployeeRewardAssignmentDto[]> {
    const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    const res = await request<{ data: EmployeeRewardAssignmentDto[] }>(
      `/hrms/milestones/rewards/assignments${qs}`,
    );
    return res.data;
  },

  async assignReward(data: {
    employeeId: string;
    achievementId: string;
    rewardId: string;
    notes?: string;
  }): Promise<EmployeeRewardAssignmentDto> {
    const res = await request<{ data: EmployeeRewardAssignmentDto }>('/hrms/milestones/rewards/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateRewardStatus(
    assignmentId: string,
    status: string,
    notes?: string,
    reason?: string,
  ): Promise<EmployeeRewardAssignmentDto> {
    const res = await request<{ data: EmployeeRewardAssignmentDto }>(
      `/hrms/milestones/rewards/assignments/${encodeURIComponent(assignmentId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, reason }),
      },
    );
    return res.data;
  },
};
