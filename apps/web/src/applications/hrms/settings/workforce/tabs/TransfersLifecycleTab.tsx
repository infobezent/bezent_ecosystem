import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FormGrid,
  FormSection,
  Grid,
  Select,
  Switch,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { WorkforceLifecyclePolicy } from '../types/workforceSettings.types';
import { updateLifecyclePolicy } from '../api/workforceSettingsApi';

export interface TransfersLifecycleTabProps {
  initialPolicy: WorkforceLifecyclePolicy;
  onReload: () => void;
}

export function TransfersLifecycleTab({ initialPolicy, onReload }: TransfersLifecycleTabProps) {
  const [requireReleasingManagerApproval, setRequireReleasingManagerApproval] = useState(
    initialPolicy.requireReleasingManagerApproval,
  );
  const [effectiveDateAlignment, setEffectiveDateAlignment] = useState<
    'immediate' | 'next_payroll_month' | 'custom'
  >(initialPolicy.effectiveDateAlignment);
  const [autoReassignShifts, setAutoReassignShifts] = useState(initialPolicy.autoReassignShifts);
  const [autoReassignLeaveApprover, setAutoReassignLeaveApprover] = useState(
    initialPolicy.autoReassignLeaveApprover,
  );

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      await updateLifecyclePolicy({
        requireReleasingManagerApproval,
        effectiveDateAlignment,
        autoReassignShifts,
        autoReassignLeaveApprover,
      });
      setStatusMessage({
        type: 'success',
        text: 'Workforce lifecycle & transfer policy saved successfully.',
      });
      onReload();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save lifecycle policy',
      });
    } finally {
      setSaving(false);
    }
  };

  const effectiveDateLabel =
    effectiveDateAlignment === 'next_payroll_month'
      ? 'Next Payroll Month'
      : effectiveDateAlignment === 'immediate'
        ? 'Immediate on Approval'
        : 'Custom Date';

  return (
    <div className="bezent-lifecycle-card">
      {/* Modern Card Header */}
      <div className="bezent-lifecycle-card__header">
        <div className="bezent-lifecycle-card__header-left">
          <div className="bezent-lifecycle-card__icon-bubble">
            <BezentIcon name="switchAccount" size={20} />
          </div>
          <div className="bezent-lifecycle-card__title-group">
            <h3 className="bezent-lifecycle-card__title">Internal Transfers &amp; Lifecycle Governance</h3>
            <p className="bezent-lifecycle-card__desc">
              Govern internal mobility, department/location movements, dual-manager approvals, and
              automated operational reassignments.
            </p>
          </div>
        </div>
        <div className="bezent-lifecycle-card__header-right">
          <Badge variant="success" size="sm">● Active</Badge>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <BezentIcon name="check" size={14} />
            {saving ? 'Saving...' : 'Save Lifecycle Policy'}
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
            <span className="bezent-lifecycle-metric-label">Dual-Manager Approval</span>
            <span className={`bezent-lifecycle-metric-value ${requireReleasingManagerApproval ? 'bezent-lifecycle-metric-value--success' : ''}`}>
              {requireReleasingManagerApproval ? 'Required' : 'Single Approver'}
            </span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Effective Date Alignment</span>
            <span className="bezent-lifecycle-metric-value bezent-lifecycle-metric-value--active">
              {effectiveDateLabel}
            </span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Shift Roster Auto-Sync</span>
            <span className={`bezent-lifecycle-metric-value ${autoReassignShifts ? 'bezent-lifecycle-metric-value--success' : ''}`}>
              {autoReassignShifts ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="bezent-lifecycle-metric-item">
            <span className="bezent-lifecycle-metric-label">Leave Approver Auto-Sync</span>
            <span className={`bezent-lifecycle-metric-value ${autoReassignLeaveApprover ? 'bezent-lifecycle-metric-value--success' : ''}`}>
              {autoReassignLeaveApprover ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <FormSection title="Approval & Timing Policies">
          <FormGrid columns={2}>
            <Select
              label="Effective Date Alignment"
              value={effectiveDateAlignment}
              onChange={(e) =>
                setEffectiveDateAlignment(
                  e.target.value as 'immediate' | 'next_payroll_month' | 'custom',
                )
              }
              options={[
                { label: 'Next Payroll Cycle / Month Boundary', value: 'next_payroll_month' },
                { label: 'Immediate on Approval', value: 'immediate' },
                { label: 'Custom Chosen Effective Date', value: 'custom' },
              ]}
            />
          </FormGrid>
          <div className="bezent-lifecycle-switch-box">
            <Switch
              label="Require Dual-Manager Approval (Current manager must approve before receiving manager accepts)"
              checked={requireReleasingManagerApproval}
              onChange={(e) => setRequireReleasingManagerApproval(e.target.checked)}
            />
          </div>
        </FormSection>

        <FormSection title="Automated Cross-Module Reassignments">
          <div className="bezent-lifecycle-switch-box">
            <Grid columns={2} gap="md">
              <Switch
                label="Auto-Reassign Attendance Shifts (Align employee to receiving roster on effective date)"
                checked={autoReassignShifts}
                onChange={(e) => setAutoReassignShifts(e.target.checked)}
              />
              <Switch
                label="Auto-Reassign Leave Approver (Update primary leave approver to new reporting manager)"
                checked={autoReassignLeaveApprover}
                onChange={(e) => setAutoReassignLeaveApprover(e.target.checked)}
              />
            </Grid>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
