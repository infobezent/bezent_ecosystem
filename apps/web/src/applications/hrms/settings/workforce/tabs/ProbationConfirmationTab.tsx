import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FormGrid,
  FormSection,
  Grid,
  Input,
  Select,
  Stack,
  Switch,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { WorkforceProbationPolicy } from '../types/workforceSettings.types';
import { updateProbationPolicy } from '../api/workforceSettingsApi';

export interface ProbationConfirmationTabProps {
  initialPolicy: WorkforceProbationPolicy;
  onReload: () => void;
}

export function ProbationConfirmationTab({
  initialPolicy,
  onReload,
}: ProbationConfirmationTabProps) {
  const [defaultProbationDays, setDefaultProbationDays] = useState(
    initialPolicy.defaultProbationDays,
  );
  const [confirmationMode, setConfirmationMode] = useState<'manager_review' | 'auto_confirm'>(
    initialPolicy.confirmationMode,
  );
  const [reminderLeadDays, setReminderLeadDays] = useState(initialPolicy.reminderLeadDays);
  const [maxExtensionDays, setMaxExtensionDays] = useState(initialPolicy.maxExtensionDays);
  const [maxExtensionsAllowed, setMaxExtensionsAllowed] = useState(
    initialPolicy.maxExtensionsAllowed,
  );
  const [autoGenerateLetter, setAutoGenerateLetter] = useState(initialPolicy.autoGenerateLetter);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      await updateProbationPolicy({
        defaultProbationDays,
        confirmationMode,
        reminderLeadDays,
        maxExtensionDays,
        maxExtensionsAllowed,
        autoGenerateLetter,
      });
      setStatusMessage({
        type: 'success',
        text: 'Probation & confirmation policy updated successfully.',
      });
      onReload();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save probation policy',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bezent-lifecycle-card">
      {/* Modern Card Header */}
      <div className="bezent-lifecycle-card__header">
        <div className="bezent-lifecycle-card__header-left">
          <div className="bezent-lifecycle-card__icon-bubble">
            <BezentIcon name="clock" size={20} />
          </div>
          <div className="bezent-lifecycle-card__title-group">
            <h3 className="bezent-lifecycle-card__title">Probation &amp; Confirmation Policy</h3>
            <p className="bezent-lifecycle-card__desc">
              Configure evaluation periods, review reminders, extension caps, and formal
              confirmation rules.
            </p>
          </div>
        </div>
        <div className="bezent-lifecycle-card__header-right">
          <Badge variant="success" size="sm">
            ● Active
          </Badge>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <BezentIcon name="check" size={14} />
            {saving ? 'Saving...' : 'Save Probation Policy'}
          </Button>
        </div>
      </div>

      <div className="bezent-lifecycle-card__body">
        {statusMessage && (
          <Alert variant={statusMessage.type === 'success' ? 'success' : 'error'}>
            {statusMessage.text}
          </Alert>
        )}

        {/* Option B: Metrics Summary Strip */}
        <div className="bezent-lifecycle-metrics-strip">
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Default Duration</span>
            <span className="bezent-lifecycle-metric-value">{defaultProbationDays} Days</span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Evaluation Mode</span>
            <span className="bezent-lifecycle-metric-value bezent-lifecycle-metric-value--active">
              {confirmationMode === 'manager_review'
                ? 'Manager Review Required'
                : 'Auto-Confirm on Due Date'}
            </span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Reminder Lead</span>
            <span className="bezent-lifecycle-metric-value">{reminderLeadDays} Days Prior</span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Auto Confirmation Letter</span>
            <span
              className={`bezent-lifecycle-metric-value ${autoGenerateLetter ? 'bezent-lifecycle-metric-value--success' : ''}`}
            >
              {autoGenerateLetter ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <FormSection title="Standard Probation Rules">
          <FormGrid columns={3}>
            <Input
              label="Default Probation Duration (Days)"
              type="number"
              min={0}
              max={365}
              value={defaultProbationDays}
              onChange={(e) => setDefaultProbationDays(parseInt(e.target.value, 10) || 90)}
            />
            <Select
              label="Confirmation Mode"
              value={confirmationMode}
              onChange={(e) =>
                setConfirmationMode(e.target.value as 'manager_review' | 'auto_confirm')
              }
              options={[
                { label: 'Manager Review Required', value: 'manager_review' },
                { label: 'Auto-Confirm on Due Date', value: 'auto_confirm' },
              ]}
            />
            <Input
              label="Review Reminder Lead Time (Days)"
              type="number"
              min={1}
              max={90}
              value={reminderLeadDays}
              onChange={(e) => setReminderLeadDays(parseInt(e.target.value, 10) || 14)}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Extension & Letter Rules">
          <FormGrid columns={2}>
            <Input
              label="Maximum Extension Duration (Days)"
              type="number"
              min={0}
              max={365}
              value={maxExtensionDays}
              onChange={(e) => setMaxExtensionDays(parseInt(e.target.value, 10) || 90)}
            />
            <Input
              label="Maximum Extensions Allowed"
              type="number"
              min={0}
              max={10}
              value={maxExtensionsAllowed}
              onChange={(e) => setMaxExtensionsAllowed(parseInt(e.target.value, 10) || 1)}
            />
          </FormGrid>
          <div className="bezent-lifecycle-switch-box">
            <Switch
              label="Auto-generate Confirmation Letter (Automatically publish documentation to profile once approved)"
              checked={autoGenerateLetter}
              onChange={(e) => setAutoGenerateLetter(e.target.checked)}
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}
