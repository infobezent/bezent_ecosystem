import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  FormGrid,
  FormSection,
  Grid,
  Select,
  Stack,
  Switch,
  Toolbar,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { WorkforceLifecyclePolicy } from '../types/workforceSettings.types';
import { updateLifecyclePolicy } from '../api/workforceSettingsApi';

export interface TransfersLifecycleTabProps {
  initialPolicy: WorkforceLifecyclePolicy;
  onReload: () => void;
}

export function TransfersLifecycleTab({
  initialPolicy,
  onReload,
}: TransfersLifecycleTabProps) {
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
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

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
      setStatusMessage({ type: 'success', text: 'Workforce lifecycle & transfer policy saved successfully.' });
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

  return (
    <Stack gap="lg">
      {statusMessage && (
        <Alert variant={statusMessage.type === 'success' ? 'success' : 'error'}>
          {statusMessage.text}
        </Alert>
      )}

      <Card variant="default" padding="lg">
        <Stack gap="md">
          <CardHeader>
            <div>
              <CardTitle>Internal Transfers & Lifecycle Governance</CardTitle>
              <CardDescription>
                Govern internal mobility, department/location movements, dual-manager approvals, and automated operational reassignments.
              </CardDescription>
            </div>
          </CardHeader>

          <FormSection title="Approval & Timing Policies">
            <FormGrid columns={2}>
              <Select
                label="Effective Date Alignment"
                value={effectiveDateAlignment}
                onChange={(e) =>
                  setEffectiveDateAlignment(e.target.value as 'immediate' | 'next_payroll_month' | 'custom')
                }
                options={[
                  { label: 'Next Payroll Cycle / Month Boundary', value: 'next_payroll_month' },
                  { label: 'Immediate on Approval', value: 'immediate' },
                  { label: 'Custom Chosen Effective Date', value: 'custom' },
                ]}
              />
            </FormGrid>
            <Grid columns={1} gap="sm">
              <Switch
                label="Require Dual-Manager Approval (Current manager must approve before receiving manager accepts)"
                checked={requireReleasingManagerApproval}
                onChange={(e) => setRequireReleasingManagerApproval(e.target.checked)}
              />
            </Grid>
          </FormSection>

          <FormSection title="Automated Cross-Module Reassignments">
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
          </FormSection>
        </Stack>
      </Card>

      <Toolbar
        right={
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <BezentIcon name="check" size={16} />
            {saving ? 'Saving...' : 'Save Lifecycle Policy'}
          </Button>
        }
      />
    </Stack>
  );
}
