import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  OnboardingGeneralSettings,
  UpdateOnboardingGeneralSettingsDto,
} from '../types/settings';
import './GeneralSettingsSection.css';

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
    <div className="settings-card">
      <div className="settings-card__header">
        <h2 className="settings-card__title">General Onboarding Settings</h2>
        <p className="settings-card__subtitle">
          Configure overarching pipeline defaults, case identifiers, and workflow activation.
        </p>
      </div>

      {feedback && (
        <div className={`settings-alert settings-alert--${feedback.type}`} role="alert">
          <BezentIcon name={feedback.type === 'success' ? 'check' : 'warning'} size={16} />
          <span>{feedback.message}</span>
        </div>
      )}

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-form__row settings-form__row--toggle">
          <div className="settings-form__toggle-info">
            <span className="settings-form__label">Enable Onboarding Module</span>
            <span className="settings-form__hint">
              Controls whether new hire onboarding flows are active for your company
            </span>
          </div>
          <label className="settings-toggle-switch">
            <input
              type="checkbox"
              checked={onboardingEnabled}
              onChange={(e) => setOnboardingEnabled(e.target.checked)}
              aria-label="Enable Onboarding Module"
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        <div className="settings-form__row">
          <label htmlFor="gen-id-prefix" className="settings-form__label">
            New Hire ID Prefix
          </label>
          <span className="settings-form__hint">
            Prefix assigned to new onboarding cases (e.g., NH-)
          </span>
          <input
            id="gen-id-prefix"
            type="text"
            className="settings-form__input"
            value={idPrefix}
            maxLength={20}
            required
            onChange={(e) => setIdPrefix(e.target.value)}
          />
        </div>

        <div className="settings-form__row">
          <label htmlFor="gen-duration" className="settings-form__label">
            Default Onboarding Duration (Days)
          </label>
          <span className="settings-form__hint">
            Expected total timeline for a candidate to complete all onboarding stages (1-365 days)
          </span>
          <input
            id="gen-duration"
            type="number"
            className="settings-form__input"
            min={1}
            max={365}
            value={defaultDurationDays}
            required
            onChange={(e) => setDefaultDurationDays(parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="settings-form__row">
          <label htmlFor="gen-location" className="settings-form__label">
            Default Location ID (Optional)
          </label>
          <span className="settings-form__hint">
            Fallback location assigned to new candidates when unassigned
          </span>
          <input
            id="gen-location"
            type="text"
            className="settings-form__input"
            placeholder="e.g., loc_chn_01"
            value={defaultLocationId}
            onChange={(e) => setDefaultLocationId(e.target.value)}
          />
        </div>

        <div className="settings-card__actions">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save General Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
