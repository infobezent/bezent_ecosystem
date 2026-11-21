import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Select, type SelectOption } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  AccessPermissionsConfig,
  AssignedHrAccessScope,
  ManagerVisibilityScope,
} from '../../../types/onboardingGeneralSettings.types';

interface AccessPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: AccessPermissionsConfig;
  onSave: (access: AccessPermissionsConfig) => Promise<void>;
}

const AVAILABLE_ROLES = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'company_admin', label: 'Company Admin' },
  { id: 'hr_manager', label: 'HR Manager' },
  { id: 'hr_executive', label: 'HR Executive' },
  { id: 'hr_specialist', label: 'HR Specialist' },
];

const HR_SCOPE_OPTIONS: SelectOption[] = [
  { value: 'all_hr', label: 'All HR Team Members (Organization-wide)' },
  { value: 'assigned_only', label: 'Assigned HR Coordinators Only' },
];

const MANAGER_SCOPE_OPTIONS: SelectOption[] = [
  { value: 'assigned_reports_only', label: 'Direct & Indirect Reports Only' },
  { value: 'department_wide', label: 'Department-Wide Candidates' },
  { value: 'all', label: 'All Candidates Organization-Wide' },
];

export function AccessPermissionsModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
}: AccessPermissionsModalProps) {
  const [formData, setFormData] = useState<AccessPermissionsConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialConfig);
      setError(null);
    }
  }, [isOpen, initialConfig]);

  const toggleRole = (
    key: 'hrOnboardingAccessRoles' | 'documentAccessRoles' | 'roleBasedOnboardingActions',
    roleId: string,
  ) => {
    setFormData((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(roleId)
        ? current.filter((r) => r !== roleId)
        : [...current, roleId];
      return { ...prev, [key]: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hrOnboardingAccessRoles.length === 0) {
      setError('At least one role must have HR Onboarding access.');
      return;
    }
    if (formData.roleBasedOnboardingActions.length === 0) {
      setError('At least one role must have permission to execute onboarding actions.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save access permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Access & Permissions"
      size="lg"
      footer={
        <div className="bezent-genpref-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            aria-label="Save Permissions"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="bezent-genpref-form">
        {error && (
          <div className="bezent-genpref-form-row">
            <Alert variant="danger" title="Validation Error">
              {error}
            </Alert>
          </div>
        )}

        {/* Hero: Candidate Portal Access */}
        <div
          className={`bezent-genpref-hero-switch ${
            formData.candidatePortalAccess
              ? 'bezent-genpref-hero-switch--active'
              : 'bezent-genpref-hero-switch--paused'
          }`}
        >
          <div className="bezent-genpref-hero-switch__left">
            <div className="bezent-genpref-hero-switch__icon" aria-hidden="true">
              <BezentIcon name="user" size={20} />
            </div>
            <div className="bezent-genpref-hero-switch__title-row">
              <span className="bezent-genpref-toggle-title">Candidate Portal Access</span>
              <span
                className={`bezent-genpref-status-pill ${
                  formData.candidatePortalAccess
                    ? 'bezent-genpref-status-pill--active'
                    : 'bezent-genpref-status-pill--paused'
                }`}
              >
                <span className="bezent-genpref-status-pill__dot" />
                {formData.candidatePortalAccess ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
          <Switch
            checked={formData.candidatePortalAccess}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, candidatePortalAccess: e.target.checked }))
            }
            aria-label="Candidate Portal Access"
          />
        </div>

        {/* Section 1: Visibility & Scope */}
        <div className="bezent-genpref-modal-section">
          <div className="bezent-genpref-section-header">
            <div className="bezent-genpref-section-header__title">
              <BezentIcon name="check" size={15} />
              <span>Scope &amp; Visibility</span>
            </div>
          </div>

          <div className="bezent-genpref-grid-2col">
            {/* Assigned HR Access Scope */}
            <div className="bezent-genpref-field">
              <label className="bezent-genpref-label" htmlFor="genpref-assigned-hr-scope">
                Assigned HR Access Scope
              </label>
              <Select
                id="genpref-assigned-hr-scope"
                options={HR_SCOPE_OPTIONS}
                value={formData.assignedHrAccessScope}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    assignedHrAccessScope: e.target.value as AssignedHrAccessScope,
                  }))
                }
              />
            </div>

            {/* Hiring Manager Visibility */}
            <div className="bezent-genpref-field">
              <label className="bezent-genpref-label" htmlFor="genpref-manager-visibility">
                Hiring Manager Visibility
              </label>
              <Select
                id="genpref-manager-visibility"
                options={MANAGER_SCOPE_OPTIONS}
                value={formData.managerVisibilityScope}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    managerVisibilityScope: e.target.value as ManagerVisibilityScope,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Section 2: Role Authorization Boundaries */}
        <div className="bezent-genpref-modal-section">
          <div className="bezent-genpref-section-header">
            <div className="bezent-genpref-section-header__title">
              <BezentIcon name="settings" size={15} />
              <span>Role Authorization Boundaries</span>
            </div>
          </div>

          {/* Grouped Roles Card */}
          <div className="bezent-genpref-roles-card">
            {/* HR Onboarding Access Roles */}
            <div className="bezent-genpref-role-row">
              <label className="bezent-genpref-label">HR Onboarding Access Roles</label>
              <div className="bezent-genpref-chip-group">
                {AVAILABLE_ROLES.map((role) => {
                  const selected = formData.hrOnboardingAccessRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`bezent-genpref-role-chip ${
                        selected ? 'bezent-genpref-role-chip--selected' : ''
                      }`}
                      onClick={() => toggleRole('hrOnboardingAccessRoles', role.id)}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sensitive Document Access Roles */}
            <div className="bezent-genpref-role-row">
              <label className="bezent-genpref-label">Sensitive Document Access Roles</label>
              <div className="bezent-genpref-chip-group">
                {AVAILABLE_ROLES.map((role) => {
                  const selected = formData.documentAccessRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`bezent-genpref-role-chip ${
                        selected ? 'bezent-genpref-role-chip--selected' : ''
                      }`}
                      onClick={() => toggleRole('documentAccessRoles', role.id)}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role-Based Onboarding Actions */}
            <div className="bezent-genpref-role-row">
              <label className="bezent-genpref-label">Privileged Onboarding Action Roles</label>
              <div className="bezent-genpref-chip-group">
                {AVAILABLE_ROLES.map((role) => {
                  const selected = formData.roleBasedOnboardingActions.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`bezent-genpref-role-chip ${
                        selected ? 'bezent-genpref-role-chip--selected' : ''
                      }`}
                      onClick={() => toggleRole('roleBasedOnboardingActions', role.id)}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
