import { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import {
  PROTECTED_SYSTEM_FIELD_KEYS,
  type OnboardingFieldConfig,
  type UpdateOnboardingFieldConfigDto,
} from '../types/settings';
import './FieldsSection.css';

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
    <div className="settings-card">
      <div className="settings-card__header">
        <h2 className="settings-card__title">Onboarding Form Fields</h2>
        <p className="settings-card__subtitle">
          Configure field visibility, requirement rules, and custom labels. Protected fields are
          mandated by core business logic.
        </p>
      </div>

      {success && (
        <div className="settings-alert settings-alert--success" role="alert">
          <BezentIcon name="check" size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="settings-alert settings-alert--error" role="alert">
          <BezentIcon name="warning" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="fields-table-container">
        <table className="fields-table">
          <thead>
            <tr>
              <th>Field Key</th>
              <th>Display Label</th>
              <th>Classification</th>
              <th>Required</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFields.map((f) => {
              const protectedField = isProtectedField(f.fieldKey);
              const isEditingThisLabel = editingLabelKey === f.fieldKey;
              const isWorking = updatingKey === f.fieldKey;

              return (
                <tr key={f.id}>
                  <td>
                    <span className="fields-key">{f.fieldKey}</span>
                  </td>
                  <td>
                    {isEditingThisLabel ? (
                      <input
                        type="text"
                        className="fields-edit-input"
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
                  </td>
                  <td>
                    <span
                      className={`fields-badge ${
                        protectedField ? 'fields-badge--system' : 'fields-badge--custom'
                      }`}
                    >
                      {protectedField ? 'System Protected' : 'Standard'}
                    </span>
                  </td>
                  <td>
                    <label className="settings-toggle-switch">
                      <input
                        type="checkbox"
                        checked={f.isRequired}
                        disabled={protectedField || isWorking}
                        onChange={() => handleToggleRequired(f)}
                        aria-label={`Mark ${f.label} as required`}
                      />
                      <span className="settings-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <label className="settings-toggle-switch">
                      <input
                        type="checkbox"
                        checked={f.isEnabled}
                        disabled={protectedField || isWorking}
                        onChange={() => handleToggleEnabled(f)}
                        aria-label={`Enable ${f.label}`}
                      />
                      <span className="settings-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    {isEditingThisLabel ? (
                      <div className="stage-item__actions">
                        <button
                          type="button"
                          className="stage-btn-secondary"
                          onClick={() => saveLabel(f.fieldKey)}
                          disabled={isWorking}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="stage-btn-secondary"
                          onClick={() => setEditingLabelKey(null)}
                          disabled={isWorking}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="stage-btn-secondary"
                        onClick={() => startEditLabel(f)}
                        disabled={isWorking}
                      >
                        <BezentIcon name="edit" size={13} />
                        Rename
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
