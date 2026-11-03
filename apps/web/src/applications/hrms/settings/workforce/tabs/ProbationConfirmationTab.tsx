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
  Input,
  Select,
  Stack,
  Switch,
  Toolbar,
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
              <CardTitle>Probation & Confirmation Policy</CardTitle>
              <CardDescription>
                Configure evaluation periods, review reminders, extension caps, and formal
                confirmation rules.
              </CardDescription>
            </div>
          </CardHeader>

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
            <Grid columns={1} gap="sm">
              <Switch
                label="Auto-generate Confirmation Letter (Automatically publish documentation to profile once approved)"
                checked={autoGenerateLetter}
                onChange={(e) => setAutoGenerateLetter(e.target.checked)}
              />
            </Grid>
          </FormSection>
        </Stack>
      </Card>

      <Toolbar
        right={
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <BezentIcon name="check" size={16} />
            {saving ? 'Saving...' : 'Save Probation Policy'}
          </Button>
        }
      />
    </Stack>
  );
}
