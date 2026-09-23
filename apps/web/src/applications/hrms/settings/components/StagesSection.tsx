import { useState } from 'react';
import {
  Button,
  Card,
  Badge,
  Input,
  Switch,
  Alert,
  Inline,
  Stack,
  Actions,
  FormGrid,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { OnboardingStageConfig, UpdateOnboardingStageConfigDto } from '../types/settings';

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
    <Card padding="lg">
      <Stack gap="lg">
        <div>
          <h2 className="bezent-card__title">Onboarding Pipeline Stages</h2>
          <p className="bezent-card__desc">
            Configure stage names, descriptions, and mandatory sequence progression for new hires.
          </p>
        </div>

        {success && <Alert variant="success">{success}</Alert>}

        {error && <Alert variant="danger">{error}</Alert>}

        <Stack gap="md">
          {sortedStages.map((stage) => {
            const isEditing = editingKey === stage.stageKey;
            const isCompletedStage = stage.stageKey === 'completed';

            return (
              <Card key={stage.id} variant="flat" padding="md">
                <Stack gap="md">
                  <div className="bezent-toolbar">
                    <Inline gap="md" align="center">
                      <Badge variant="info">{stage.displayOrder}</Badge>
                      <div>
                        <Inline gap="sm" align="center">
                          <strong>{stage.name}</strong>
                          <Badge variant="neutral" size="sm">
                            {stage.stageKey}
                          </Badge>
                        </Inline>
                        <p className="bezent-card__desc">
                          {stage.description || 'No description provided.'}
                        </p>
                        <Inline gap="xs" wrap className="bezent-actions--gap-xs">
                          <Badge variant={stage.isRequired ? 'warning' : 'neutral'} size="sm">
                            {stage.isRequired ? 'Required' : 'Optional'}
                          </Badge>
                          {stage.isSystem && (
                            <Badge variant="info" size="sm">
                              Protected System
                            </Badge>
                          )}
                          {!stage.isActive && (
                            <Badge variant="danger" size="sm">
                              Deactivated
                            </Badge>
                          )}
                        </Inline>
                      </div>
                    </Inline>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(stage))}
                    >
                      <BezentIcon name={isEditing ? 'close' : 'edit'} size={14} />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>

                  {isEditing && (
                    <Card padding="md">
                      <Stack gap="md">
                        <FormGrid columns={2}>
                          <Input
                            id={`stage-name-${stage.stageKey}`}
                            label="Display Name"
                            value={editName}
                            maxLength={100}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                          <Input
                            id={`stage-desc-${stage.stageKey}`}
                            label="Description"
                            value={editDescription}
                            maxLength={255}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </FormGrid>

                        <FormGrid columns={2}>
                          <Switch
                            label="Required Stage (Candidate must complete before proceeding)"
                            checked={editIsRequired}
                            onChange={(e) => setEditIsRequired(e.target.checked)}
                          />
                          <Switch
                            label={
                              isCompletedStage
                                ? 'Active Stage (Terminal stage "completed" cannot be deactivated)'
                                : 'Active Stage (Controls visibility in candidate pipeline)'
                            }
                            disabled={isCompletedStage}
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                          />
                        </FormGrid>

                        <Actions align="start" gap="sm">
                          <Button
                            variant="primary"
                            type="button"
                            disabled={submitting}
                            onClick={() => handleSave(stage.stageKey)}
                          >
                            {submitting ? 'Saving...' : 'Update Stage'}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={cancelEdit}
                            disabled={submitting}
                          >
                            Cancel
                          </Button>
                        </Actions>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}

export default StagesSection;
