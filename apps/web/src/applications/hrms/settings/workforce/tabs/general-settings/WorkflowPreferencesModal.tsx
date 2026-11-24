import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import type { WorkflowPreferencesConfig } from '../../../types/onboardingGeneralSettings.types';

interface WorkflowPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: WorkflowPreferencesConfig;
  onSave: (workflow: WorkflowPreferencesConfig) => Promise<void>;
}

export function WorkflowPreferencesModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
}: WorkflowPreferencesModalProps) {
  const [formData, setFormData] = useState<WorkflowPreferencesConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialConfig);
      setError(null);
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
      setError(err instanceof Error ? err.message : 'Failed to save workflow preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Workflow Preferences"
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

        {/* Unified Switches Card */}
        <div className="bezent-genpref-switches-card">
          {/* Allow candidate stage skipping */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">Allow Stage Skipping</span>
            <Switch
              checked={formData.allowCandidateStageSkipping}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  allowCandidateStageSkipping: e.target.checked,
                }))
              }
              aria-label="Allow Stage Skipping"
            />
          </div>

          {/* Require reason for backward stage movement */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">
              Require Reason for Backward Stage Movement
            </span>
            <Switch
              checked={formData.requireReasonForBackwardStageMovement}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requireReasonForBackwardStageMovement: e.target.checked,
                }))
              }
              aria-label="Require Reason for Backward Stage Movement"
            />
          </div>

          {/* Allow checklist reassignment */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">Allow Checklist Reassignment</span>
            <Switch
              checked={formData.allowChecklistReassignment}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  allowChecklistReassignment: e.target.checked,
                }))
              }
              aria-label="Allow Checklist Reassignment"
            />
          </div>

          {/* Allow overdue task completion */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">Allow Overdue Task Completion</span>
            <Switch
              checked={formData.allowOverdueTaskCompletion}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  allowOverdueTaskCompletion: e.target.checked,
                }))
              }
              aria-label="Allow Overdue Task Completion"
            />
          </div>

          {/* Require approval for configured actions */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">
              Require Approval for Configured Actions
            </span>
            <Switch
              checked={formData.requireApprovalForConfiguredActions}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requireApprovalForConfiguredActions: e.target.checked,
                }))
              }
              aria-label="Require Approval for Configured Actions"
            />
          </div>

          {/* Allow reopening completed onboarding cases */}
          <div className="bezent-genpref-switch-row">
            <span className="bezent-genpref-toggle-title">Allow Reopening Completed Cases</span>
            <Switch
              checked={formData.allowReopeningCompletedCases}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  allowReopeningCompletedCases: e.target.checked,
                }))
              }
              aria-label="Allow Reopening Completed Cases"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
