import type {
  OnboardingGeneralSettingsConfig,
  OnboardingPreferencesConfig,
  AccessPermissionsConfig,
  WorkflowPreferencesConfig,
  DateTimePreferencesConfig,
} from '../types/onboardingGeneralSettings.types.js';

export function getDefaultOnboardingPreferences(): OnboardingPreferencesConfig {
  return {
    defaultPipelineId: 'standard_onboarding',
    defaultChecklistTemplateId: 'standard_checklists',
    defaultCandidateStatus: 'invited',
    candidateSelfRegistrationEnabled: true,
    hrManualCreationEnabled: true,
    allowCandidateProfileEditingAfterSubmission: false,
    onboardingEnabled: true,
  };
}

export function getDefaultAccessPermissions(): AccessPermissionsConfig {
  return {
    candidatePortalAccess: true,
    hrOnboardingAccessRoles: [
      'super_admin',
      'company_admin',
      'hr_manager',
      'hr_executive',
      'hr_specialist',
    ],
    assignedHrAccessScope: 'all_hr',
    managerVisibilityScope: 'assigned_reports_only',
    documentAccessRoles: [
      'super_admin',
      'company_admin',
      'hr_manager',
      'hr_executive',
    ],
    roleBasedOnboardingActions: [
      'super_admin',
      'company_admin',
      'hr_manager',
    ],
  };
}

export function getDefaultWorkflowPreferences(): WorkflowPreferencesConfig {
  return {
    allowCandidateStageSkipping: false,
    requireReasonForBackwardStageMovement: true,
    allowChecklistReassignment: true,
    allowOverdueTaskCompletion: true,
    requireApprovalForConfiguredActions: true,
    allowReopeningCompletedCases: false,
  };
}

export function getDefaultDateTimePreferences(): DateTimePreferencesConfig {
  return {
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12_hour',
    dayCalculation: 'business_days',
    workingDays: [1, 2, 3, 4, 5], // Monday - Friday
  };
}

export function getDefaultGeneralSettingsConfig(
  tenantId: string,
  companyId: string,
): OnboardingGeneralSettingsConfig {
  return {
    tenantId,
    companyId,
    preferences: getDefaultOnboardingPreferences(),
    access: getDefaultAccessPermissions(),
    workflow: getDefaultWorkflowPreferences(),
    dateTime: getDefaultDateTimePreferences(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
}
