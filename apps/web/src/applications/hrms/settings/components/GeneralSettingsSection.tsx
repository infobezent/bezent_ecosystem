import { useState, useEffect, type FormEvent } from 'react';
import {
  Actions,
  Alert,
  Button,
  Card,
  Divider,
  Inline,
  Input,
  Label,
  LoadingState,
  Stack,
  Switch,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchGeneralSettings,
  updateGeneralSettings,
} from '../api/onboardingSettingsApi';
import type {
  OnboardingGeneralSettings,
  UpdateOnboardingGeneralSettingsDto,
} from '../types/settings';

export interface GeneralSettingsFormValues {
  onboardingEnabled: boolean;
  defaultDurationDays: number | string;
  idPrefix: string;
}

export function validateGeneralSettingsValues(values: {
  defaultDurationDays: number | string;
  idPrefix: string;
}): { valid: boolean; durationError?: string; prefixError?: string } {
  let valid = true;
  let durationError: string | undefined;
  let prefixError: string | undefined;

  const durationNum = Number(values.defaultDurationDays);
  if (
    values.defaultDurationDays === '' ||
    isNaN(durationNum) ||
    !Number.isInteger(durationNum) ||
    durationNum < 1 ||
    durationNum > 365
  ) {
    durationError = 'Default duration must be an integer between 1 and 365 days';
    valid = false;
  }

  const trimmedPrefix = values.idPrefix.trim();
  if (!trimmedPrefix) {
    prefixError = 'New Hire ID Prefix is required';
    valid = false;
  } else if (trimmedPrefix.length > 20) {
    prefixError = 'New Hire ID Prefix must not exceed 20 characters';
    valid = false;
  }

  return { valid, durationError, prefixError };
}

export function isGeneralSettingsDirty(
  current: GeneralSettingsFormValues,
  baseline: GeneralSettingsFormValues,
): boolean {
  if (current.onboardingEnabled !== baseline.onboardingEnabled) return true;
  if (String(current.defaultDurationDays) !== String(baseline.defaultDurationDays)) return true;
  if (current.idPrefix !== baseline.idPrefix) return true;
  return false;
}

export interface GeneralSettingsSectionProps {
  initialData?: OnboardingGeneralSettings | null;
  onSave?: (payload: UpdateOnboardingGeneralSettingsDto) => Promise<void>;
  saving?: boolean;
}

export function GeneralSettingsSection({
  initialData,
  onSave,
  saving: propSaving,
}: GeneralSettingsSectionProps) {
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [internalSaving, setInternalSaving] = useState<boolean>(false);
  const isSaving = propSaving ?? internalSaving;

  const [onboardingEnabled, setOnboardingEnabled] = useState<boolean>(
    initialData ? initialData.onboardingEnabled : true,
  );
  const [defaultDurationDays, setDefaultDurationDays] = useState<string>(
    initialData ? String(initialData.defaultDurationDays) : '30',
  );
  const [idPrefix, setIdPrefix] = useState<string>(initialData?.idPrefix ?? 'NH-');

  const [baseline, setBaseline] = useState<GeneralSettingsFormValues>({
    onboardingEnabled: initialData ? initialData.onboardingEnabled : true,
    defaultDurationDays: initialData ? initialData.defaultDurationDays : 30,
    idPrefix: initialData?.idPrefix ?? 'NH-',
  });

  const [durationError, setDurationError] = useState<string | null>(null);
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (initialData) {
      setOnboardingEnabled(initialData.onboardingEnabled);
      setDefaultDurationDays(String(initialData.defaultDurationDays));
      setIdPrefix(initialData.idPrefix);
      setBaseline({
        onboardingEnabled: initialData.onboardingEnabled,
        defaultDurationDays: initialData.defaultDurationDays,
        idPrefix: initialData.idPrefix,
      });
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchGeneralSettings()
      .then((data) => {
        if (!isMounted) return;
        setOnboardingEnabled(data.onboardingEnabled);
        setDefaultDurationDays(String(data.defaultDurationDays));
        setIdPrefix(data.idPrefix);
        setBaseline({
          onboardingEnabled: data.onboardingEnabled,
          defaultDurationDays: data.defaultDurationDays,
          idPrefix: data.idPrefix,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load general settings',
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialData]);

  const isDirty = isGeneralSettingsDirty(
    { onboardingEnabled, defaultDurationDays, idPrefix },
    baseline,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const validation = validateGeneralSettingsValues({
      defaultDurationDays,
      idPrefix,
    });

    if (!validation.valid) {
      if (validation.durationError) setDurationError(validation.durationError);
      if (validation.prefixError) setPrefixError(validation.prefixError);
      return;
    }

    const payload: UpdateOnboardingGeneralSettingsDto = {
      onboardingEnabled,
      defaultDurationDays: Number(defaultDurationDays),
      idPrefix: idPrefix.trim(),
    };

    setInternalSaving(true);
    try {
      if (onSave) {
        await onSave(payload);
      } else {
        await updateGeneralSettings(payload);
      }
      setBaseline({
        onboardingEnabled,
        defaultDurationDays: Number(defaultDurationDays),
        idPrefix: idPrefix.trim(),
      });
      setIdPrefix(idPrefix.trim());
      setFeedback({
        type: 'success',
        message: 'General settings saved successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save general settings',
      });
    } finally {
      setInternalSaving(false);
    }
  };

  if (loading) {
    return (
      <Card variant="flat" padding="md">
        <LoadingState label="Loading onboarding settings..." />
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        {/* Onboarding Header Area */}
        <Inline gap="md" align="center">
          <div className="bezent-card__icon">
            <BezentIcon name="onboarding" size={24} />
          </div>
          <Stack gap="xs">
            <h2 className="bezent-card__title">General</h2>
            <p className="bezent-card__desc">
              Control the basic settings used across employee onboarding.
            </p>
          </Stack>
        </Inline>

        {feedback && (
          <Alert variant={feedback.type === 'success' ? 'success' : 'danger'}>
            {feedback.message}
          </Alert>
        )}

        {/* Single clean settings surface */}
        <Card variant="flat" padding="md">
          <Stack gap="md">
            {/* ONBOARDING AVAILABILITY */}
            <Stack gap="sm">
              <span className="bezent-page-header__eyebrow">ONBOARDING AVAILABILITY</span>
              <Inline justify="between" align="center" wrap gap="md">
                <Stack gap="xs">
                  <Label htmlFor="enable-employee-onboarding">Enable Employee Onboarding</Label>
                  <span className="bezent-card__desc">
                    Allow your company to create and manage employee onboarding cases.
                  </span>
                </Stack>
                <Switch
                  id="enable-employee-onboarding"
                  aria-label="Enable Employee Onboarding"
                  checked={onboardingEnabled}
                  onChange={(e) => setOnboardingEnabled(e.target.checked)}
                  disabled={isSaving}
                />
              </Inline>
            </Stack>

            <Divider spacing="sm" />

            {/* TIMELINE */}
            <Stack gap="sm">
              <span className="bezent-page-header__eyebrow">TIMELINE</span>
              <Inline justify="between" align="center" wrap gap="md">
                <Stack gap="xs">
                  <Label htmlFor="default-onboarding-duration">Default Onboarding Duration</Label>
                  <span className="bezent-card__desc">
                    Default duration used for a new onboarding process.
                  </span>
                  {durationError && (
                    <span className="bezent-input-feedback is-error" role="alert">
                      {durationError}
                    </span>
                  )}
                </Stack>
                <Inline gap="xs" align="center">
                  <Input
                    id="default-onboarding-duration"
                    className="bezent-input--narrow"
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    value={defaultDurationDays}
                    onChange={(e) => {
                      setDefaultDurationDays(e.target.value);
                      if (durationError) setDurationError(null);
                    }}
                    disabled={isSaving}
                    aria-label="Default Onboarding Duration"
                  />
                  <span className="bezent-label">Days</span>
                </Inline>
              </Inline>
            </Stack>

            <Divider spacing="sm" />

            {/* NEW HIRE IDENTIFICATION */}
            <Stack gap="sm">
              <span className="bezent-page-header__eyebrow">NEW HIRE IDENTIFICATION</span>
              <Inline justify="between" align="start" wrap gap="md">
                <Stack gap="xs">
                  <Label htmlFor="new-hire-id-prefix">New Hire ID Prefix</Label>
                  <span className="bezent-card__desc">
                    Prefix assigned to new onboarding cases.
                  </span>
                  {prefixError && (
                    <span className="bezent-input-feedback is-error" role="alert">
                      {prefixError}
                    </span>
                  )}
                </Stack>
                <Stack gap="xs" align="end">
                  <Input
                    id="new-hire-id-prefix"
                    className="bezent-input--narrow"
                    maxLength={20}
                    value={idPrefix}
                    onChange={(e) => {
                      setIdPrefix(e.target.value);
                      if (prefixError) setPrefixError(null);
                    }}
                    disabled={isSaving}
                    aria-label="New Hire ID Prefix"
                  />
                  <Inline gap="xs" align="center">
                    <span className="bezent-input-label">Example:</span>
                    <span className="bezent-card__desc">
                      {`${idPrefix.trim() || 'NH-'}0001`}
                    </span>
                  </Inline>
                </Stack>
              </Inline>
            </Stack>
          </Stack>
        </Card>

        {/* Save Changes Action */}
        <Actions align="end">
          <Button
            variant="primary"
            type="submit"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Actions>
      </Stack>
    </form>
  );
}

export default GeneralSettingsSection;
