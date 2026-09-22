import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type { OnboardingStageConfig, UpdateOnboardingStageConfigDto } from '../types/settings';
import './StagesSection.css';

interface StagesSectionProps {
  stages: OnboardingStageConfig[];
  onUpdateStage: (stageKey: string, payload: UpdateOnboardingStageConfigDto) => Promise<void>;
}

export function StagesSection({ stages, onUpdateStage }: StagesSectionProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsRequired, setEditIsRequired] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startEdit = (stage: OnboardingStageConfig) => {
    setEditingKey(stage.stageKey);
    setEditName(stage.name);
    setEditDescription(stage.description || '');
    setEditIsRequired(stage.isRequired);
    setEditIsActive(stage.isActive);
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setError(null);
  };

  const handleSave = async (stageKey: string) => {
    if (!editName.trim()) {
      setError('Stage name cannot be empty');
      return;
    }

    if (stageKey === 'completed' && !editIsActive) {
      setError('Terminal stage "completed" is a protected system stage and cannot be deactivated');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpdateStage(stageKey, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        isRequired: editIsRequired,
        isActive: editIsActive,
      });
      setSuccess(`Stage "${editName.trim()}" updated successfully.`);
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  // Sort by displayOrder
  const sortedStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <h2 className="settings-card__title">Onboarding Pipeline Stages</h2>
        <p className="settings-card__subtitle">
          Configure stage names, descriptions, and mandatory sequence progression for new hires.
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

      <div className="stages-list">
        {sortedStages.map((stage) => {
          const isEditing = editingKey === stage.stageKey;
          const isCompletedStage = stage.stageKey === 'completed';

          return (
            <div key={stage.id}>
              <div className={`stage-item ${!stage.isActive ? 'stage-item--inactive' : ''}`}>
                <div className="stage-item__left">
                  <div className="stage-item__badge">{stage.displayOrder}</div>
                  <div className="stage-item__content">
                    <div className="stage-item__title-row">
                      <span className="stage-item__title">{stage.name}</span>
                      <span className="stage-item__key">{stage.stageKey}</span>
                    </div>
                    <p className="stage-item__desc">
                      {stage.description || 'No description provided.'}
                    </p>
                    <div className="stage-item__pills">
                      <span
                        className={`stage-pill ${
                          stage.isRequired ? 'stage-pill--required' : 'stage-pill--optional'
                        }`}
                      >
                        {stage.isRequired ? 'Required' : 'Optional'}
                      </span>
                      {stage.isSystem && (
                        <span className="stage-pill stage-pill--protected">Protected System</span>
                      )}
                      {!stage.isActive && (
                        <span className="stage-pill stage-pill--optional">Deactivated</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="stage-item__actions">
                  <button
                    type="button"
                    className="stage-btn-secondary"
                    onClick={() => (isEditing ? cancelEdit() : startEdit(stage))}
                  >
                    <BezentIcon name={isEditing ? 'close' : 'edit'} size={14} />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="stage-edit-form">
                  <div className="stage-edit-form__row">
                    <div className="settings-form__row">
                      <label
                        htmlFor={`stage-name-${stage.stageKey}`}
                        className="settings-form__label"
                      >
                        Display Name
                      </label>
                      <input
                        id={`stage-name-${stage.stageKey}`}
                        type="text"
                        className="settings-form__input"
                        value={editName}
                        maxLength={100}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="settings-form__row">
                      <label
                        htmlFor={`stage-desc-${stage.stageKey}`}
                        className="settings-form__label"
                      >
                        Description
                      </label>
                      <input
                        id={`stage-desc-${stage.stageKey}`}
                        type="text"
                        className="settings-form__input"
                        value={editDescription}
                        maxLength={255}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="stage-edit-form__row">
                    <label className="settings-form__row--toggle stage-edit-form__toggle-item">
                      <div className="settings-form__toggle-info">
                        <span className="settings-form__label">Required Stage</span>
                        <span className="settings-form__hint">
                          Candidate must complete this stage before proceeding
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editIsRequired}
                        onChange={(e) => setEditIsRequired(e.target.checked)}
                      />
                    </label>

                    <label className="settings-form__row--toggle stage-edit-form__toggle-item">
                      <div className="settings-form__toggle-info">
                        <span className="settings-form__label">Active Stage</span>
                        <span className="settings-form__hint">
                          {isCompletedStage
                            ? 'Terminal stage "completed" cannot be deactivated'
                            : 'Controls visibility of this stage in candidate pipeline'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isCompletedStage}
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="settings-card__actions">
                    <Button
                      variant="primary"
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSave(stage.stageKey)}
                    >
                      {submitting ? 'Saving...' : 'Update Stage'}
                    </Button>
                    <button
                      type="button"
                      className="stage-btn-secondary"
                      onClick={cancelEdit}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
