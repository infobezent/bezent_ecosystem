import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Select, type SelectOption } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import { fetchPipelines } from '../../../api/pipelineSettingsApi';
import { fetchChecklistTemplates } from '../../../api/checklistSettingsApi';
import type {
  OnboardingPreferencesConfig,
  CandidateInitialStatus,
} from '../../../types/onboardingGeneralSettings.types';

interface OnboardingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: OnboardingPreferencesConfig;
  onSave: (preferences: OnboardingPreferencesConfig) => Promise<void>;
}

const CANDIDATE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'invited', label: 'Invited (Candidate receives invitation link)' },
  { value: 'draft', label: 'Draft (Initial intake draft before send)' },
  { value: 'in_progress', label: 'In Progress (Active registration filling)' },
  { value: 'submitted', label: 'Submitted (Registration completed, awaiting review)' },
  { value: 'under_review', label: 'Under Review (HR document & verification checks)' },
  { value: 'approved', label: 'Approved (Ready for employee conversion)' },
];

export function OnboardingPreferencesModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
}: OnboardingPreferencesModalProps) {
  const [formData, setFormData] = useState<OnboardingPreferencesConfig>(initialConfig);
  const [pipelineOptions, setPipelineOptions] = useState<SelectOption[]>([
    { value: 'standard_onboarding', label: 'Standard Enterprise Onboarding Pipeline' },
  ]);
  const [templateOptions, setTemplateOptions] = useState<SelectOption[]>([
    { value: 'standard_checklists', label: 'Standard New Hire Checklist' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialConfig);
      setError(null);

      // Load active pipelines
      fetchPipelines()
        .then((pipelines) => {
          if (Array.isArray(pipelines) && pipelines.length > 0) {
            const opts: SelectOption[] = pipelines
              .filter((p) => p.isActive)
              .map((p) => ({
                value: p.id,
                label: p.isDefault ? `${p.name} (Default)` : p.name,
              }));
            if (opts.length > 0) setPipelineOptions(opts);
          }
        })
        .catch(() => {
          // Keep default fallback
        });

      // Load active checklist templates
      fetchChecklistTemplates()
        .then((templates) => {
          if (Array.isArray(templates) && templates.length > 0) {
            const opts: SelectOption[] = templates
              .filter((t) => t.isActive)
              .map((t) => ({
                value: t.id,
                label: t.name,
              }));
            if (opts.length > 0) setTemplateOptions(opts);
          }
        })
        .catch(() => {
          // Keep default fallback
        });
    }
  }, [isOpen, initialConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Onboarding Preferences"
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
            aria-label="Save Preferences"
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

        {/* Hero Enable / Disable Onboarding module */}
        <div
          className={`bezent-genpref-hero-switch ${
            formData.onboardingEnabled
              ? 'bezent-genpref-hero-switch--active'
              : 'bezent-genpref-hero-switch--paused'
          }`}
        >
          <div className="bezent-genpref-hero-switch__left">
            <div className="bezent-genpref-hero-switch__icon" aria-hidden="true">
              <BezentIcon name="settings" size={20} />
            </div>
            <div className="bezent-genpref-hero-switch__title-row">
              <span className="bezent-genpref-toggle-title">Enable Onboarding Module</span>
              <span
                className={`bezent-genpref-status-pill ${
                  formData.onboardingEnabled
                    ? 'bezent-genpref-status-pill--active'
                    : 'bezent-genpref-status-pill--paused'
                }`}
              >
                <span className="bezent-genpref-status-pill__dot" />
                {formData.onboardingEnabled ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
          <Switch
            checked={formData.onboardingEnabled}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, onboardingEnabled: e.target.checked }))
            }
            aria-label="Enable Onboarding Module"
          />
        </div>

        {/* Section 1: Pipeline & Status Defaults */}
        <div className="bezent-genpref-modal-section">
          <div className="bezent-genpref-section-header">
            <div className="bezent-genpref-section-header__title">
              <BezentIcon name="check" size={15} />
              <span>Pipeline &amp; Status Defaults</span>
            </div>
          </div>

          <div className="bezent-genpref-grid-2col">
            {/* Default Pipeline */}
            <div className="bezent-genpref-field">
              <label className="bezent-genpref-label" htmlFor="genpref-default-pipeline">
                Default Pipeline
              </label>
              <Select
                id="genpref-default-pipeline"
                options={pipelineOptions}
                value={formData.defaultPipelineId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultPipelineId: e.target.value }))
                }
              />
            </div>

            {/* Default Checklist Template */}
            <div className="bezent-genpref-field">
              <label className="bezent-genpref-label" htmlFor="genpref-default-checklist">
                Default Checklist Template
              </label>
              <Select
                id="genpref-default-checklist"
                options={templateOptions}
                value={formData.defaultChecklistTemplateId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultChecklistTemplateId: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Default Candidate Status */}
          <div className="bezent-genpref-field">
            <label className="bezent-genpref-label" htmlFor="genpref-default-status">
              Default Candidate Initial Status
            </label>
            <Select
              id="genpref-default-status"
              options={CANDIDATE_STATUS_OPTIONS}
              value={formData.defaultCandidateStatus}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultCandidateStatus: e.target.value as CandidateInitialStatus,
                }))
              }
            />
          </div>
        </div>

        {/* Section 2: Candidate Registration & Permissions */}
        <div className="bezent-genpref-modal-section">
          <div className="bezent-genpref-section-header">
            <div className="bezent-genpref-section-header__title">
              <BezentIcon name="user" size={15} />
              <span>Candidate Registration &amp; Permissions</span>
            </div>
          </div>

          {/* Unified Switches Card */}
          <div className="bezent-genpref-switches-card">
            {/* Candidate Self-Registration */}
            <div className="bezent-genpref-switch-row">
              <span className="bezent-genpref-toggle-title">Candidate Self-Registration</span>
              <Switch
                checked={formData.candidateSelfRegistrationEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    candidateSelfRegistrationEnabled: e.target.checked,
                  }))
                }
                aria-label="Candidate Self-Registration"
              />
            </div>

            {/* HR Manual Candidate Creation */}
            <div className="bezent-genpref-switch-row">
              <span className="bezent-genpref-toggle-title">HR Manual Candidate Creation</span>
              <Switch
                checked={formData.hrManualCreationEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hrManualCreationEnabled: e.target.checked,
                  }))
                }
                aria-label="HR Manual Candidate Creation"
              />
            </div>

            {/* Allow Profile Editing After Submission */}
            <div className="bezent-genpref-switch-row">
              <span className="bezent-genpref-toggle-title">
                Candidate Profile Editing After Submission
              </span>
              <Switch
                checked={formData.allowCandidateProfileEditingAfterSubmission}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    allowCandidateProfileEditingAfterSubmission: e.target.checked,
                  }))
                }
                aria-label="Candidate Profile Editing After Submission"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
