import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  OnboardingConversionSettings,
  UpdateOnboardingConversionSettingsDto,
} from '../types/settings';

interface ConversionSectionProps {
  initialData: OnboardingConversionSettings | null;
  onSave: (payload: UpdateOnboardingConversionSettingsDto) => Promise<void>;
  saving: boolean;
}

export function ConversionSection({ initialData, onSave, saving }: ConversionSectionProps) {
  const [autoConvertOnJoining, setAutoConvertOnJoining] = useState(
    initialData ? initialData.autoConvertOnJoining : false,
  );
  const [requireDocumentVerification, setRequireDocumentVerification] = useState(
    initialData ? initialData.requireDocumentVerification : true,
  );
  const [requireChecklistCompletion, setRequireChecklistCompletion] = useState(
    initialData ? initialData.requireChecklistCompletion : true,
  );
  const [employeeIdPrefix, setEmployeeIdPrefix] = useState(initialData?.employeeIdPrefix || 'EMP-');
  const [defaultEmploymentStatus, setDefaultEmploymentStatus] = useState(
    initialData?.defaultEmploymentStatus || 'probation',
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (initialData) {
      setAutoConvertOnJoining(initialData.autoConvertOnJoining);
      setRequireDocumentVerification(initialData.requireDocumentVerification);
      setRequireChecklistCompletion(initialData.requireChecklistCompletion);
      setEmployeeIdPrefix(initialData.employeeIdPrefix);
      setDefaultEmploymentStatus(initialData.defaultEmploymentStatus);
    }
  }, [initialData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!employeeIdPrefix.trim() || employeeIdPrefix.trim().length > 20) {
      setFeedback({
        type: 'error',
        message: 'Employee ID prefix is required and must not exceed 20 characters',
      });
      return;
    }

    if (!defaultEmploymentStatus.trim() || defaultEmploymentStatus.trim().length > 50) {
      setFeedback({
        type: 'error',
        message: 'Default employment status is required and must not exceed 50 characters',
      });
      return;
    }

    try {
      await onSave({
        autoConvertOnJoining,
        requireDocumentVerification,
        requireChecklistCompletion,
        employeeIdPrefix: employeeIdPrefix.trim(),
        defaultEmploymentStatus: defaultEmploymentStatus.trim(),
      });
      setFeedback({
        type: 'success',
        message: 'Employee conversion rules saved successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save conversion settings',
      });
    }
  };

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <h2 className="settings-card__title">Employee Conversion Rules</h2>
        <p className="settings-card__subtitle">
          Configure prerequisites and defaults when transitioning an onboarding candidate into an
          active employee record.
        </p>
      </div>

      {feedback && (
        <div className={`settings-alert settings-alert--${feedback.type}`} role="alert">
          <BezentIcon name={feedback.type === 'success' ? 'check' : 'warning'} size={16} />
          <span>{feedback.message}</span>
        </div>
      )}

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="settings-form__row--toggle">
          <div className="settings-form__toggle-info">
            <span className="settings-form__label">Auto-Convert on Joining Date</span>
            <span className="settings-form__hint">
              Automatically promote candidates on their effective joining date if prerequisites are
              met
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoConvertOnJoining}
            onChange={(e) => setAutoConvertOnJoining(e.target.checked)}
          />
        </label>

        <label className="settings-form__row--toggle">
          <div className="settings-form__toggle-info">
            <span className="settings-form__label">Mandate Document Verification</span>
            <span className="settings-form__hint">
              Require all mandatory documents to be verified before employee conversion is permitted
            </span>
          </div>
          <input
            type="checkbox"
            checked={requireDocumentVerification}
            onChange={(e) => setRequireDocumentVerification(e.target.checked)}
          />
        </label>

        <label className="settings-form__row--toggle">
          <div className="settings-form__toggle-info">
            <span className="settings-form__label">Mandate Checklist Completion</span>
            <span className="settings-form__hint">
              Require all mandatory onboarding checklist items to be signed off before conversion
            </span>
          </div>
          <input
            type="checkbox"
            checked={requireChecklistCompletion}
            onChange={(e) => setRequireChecklistCompletion(e.target.checked)}
          />
        </label>

        <div className="settings-form__row">
          <label htmlFor="conv-prefix-input" className="settings-form__label">
            Generated Employee ID Prefix
          </label>
          <span className="settings-form__hint">
            Prefix for newly generated Employee IDs (e.g., EMP-, BZ-)
          </span>
          <input
            id="conv-prefix-input"
            type="text"
            className="settings-form__input"
            value={employeeIdPrefix}
            maxLength={20}
            required
            onChange={(e) => setEmployeeIdPrefix(e.target.value)}
          />
        </div>

        <div className="settings-form__row">
          <label htmlFor="conv-status-input" className="settings-form__label">
            Initial Employment Status
          </label>
          <span className="settings-form__hint">
            Initial status assigned upon conversion (e.g., probation, confirmed, contract)
          </span>
          <input
            id="conv-status-input"
            type="text"
            className="settings-form__input"
            value={defaultEmploymentStatus}
            maxLength={50}
            required
            onChange={(e) => setDefaultEmploymentStatus(e.target.value)}
          />
        </div>

        <div className="settings-card__actions">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Conversion Rules'}
          </Button>
        </div>
      </form>
    </div>
  );
}
