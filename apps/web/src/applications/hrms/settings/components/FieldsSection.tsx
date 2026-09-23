import { useState } from 'react';
import {
  Button,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Switch,
  Input,
  Alert,
  Actions,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  PROTECTED_SYSTEM_FIELD_KEYS,
  type OnboardingFieldConfig,
  type UpdateOnboardingFieldConfigDto,
} from '../types/settings';

interface FieldsSectionProps {
  fields: OnboardingFieldConfig[];
  onUpdateField: (fieldKey: string, payload: UpdateOnboardingFieldConfigDto) => Promise<void>;
}

export function FieldsSection({ fields, onUpdateField }: FieldsSectionProps) {
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isProtectedField = (key: string) =>
    (PROTECTED_SYSTEM_FIELD_KEYS as readonly string[]).includes(key);

  const handleToggleRequired = async (field: OnboardingFieldConfig) => {
    if (isProtectedField(field.fieldKey)) {
      setError(`Protected field "${field.fieldKey}" is required by the system.`);
      return;
    }

    setUpdatingKey(field.fieldKey);
    setError(null);
    try {
      await onUpdateField(field.fieldKey, { isRequired: !field.isRequired });
      setSuccess(`Updated requirement for ${field.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleToggleEnabled = async (field: OnboardingFieldConfig) => {
    if (isProtectedField(field.fieldKey)) {
      setError(`Protected field "${field.fieldKey}" cannot be disabled.`);
      return;
    }

    setUpdatingKey(field.fieldKey);
    setError(null);
    try {
      await onUpdateField(field.fieldKey, { isEnabled: !field.isEnabled });
      setSuccess(`Updated status for ${field.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setUpdatingKey(null);
    }
  };

  const startEditLabel = (field: OnboardingFieldConfig) => {
    setEditingLabelKey(field.fieldKey);
    setTempLabel(field.label);
    setError(null);
  };

  const saveLabel = async (fieldKey: string) => {
    if (!tempLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }

    setUpdatingKey(fieldKey);
    setError(null);
    try {
      await onUpdateField(fieldKey, { label: tempLabel.trim() });
      setSuccess('Field label updated.');
      setEditingLabelKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update label');
    } finally {
      setUpdatingKey(null);
    }
  };

  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card padding="lg">
      <Stack gap="lg">
        <div>
          <h2 className="bezent-card__title">Onboarding Form Fields</h2>
          <p className="bezent-card__desc">
            Configure field visibility, requirement rules, and custom labels. Protected fields are
            mandated by core business logic.
          </p>
        </div>

        {success && <Alert variant="success">{success}</Alert>}

        {error && <Alert variant="danger">{error}</Alert>}

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Field Key</TableHeaderCell>
              <TableHeaderCell>Display Label</TableHeaderCell>
              <TableHeaderCell>Classification</TableHeaderCell>
              <TableHeaderCell>Required</TableHeaderCell>
              <TableHeaderCell>Enabled</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedFields.map((f) => {
              const protectedField = isProtectedField(f.fieldKey);
              const isEditingThisLabel = editingLabelKey === f.fieldKey;
              const isWorking = updatingKey === f.fieldKey;

              return (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant="neutral">{f.fieldKey}</Badge>
                  </TableCell>
                  <TableCell>
                    {isEditingThisLabel ? (
                      <Input
                        size="sm"
                        value={tempLabel}
                        maxLength={100}
                        onChange={(e) => setTempLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveLabel(f.fieldKey);
                          if (e.key === 'Escape') setEditingLabelKey(null);
                        }}
                      />
                    ) : (
                      <span>{f.label}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={protectedField ? 'info' : 'neutral'} size="sm">
                      {protectedField ? 'System Protected' : 'Standard'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={f.isRequired}
                      disabled={protectedField || isWorking}
                      onChange={() => handleToggleRequired(f)}
                      aria-label={`Mark ${f.label} as required`}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={f.isEnabled}
                      disabled={protectedField || isWorking}
                      onChange={() => handleToggleEnabled(f)}
                      aria-label={`Enable ${f.label}`}
                    />
                  </TableCell>
                  <TableCell>
                    {isEditingThisLabel ? (
                      <Actions align="start" gap="xs">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => saveLabel(f.fieldKey)}
                          disabled={isWorking}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingLabelKey(null)}
                          disabled={isWorking}
                        >
                          Cancel
                        </Button>
                      </Actions>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditLabel(f)}
                        disabled={isWorking}
                      >
                        <BezentIcon name="edit" size={13} />
                        Rename
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Stack>
    </Card>
  );
}

export default FieldsSection;
