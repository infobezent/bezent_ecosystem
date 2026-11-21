import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { Skeleton } from '../../../../../../design-system/components/Skeleton/Skeleton';
import { BezentIcon } from '../../../../../../design-system/icons';
import {
  fetchGeneralConfig,
  updateGeneralConfig,
  resetGeneralConfig,
} from '../../../api/onboardingGeneralSettingsApi';
import type {
  OnboardingGeneralSettingsConfig,
  OnboardingPreferencesConfig,
  AccessPermissionsConfig,
  WorkflowPreferencesConfig,
  DateTimePreferencesConfig,
} from '../../../types/onboardingGeneralSettings.types';
import { OnboardingPreferencesModal } from './OnboardingPreferencesModal';
import { AccessPermissionsModal } from './AccessPermissionsModal';
import { WorkflowPreferencesModal } from './WorkflowPreferencesModal';
import { DateTimePreferencesModal } from './DateTimePreferencesModal';

interface OnboardingGeneralSettingsManagementProps {
  isEmbedded?: boolean;
}

export const DEFAULT_GENERAL_CONFIG: OnboardingGeneralSettingsConfig = {
  tenantId: 'default',
  companyId: 'default',
  preferences: {
    defaultPipelineId: 'standard_onboarding',
    defaultChecklistTemplateId: 'standard_checklists',
    defaultCandidateStatus: 'invited',
    candidateSelfRegistrationEnabled: true,
    hrManualCreationEnabled: true,
    allowCandidateProfileEditingAfterSubmission: false,
    onboardingEnabled: true,
  },
  access: {
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
  },
  workflow: {
    allowCandidateStageSkipping: false,
    requireReasonForBackwardStageMovement: true,
    allowChecklistReassignment: true,
    allowOverdueTaskCompletion: true,
    requireApprovalForConfiguredActions: true,
    allowReopeningCompletedCases: false,
  },
  dateTime: {
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12_hour',
    dayCalculation: 'business_days',
    workingDays: [1, 2, 3, 4, 5],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export function OnboardingGeneralSettingsManagement({
  isEmbedded = false,
}: OnboardingGeneralSettingsManagementProps) {
  const [config, setConfig] = useState<OnboardingGeneralSettingsConfig>(DEFAULT_GENERAL_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal visibility states
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGeneralConfig();
      if (data) {
        setConfig(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load general settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const showSuccessBanner = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSavePreferences = async (preferences: OnboardingPreferencesConfig) => {
    try {
      const updated = await updateGeneralConfig({ preferences });
      setConfig(updated);
      showSuccessBanner('Onboarding preferences updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  };

  const handleSaveAccess = async (access: AccessPermissionsConfig) => {
    try {
      const updated = await updateGeneralConfig({ access });
      setConfig(updated);
      showSuccessBanner('Access & permissions updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update access permissions');
    }
  };

  const handleSaveWorkflow = async (workflow: WorkflowPreferencesConfig) => {
    try {
      const updated = await updateGeneralConfig({ workflow });
      setConfig(updated);
      showSuccessBanner('Workflow preferences updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow preferences');
    }
  };

  const handleSaveDateTime = async (dateTime: DateTimePreferencesConfig) => {
    try {
      const updated = await updateGeneralConfig({ dateTime });
      setConfig(updated);
      showSuccessBanner('Date & time preferences updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update date & time preferences');
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all general settings to system defaults?')) {
      return;
    }
    try {
      setLoading(true);
      const reset = await resetGeneralConfig();
      setConfig(reset);
      showSuccessBanner('General settings reset to system defaults successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset general settings');
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting for status summary
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'invited':
        return 'Invited';
      case 'draft':
        return 'Draft';
      case 'in_progress':
        return 'In Progress';
      case 'submitted':
        return 'Submitted';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      default:
        return status;
    }
  };

  const formatDays = (days: number[]) => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (days.length === 5 && days.every((d, i) => d === i + 1)) {
      return 'Mon – Fri (5 Business Days)';
    }
    if (days.length === 6 && days.every((d, i) => d === i + 1)) {
      return 'Mon – Sat (6 Business Days)';
    }
    return days.map((d) => dayNames[d - 1]).join(', ');
  };

  return (
    <div
      className={`bezent-genpref-management ${
        isEmbedded ? 'bezent-genpref-management--embedded' : ''
      }`}
    >
      {/* 1. Header (Clean & Embedded-Aware) */}
      <div
        className={`bezent-genpref-header ${
          isEmbedded ? 'bezent-genpref-header--embedded' : ''
        }`}
      >
        <div
          className={`bezent-genpref-header-copy ${
            isEmbedded ? 'bezent-sr-only' : ''
          }`}
        >
          <h2 className="bezent-genpref-header-title">General Settings</h2>
          <p className="bezent-genpref-header-sub">
            Configure overarching onboarding preferences, access boundaries, stage workflow rules, and regional date/time formats.
          </p>
        </div>

        <div className="bezent-genpref-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetToDefaults}
            leftIcon={<BezentIcon name="refresh" size={14} />}
            disabled={loading}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bezent-genpref-banner">
          <Alert variant="success" title="Settings Saved">
            {successMessage}
          </Alert>
        </div>
      )}

      {error && (
        <div className="bezent-genpref-banner">
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        </div>
      )}

      {/* Zero-CLS Skeleton Loading */}
      {loading ? (
        <div className="bezent-genpref-tiles-grid bezent-genpref-grid">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bezent-genpref-tile bezent-genpref-card bezent-genpref-tile--skeleton"
            >
              <div className="bezent-genpref-skeleton-icon">
                <Skeleton width="100%" height="100%" />
              </div>
              <div className="bezent-genpref-skeleton-text-group">
                <Skeleton width="75%" height="16px" />
              </div>
              <div className="bezent-genpref-skeleton-pill">
                <Skeleton width="100%" height="100%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Four Section Cards in Modern Interactive Square Tiles Grid */
        <div className="bezent-genpref-tiles-grid bezent-genpref-grid">
          {/* Card 1: Onboarding Preferences */}
          <div
            className="bezent-genpref-tile bezent-genpref-card"
            onClick={() => setPreferencesModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPreferencesModalOpen(true)}
            title="Configure Onboarding Preferences"
            aria-label="Onboarding Preferences"
          >
            <div
              className="bezent-genpref-tile__icon bezent-genpref-tile__icon--preferences"
              aria-hidden="true"
            >
              <BezentIcon name="settings" size={22} />
            </div>

            <div className="bezent-genpref-tile__content">
              <h3 className="bezent-genpref-card__title bezent-genpref-tile__title">
                Onboarding Preferences
              </h3>
              <div className="bezent-sr-only">
                <span className="bezent-genpref-card__subtitle">
                  Defaults, registration permissions, and module status
                </span>
                <span className="bezent-genpref-summary-label">Default Pipeline &amp; Checklist</span>
                <span className="bezent-genpref-summary-val">
                  {config.preferences.defaultPipelineId} • {config.preferences.defaultChecklistTemplateId}
                </span>
                <span className="bezent-genpref-summary-label">Initial Status</span>
                <span className="bezent-genpref-summary-val">
                  {getStatusLabel(config.preferences.defaultCandidateStatus)}
                </span>
                <span className="bezent-genpref-summary-label">Candidate Registration</span>
                <span className="bezent-genpref-summary-val">
                  Self-registration {config.preferences.candidateSelfRegistrationEnabled ? 'enabled' : 'disabled'} • HR manual creation {config.preferences.hrManualCreationEnabled ? 'enabled' : 'disabled'}
                </span>
                <span className="bezent-genpref-summary-label">Profile Editing</span>
                <span className="bezent-genpref-summary-val">
                  {config.preferences.allowCandidateProfileEditingAfterSubmission
                    ? 'Allowed after submission'
                    : 'Locked upon submission'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreferencesModalOpen(true)}
                >
                  Configure
                </Button>
              </div>
            </div>

            <div className="bezent-genpref-tile__badge bezent-genpref-tile__badge--preferences">
              <span className="bezent-genpref-tile__badge-dot" />
              <span className="bezent-genpref-tile__badge-text">
                {config.preferences.onboardingEnabled ? 'MODULE ACTIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Card 2: Access & Permissions */}
          <div
            className="bezent-genpref-tile bezent-genpref-card"
            onClick={() => setAccessModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAccessModalOpen(true)}
            title="Configure Access & Permissions"
            aria-label="Access & Permissions"
          >
            <div
              className="bezent-genpref-tile__icon bezent-genpref-tile__icon--access"
              aria-hidden="true"
            >
              <BezentIcon name="user" size={22} />
            </div>

            <div className="bezent-genpref-tile__content">
              <h3 className="bezent-genpref-card__title bezent-genpref-tile__title">
                Access &amp; Permissions
              </h3>
              <div className="bezent-sr-only">
                <span className="bezent-genpref-card__subtitle">
                  Portal access, HR scopes, and role permissions
                </span>
                <span className="bezent-genpref-summary-label">Candidate Portal</span>
                <span className="bezent-genpref-summary-val">
                  {config.access.candidatePortalAccess
                    ? 'Enabled for invited candidates'
                    : 'Disabled / HR managed only'}
                </span>
                <span className="bezent-genpref-summary-label">HR Coordinator Scope</span>
                <span className="bezent-genpref-summary-val">
                  {config.access.assignedHrAccessScope === 'all_hr'
                    ? 'All organization candidates'
                    : 'Assigned candidates only'}
                </span>
                <span className="bezent-genpref-summary-label">Manager Visibility</span>
                <span className="bezent-genpref-summary-val">
                  {config.access.managerVisibilityScope === 'assigned_reports_only'
                    ? 'Direct & indirect reports only'
                    : config.access.managerVisibilityScope === 'department_wide'
                    ? 'Department-wide candidates'
                    : 'All organization candidates'}
                </span>
                <span className="bezent-genpref-summary-label">Role Permissions</span>
                <span className="bezent-genpref-summary-val">
                  {config.access.hrOnboardingAccessRoles.length} HR roles • {config.access.documentAccessRoles.length} document viewers • {config.access.roleBasedOnboardingActions.length} transition roles
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAccessModalOpen(true)}
                >
                  Configure
                </Button>
              </div>
            </div>

            <div className="bezent-genpref-tile__badge bezent-genpref-tile__badge--access">
              <span className="bezent-genpref-tile__badge-dot" />
              <span className="bezent-genpref-tile__badge-text">
                {config.access.candidatePortalAccess ? 'PORTAL ACTIVE' : 'PORTAL OFF'}
              </span>
            </div>
          </div>

          {/* Card 3: Workflow Preferences */}
          <div
            className="bezent-genpref-tile bezent-genpref-card"
            onClick={() => setWorkflowModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setWorkflowModalOpen(true)}
            title="Configure Workflow Preferences"
            aria-label="Workflow Preferences"
          >
            <div
              className="bezent-genpref-tile__icon bezent-genpref-tile__icon--workflow"
              aria-hidden="true"
            >
              <BezentIcon name="check" size={22} />
            </div>

            <div className="bezent-genpref-tile__content">
              <h3 className="bezent-genpref-card__title bezent-genpref-tile__title">
                Workflow Preferences
              </h3>
              <div className="bezent-sr-only">
                <span className="bezent-genpref-card__subtitle">
                  Stage skipping, backward justifications, and approvals
                </span>
                <span className="bezent-genpref-summary-label">Stage Progression</span>
                <span className="bezent-genpref-summary-val">
                  Stage skipping {config.workflow.allowCandidateStageSkipping ? 'permitted' : 'disallowed'} • Backward reasons {config.workflow.requireReasonForBackwardStageMovement ? 'mandatory' : 'optional'}
                </span>
                <span className="bezent-genpref-summary-label">Checklist Tasks</span>
                <span className="bezent-genpref-summary-val">
                  Reassignment {config.workflow.allowChecklistReassignment ? 'allowed' : 'locked'} • Overdue completion {config.workflow.allowOverdueTaskCompletion ? 'allowed' : 'restricted'}
                </span>
                <span className="bezent-genpref-summary-label">Action Approvals</span>
                <span className="bezent-genpref-summary-val">
                  {config.workflow.requireApprovalForConfiguredActions
                    ? 'Manager / HR approval required'
                    : 'Immediate execution'}
                </span>
                <span className="bezent-genpref-summary-label">Case Lifecycle</span>
                <span className="bezent-genpref-summary-val">
                  {config.workflow.allowReopeningCompletedCases
                    ? 'Reopening completed cases allowed'
                    : 'Completed cases permanently archived'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setWorkflowModalOpen(true)}
                >
                  Configure
                </Button>
              </div>
            </div>

            <div className="bezent-genpref-tile__badge bezent-genpref-tile__badge--workflow">
              <span className="bezent-genpref-tile__badge-dot" />
              <span className="bezent-genpref-tile__badge-text">
                {config.workflow.allowCandidateStageSkipping ? 'STAGE SKIPPING ON' : 'STRICT PIPELINE'}
              </span>
            </div>
          </div>

          {/* Card 4: Date & Time Preferences */}
          <div
            className="bezent-genpref-tile bezent-genpref-card"
            onClick={() => setDateTimeModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDateTimeModalOpen(true)}
            title="Configure Date & Time Preferences"
            aria-label="Date & Time Preferences"
          >
            <div
              className="bezent-genpref-tile__icon bezent-genpref-tile__icon--datetime"
              aria-hidden="true"
            >
              <BezentIcon name="calendar" size={22} />
            </div>

            <div className="bezent-genpref-tile__content">
              <h3 className="bezent-genpref-card__title bezent-genpref-tile__title">
                Date &amp; Time Preferences
              </h3>
              <div className="bezent-sr-only">
                <span className="bezent-genpref-card__subtitle">
                  Timezone, date formats, and working week
                </span>
                <span className="bezent-genpref-summary-label">Tenant Timezone</span>
                <span className="bezent-genpref-summary-val">
                  {config.dateTime.timezone}
                </span>
                <span className="bezent-genpref-summary-label">Display Formats</span>
                <span className="bezent-genpref-summary-val">
                  {config.dateTime.dateFormat} • {config.dateTime.timeFormat === '12_hour' ? '12h AM/PM' : '24h'}
                </span>
                <span className="bezent-genpref-summary-label">SLA Calculation</span>
                <span className="bezent-genpref-summary-val">
                  {config.dateTime.dayCalculation === 'business_days'
                    ? 'Business Days (Excludes non-working days)'
                    : 'Calendar Days (Continuous)'}
                </span>
                <span className="bezent-genpref-summary-label">Working Schedule</span>
                <span className="bezent-genpref-summary-val">
                  {formatDays(config.dateTime.workingDays)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDateTimeModalOpen(true)}
                >
                  Configure
                </Button>
              </div>
            </div>

            <div className="bezent-genpref-tile__badge bezent-genpref-tile__badge--datetime">
              <span className="bezent-genpref-tile__badge-dot" />
              <span className="bezent-genpref-tile__badge-text">
                {config.dateTime.timezone.split('/')[1] || config.dateTime.timezone}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Popups */}
      {preferencesModalOpen && (
        <OnboardingPreferencesModal
          isOpen={preferencesModalOpen}
          onClose={() => setPreferencesModalOpen(false)}
          initialConfig={config.preferences}
          onSave={handleSavePreferences}
        />
      )}

      {accessModalOpen && (
        <AccessPermissionsModal
          isOpen={accessModalOpen}
          onClose={() => setAccessModalOpen(false)}
          initialConfig={config.access}
          onSave={handleSaveAccess}
        />
      )}

      {workflowModalOpen && (
        <WorkflowPreferencesModal
          isOpen={workflowModalOpen}
          onClose={() => setWorkflowModalOpen(false)}
          initialConfig={config.workflow}
          onSave={handleSaveWorkflow}
        />
      )}

      {dateTimeModalOpen && (
        <DateTimePreferencesModal
          isOpen={dateTimeModalOpen}
          onClose={() => setDateTimeModalOpen(false)}
          initialConfig={config.dateTime}
          onSave={handleSaveDateTime}
        />
      )}
    </div>
  );
}

export default OnboardingGeneralSettingsManagement;
