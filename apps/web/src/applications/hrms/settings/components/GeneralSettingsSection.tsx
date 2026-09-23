import { useState, useEffect, type FormEvent } from 'react';
import {
  Button,
  Card,
  Input,
  Switch,
  Alert,
  Stack,
  Actions,
} from '../../../../design-system/components';
import type {
  OnboardingGeneralSettings,
  UpdateOnboardingGeneralSettingsDto,
} from '../types/settings';

interface GeneralSettingsSectionProps {
  initialData: OnboardingGeneralSettings | null;
  onSave: (payload: UpdateOnboardingGeneralSettingsDto) => Promise<void>;
  saving: boolean;
}

export function GeneralSettingsSection({
  initialData,
  onSave,
  saving,
}: GeneralSettingsSectionProps) {
  const [onboardingEnabled, setOnboardingEnabled] = useState(
    initialData ? initialData.onboardingEnabled : true,
  );
  const [defaultDurationDays, setDefaultDurationDays] = useState(
    initialData ? initialData.defaultDurationDays : 30,
  );
  const [idPrefix, setIdPrefix] = useState(initialData?.idPrefix || 'NH-');
  const [defaultLocationId, setDefaultLocationId] = useState(initialData?.defaultLocationId || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (initialData) {
      setOnboardingEnabled(initialData.onboardingEnabled);
      setDefaultDurationDays(initialData.defaultDurationDays);
      setIdPrefix(initialData.idPrefix);
      setDefaultLocationId(initialData.defaultLocationId || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (defaultDurationDays < 1 || defaultDurationDays > 365) {
      setFeedback({
        type: 'error',
        message: 'Default duration must be between 1 and 365 days',
      });
      return;
    }

    if (!idPrefix.trim() || idPrefix.trim().length > 20) {
      setFeedback({
        type: 'error',
        message: 'ID prefix is required and must not exceed 20 characters',
      });
      return;
    }

    try {
      await onSave({
        onboardingEnabled,
        defaultDurationDays,
        idPrefix: idPrefix.trim(),
        defaultLocationId: defaultLocationId.trim() || null,
      });
      setFeedback({
        type: 'success',
        message: 'General settings saved successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save general settings',
      });
    }
  };

  return (
    <Card padding="lg">
      <Stack gap="lg">
        <div>
          <h2 className="bezent-card__title">General Onboarding Settings</h2>
          <p className="bezent-card__desc">
            Configure overarching pipeline defaults, case identifiers, and workflow activation.
          </p>
        </div>

        {feedback && (
          <Alert variant={feedback.type === 'success' ? 'success' : 'danger'}>
            {feedback.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Switch
              label="Enable Onboarding Module (Controls whether new hire onboarding flows are active for your company)"
              checked={onboardingEnabled}
              onChange={(e) => setOnboardingEnabled(e.target.checked)}
            />

            <Input
              id="gen-id-prefix"
              label="New Hire ID Prefix"
              helperText="Prefix assigned to new onboarding cases (e.g., NH-)"
              value={idPrefix}
              maxLength={20}
              required
              onChange={(e) => setIdPrefix(e.target.value)}
            />

            <Input
              id="gen-duration"
              label="Default Onboarding Duration (Days)"
              helperText="Expected total timeline for a candidate to complete all onboarding stages (1-365 days)"
              type="number"
              min={1}
              max={365}
              value={defaultDurationDays}
              required
              onChange={(e) => setDefaultDurationDays(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              id="gen-location"
              label="Default Location ID (Optional)"
              helperText="Fallback location assigned to new candidates when unassigned"
              placeholder="e.g., loc_chn_01"
              value={defaultLocationId}
              onChange={(e) => setDefaultLocationId(e.target.value)}
            />

            <Actions align="start">
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save General Settings'}
              </Button>
            </Actions>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

export default GeneralSettingsSection;
