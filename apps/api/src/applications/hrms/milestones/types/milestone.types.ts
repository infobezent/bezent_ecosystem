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
    posterData?: Record<string, unknown> | null;
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
    }> | null;
  }>;
}

export interface UpdateMilestoneConfigDto {
  milestoneKey: string;
  title: string;
  description?: string;
  requiredHours: number;
  badgeIcon?: string;
  badgeLabel?: string;
  posterTemplate?: Record<string, unknown>;
  approvalRequired?: boolean;
  isActive?: boolean;
}

export interface RewardCatalogueItemInput {
  milestoneKey: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateRewardStatusDto {
  status:
    | 'eligible'
    | 'pending_approval'
    | 'approved'
    | 'assigned'
    | 'dispatched'
    | 'fulfilled'
    | 'cancelled';
  notes?: string;
  reason?: string;
}
