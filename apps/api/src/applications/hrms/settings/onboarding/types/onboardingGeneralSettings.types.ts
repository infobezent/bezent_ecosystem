/**
 * BEZENT HRMS - Forms & Onboarding General Settings Domain Types
 * Balanced Configuration model covering:
 * 1. Onboarding Preferences
 * 2. Access & Permissions
 * 3. Workflow Preferences
 * 4. Date & Time Preferences
 */

export type CandidateInitialStatus =
  | 'draft'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved';

export type AssignedHrAccessScope = 'assigned_only' | 'all_hr';

export type ManagerVisibilityScope =
  | 'assigned_reports_only'
  | 'department_wide'
  | 'all';

export type DayCalculationMode = 'business_days' | 'calendar_days';

export type TimeFormatMode = '12_hour' | '24_hour';

export type SupportedDateFormat =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD';

export interface OnboardingPreferencesConfig {
  defaultPipelineId: string;
  defaultChecklistTemplateId: string;
  defaultCandidateStatus: CandidateInitialStatus;
  candidateSelfRegistrationEnabled: boolean;
  hrManualCreationEnabled: boolean;
  allowCandidateProfileEditingAfterSubmission: boolean;
  onboardingEnabled: boolean;
}

export interface AccessPermissionsConfig {
  candidatePortalAccess: boolean;
  hrOnboardingAccessRoles: string[];
  assignedHrAccessScope: AssignedHrAccessScope;
  managerVisibilityScope: ManagerVisibilityScope;
  documentAccessRoles: string[];
  roleBasedOnboardingActions: string[];
}

export interface WorkflowPreferencesConfig {
  allowCandidateStageSkipping: boolean;
  requireReasonForBackwardStageMovement: boolean;
  allowChecklistReassignment: boolean;
  allowOverdueTaskCompletion: boolean;
  requireApprovalForConfiguredActions: boolean;
  allowReopeningCompletedCases: boolean;
}

export interface DateTimePreferencesConfig {
  timezone: string;
  dateFormat: SupportedDateFormat;
  timeFormat: TimeFormatMode;
  dayCalculation: DayCalculationMode;
  workingDays: number[]; // 1 = Monday, 7 = Sunday (e.g. [1, 2, 3, 4, 5])
}

export interface OnboardingGeneralSettingsConfig {
  tenantId: string;
  companyId: string;
  preferences: OnboardingPreferencesConfig;
  access: AccessPermissionsConfig;
  workflow: WorkflowPreferencesConfig;
  dateTime: DateTimePreferencesConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateOnboardingGeneralSettingsConfigDto {
  preferences?: Partial<OnboardingPreferencesConfig>;
  access?: Partial<AccessPermissionsConfig>;
  workflow?: Partial<WorkflowPreferencesConfig>;
  dateTime?: Partial<DateTimePreferencesConfig>;
}
