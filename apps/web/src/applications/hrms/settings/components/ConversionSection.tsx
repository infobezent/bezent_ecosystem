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
    <Card padding="lg">
      <Stack gap="lg">
        <div>
          <h2 className="bezent-card__title">Employee Conversion Rules</h2>
          <p className="bezent-card__desc">
            Configure prerequisites and defaults when transitioning an onboarding candidate into an
            active employee record.
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
              label="Auto-Convert on Joining Date (Automatically promote candidates on their effective joining date if prerequisites are met)"
              checked={autoConvertOnJoining}
              onChange={(e) => setAutoConvertOnJoining(e.target.checked)}
            />

            <Switch
              label="Mandate Document Verification (Require all mandatory documents to be verified before employee conversion is permitted)"
              checked={requireDocumentVerification}
              onChange={(e) => setRequireDocumentVerification(e.target.checked)}
            />

            <Switch
              label="Mandate Checklist Completion (Require all mandatory onboarding checklist items to be signed off before conversion)"
              checked={requireChecklistCompletion}
              onChange={(e) => setRequireChecklistCompletion(e.target.checked)}
            />

            <Input
              id="conv-prefix-input"
              label="Generated Employee ID Prefix"
              helperText="Prefix for newly generated Employee IDs (e.g., EMP-, BZ-)"
              value={employeeIdPrefix}
              maxLength={20}
              required
              onChange={(e) => setEmployeeIdPrefix(e.target.value)}
            />

            <Input
              id="conv-status-input"
              label="Initial Employment Status"
              helperText="Initial status assigned upon conversion (e.g., probation, confirmed, contract)"
              value={defaultEmploymentStatus}
              maxLength={50}
              required
              onChange={(e) => setDefaultEmploymentStatus(e.target.value)}
            />

            <Actions align="start">
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Conversion Rules'}
              </Button>
            </Actions>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

export default ConversionSection;
