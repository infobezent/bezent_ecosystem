import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Actions,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Inline,
  Input,
  LoadingState,
  Modal,
  Select,
  type SelectOption,
  Stack,
  Switch,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useOptionalAuth } from '../../../../platform/auth';
import {
  fetchStageConfigs,
  createStageConfig,
  updateStageConfig,
  reorderStageConfigs,
  deleteStageConfig,
} from '../api/onboardingSettingsApi';
import type {
  OnboardingStageConfig,
  CreateOnboardingStageConfigDto,
  UpdateOnboardingStageConfigDto,
} from '../types/settings';

export interface StagesSectionProps {
  initialStages?: OnboardingStageConfig[];
  onUpdateStage?: (stageKey: string, payload: UpdateOnboardingStageConfigDto) => Promise<void>;
  onCreateStage?: (payload: CreateOnboardingStageConfigDto) => Promise<OnboardingStageConfig>;
  onReorderStages?: (stageKeys: string[]) => Promise<OnboardingStageConfig[]>;
  onDeleteStage?: (stageKey: string) => Promise<void>;
}

export function StagesSection({
  initialStages,
  onUpdateStage,
  onCreateStage,
  onReorderStages,
  onDeleteStage,
}: StagesSectionProps = {}) {
  const auth = useOptionalAuth();
  const canManage = auth?.can('hrms.settings.manage') ?? true;

  const [stages, setStages] = useState<OnboardingStageConfig[]>(initialStages ?? []);
  const [loading, setLoading] = useState<boolean>(!initialStages);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Edit Modal State
  const [editingStage, setEditingStage] = useState<OnboardingStageConfig | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsRequired, setEditIsRequired] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addIsRequired, setAddIsRequired] = useState(true);
  const [addPosition, setAddPosition] = useState<string>('');
  const [addNameError, setAddNameError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Delete Confirmation State
  const [deletingStage, setDeletingStage] = useState<OnboardingStageConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reorder State
  const [reordering, setReordering] = useState(false);

  // Global Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(
    null,
  );

  const loadStages = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setFetchError(null);
    fetchStageConfigs()
      .then((data) => {
        if (isMounted) {
          setStages(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load onboarding stages');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialStages) {
      setStages(initialStages);
      setLoading(false);
      return;
    }

    return loadStages();
  }, [initialStages, loadStages]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.displayOrder - b.displayOrder),
    [stages],
  );

  // ==================== Edit Handlers ====================

  const startEdit = (stage: OnboardingStageConfig) => {
    setEditingStage(stage);
    setEditName(stage.name);
    setEditDescription(stage.description || '');
    setEditIsRequired(stage.isRequired);
    setEditIsActive(stage.isActive);
    setNameError(null);
    setSaveError(null);
  };

  const closeEditModal = () => {
    setEditingStage(null);
    setNameError(null);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingStage) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setNameError('Stage name is required and cannot be empty.');
      return;
    }
    if (trimmedName.length > 100) {
      setNameError('Stage name must not exceed 100 characters.');
      return;
    }

    if ((editingStage.stageKey === 'completed' || editingStage.isTerminal) && !editIsActive) {
      setSaveError(
        'Terminal stage "completed" is a protected system stage and cannot be deactivated',
      );
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload: UpdateOnboardingStageConfigDto = {
      name: trimmedName,
      description: editDescription.trim() || null,
      isRequired: editIsRequired,
      isActive: editIsActive,
    };

    try {
      if (onUpdateStage) {
        await onUpdateStage(editingStage.stageKey, payload);
      } else {
        await updateStageConfig(editingStage.stageKey, payload);
      }

      setStages((prev) =>
        prev.map((s) =>
          s.stageKey === editingStage.stageKey
            ? { ...s, ...payload, description: payload.description ?? null }
            : s,
        ),
      );

      setFeedback({
        type: 'success',
        message: `Stage "${trimmedName}" updated successfully.`,
      });
      closeEditModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update stage configuration');
    } finally {
      setSaving(false);
    }
  };

  // ==================== Add Handlers ====================

  const openAddModal = () => {
    setAddName('');
    setAddDescription('');
    setAddIsRequired(true);
    setAddPosition('');
    setAddNameError(null);
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddNameError(null);
    setAddError(null);
  };

  const handleCreateStage = async () => {
    const trimmedName = addName.trim();
    if (!trimmedName) {
      setAddNameError('Stage name is required and cannot be empty.');
      return;
    }
    if (trimmedName.length > 100) {
      setAddNameError('Stage name must not exceed 100 characters.');
      return;
    }

    setAdding(true);
    setAddError(null);

    const payload: CreateOnboardingStageConfigDto = {
      name: trimmedName,
      description: addDescription.trim() || null,
      isRequired: addIsRequired,
      afterStageKey: addPosition && addPosition !== '__first__' ? addPosition : undefined,
      position: addPosition === '__first__' ? 1 : undefined,
    };

    try {
      if (onCreateStage) {
        const created = await onCreateStage(payload);
        setStages((prev) => [...prev, created]);
      } else {
        await createStageConfig(payload);
        const reloaded = await fetchStageConfigs();
        setStages(reloaded);
      }

      setFeedback({
        type: 'success',
        message: `Custom stage "${trimmedName}" created successfully.`,
      });
      closeAddModal();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create stage');
    } finally {
      setAdding(false);
    }
  };

  // ==================== Reorder Handlers ====================

  const handleMoveUp = async (index: number) => {
    if (index <= 0 || reordering) return;
    const stage = sortedStages[index]!;
    if (stage.isTerminal || stage.stageKey === 'completed') return;

    setReordering(true);
    const newStages = [...sortedStages];
    const temp = newStages[index - 1]!;
    newStages[index - 1] = stage;
    newStages[index] = temp;

    const newKeys = newStages.map((s) => s.stageKey);
    try {
      if (onReorderStages) {
        const updated = await onReorderStages(newKeys);
        setStages(updated);
      } else {
        const updated = await reorderStageConfigs(newKeys);
        setStages(updated);
      }
      setFeedback({
        type: 'success',
        message: `Workflow order updated: moved "${stage.name}" up.`,
      });
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Failed to reorder stages',
      });
    } finally {
      setReordering(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= sortedStages.length - 2 || reordering) return; // cannot move past the terminal stage
    const stage = sortedStages[index]!;
    if (stage.isTerminal || stage.stageKey === 'completed') return;

    setReordering(true);
    const newStages = [...sortedStages];
    const temp = newStages[index + 1]!;
    newStages[index + 1] = stage;
    newStages[index] = temp;

    const newKeys = newStages.map((s) => s.stageKey);
    try {
      if (onReorderStages) {
        const updated = await onReorderStages(newKeys);
        setStages(updated);
      } else {
        const updated = await reorderStageConfigs(newKeys);
        setStages(updated);
      }
      setFeedback({
        type: 'success',
        message: `Workflow order updated: moved "${stage.name}" down.`,
      });
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Failed to reorder stages',
      });
    } finally {
      setReordering(false);
    }
  };

  // ==================== Delete Handlers ====================

  const startDelete = (stage: OnboardingStageConfig) => {
    setDeletingStage(stage);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeletingStage(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStage) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      if (onDeleteStage) {
        await onDeleteStage(deletingStage.stageKey);
      } else {
        await deleteStageConfig(deletingStage.stageKey);
      }

      setStages((prev) => prev.filter((s) => s.stageKey !== deletingStage.stageKey));
      setFeedback({
        type: 'success',
        message: `Stage "${deletingStage.name}" deleted successfully.`,
      });
      closeDeleteModal();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete stage');
    } finally {
      setDeleting(false);
    }
  };

  // Position select options for Add Stage
  const positionOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: '', label: 'Default (Before Completed)' },
      { value: '__first__', label: 'At the beginning' },
    ];
    for (const s of sortedStages) {
      if (!s.isTerminal && s.stageKey !== 'completed') {
        opts.push({
          value: s.stageKey,
          label: `After ${s.name}`,
        });
      }
    }
    return opts;
  }, [sortedStages]);

  return (
    <Stack gap="lg">
      {/* Header per Section 17 & 18 */}
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Stages</h2>
            <p className="bezent-card__desc">
              Configure the stages employees move through during onboarding.
            </p>
          </div>
        }
        right={
          canManage ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<BezentIcon name="plusSign" size={14} />}
              onClick={openAddModal}
            >
              Add Stage
            </Button>
          ) : null
        }
      />

      {feedback && (
        <Alert
          variant={feedback.type}
          dismissible
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Loading onboarding stages..." />
      ) : fetchError ? (
        <Card variant="flat" padding="lg">
          <Stack gap="md" align="center">
            <Alert variant="danger">{fetchError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadStages} type="button">
              Retry
            </Button>
          </Stack>
        </Card>
      ) : sortedStages.length === 0 ? (
        <Card variant="flat" padding="lg">
          <EmptyState
            title="No stages configured"
            description="No onboarding stages found for this company."
          />
        </Card>
      ) : (
        /* Single Parent Surface per Section 17 */
        <Card variant="flat" padding="md">
          <Stack gap="md">
            <div className="bezent-card__desc">
              <strong>ONBOARDING WORKFLOW</strong>
            </div>

            <Stack gap="none">
              {sortedStages.map((stage, index) => {
                const formattedOrder = String(stage.displayOrder || index + 1).padStart(2, '0');
                const isTerminal = stage.isTerminal || stage.stageKey === 'completed';
                const canMoveUp = canManage && index > 0 && !isTerminal && !reordering;
                const canMoveDown =
                  canManage &&
                  index < sortedStages.length - 2 &&
                  !isTerminal &&
                  !reordering;
                const canDelete = canManage && !stage.isSystem && !isTerminal;

                return (
                  <div key={stage.id || stage.stageKey}>
                    {index > 0 && <Divider spacing="sm" />}
                    <Toolbar
                      left={
                        <Inline gap="md" align="center">
                          <Badge variant="neutral" size="md">
                            <strong>{formattedOrder}</strong>
                          </Badge>
                          <div>
                            <Inline gap="sm" align="center">
                              <strong>{stage.name}</strong>
                              <Badge variant="neutral" size="sm">
                                {stage.stageKey}
                              </Badge>
                              <Badge variant={stage.isRequired ? 'warning' : 'neutral'} size="sm">
                                {stage.isRequired ? 'Required' : 'Optional'}
                              </Badge>
                              <Badge variant={stage.isSystem ? 'info' : 'neutral'} size="sm">
                                {stage.isSystem ? 'System' : 'Custom'}
                              </Badge>
                              {!stage.isActive && (
                                <Badge variant="danger" size="sm">
                                  Deactivated
                                </Badge>
                              )}
                            </Inline>
                            {stage.description && (
                              <p className="bezent-card__desc">{stage.description}</p>
                            )}
                          </div>
                        </Inline>
                      }
                      right={
                        canManage ? (
                          <Inline gap="xs" align="center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canMoveUp}
                              onClick={() => handleMoveUp(index)}
                              aria-label={`Move ${stage.name} up`}
                              title="Move stage up"
                            >
                              <BezentIcon name="chevronUp" size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canMoveDown}
                              onClick={() => handleMoveDown(index)}
                              aria-label={`Move ${stage.name} down`}
                              title="Move stage down"
                            >
                              <BezentIcon name="chevronDown" size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => startEdit(stage)}
                              aria-label={`Edit stage ${stage.name}`}
                            >
                              <BezentIcon name="edit" size={14} />
                              Edit
                            </Button>
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startDelete(stage)}
                                aria-label={`Delete stage ${stage.name}`}
                                title="Delete custom stage"
                              >
                                <BezentIcon name="delete" size={14} />
                              </Button>
                            )}
                          </Inline>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Read-only
                          </Badge>
                        )
                      }
                    />
                  </div>
                );
              })}
            </Stack>

            <Divider spacing="sm" />
            <div className="bezent-card__desc">{sortedStages.length} stages configured</div>
          </Stack>
        </Card>
      )}

      {/* Accessible Add Stage Modal per Section 18 */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          title="Add Custom Stage"
          description="Create a new workflow stage for employee onboarding in this company."
          size="md"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" onClick={closeAddModal} disabled={adding} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateStage}
                disabled={adding}
                type="button"
              >
                {adding ? 'Creating...' : 'Create Stage'}
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            {addError && <Alert variant="danger">{addError}</Alert>}

            <Input
              id="stage-add-name"
              label="Stage Name"
              value={addName}
              maxLength={100}
              required
              error={addNameError || undefined}
              onChange={(e) => {
                setAddName(e.target.value);
                if (addNameError) setAddNameError(null);
              }}
              placeholder="e.g. Background Verification"
            />

            <Input
              id="stage-add-desc"
              label="Description"
              value={addDescription}
              maxLength={255}
              onChange={(e) => setAddDescription(e.target.value)}
              placeholder="e.g. Verification of background and criminal history"
              helperText="Brief summary of the stage's purpose (max 255 characters)."
            />

            <Select
              id="stage-add-position"
              label="Position"
              value={addPosition}
              onChange={(e) => setAddPosition(e.target.value)}
              options={positionOptions}
              helperText="Choose where this stage fits within the onboarding progression."
            />

            <Switch
              id="stage-add-required"
              label="Required Stage (Candidate cannot skip this stage)"
              checked={addIsRequired}
              onChange={(e) => setAddIsRequired(e.target.checked)}
            />
          </Stack>
        </Modal>
      )}

      {/* Accessible Edit Stage Modal per Section 19 */}
      {editingStage && (
        <Modal
          isOpen={Boolean(editingStage)}
          onClose={closeEditModal}
          title={`Edit Stage: ${editingStage.name}`}
          description={`Configure display properties and rules for the "${editingStage.stageKey}" stage.`}
          size="md"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" onClick={closeEditModal} disabled={saving} type="button">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={saving} type="button">
                {saving ? 'Saving...' : 'Save Stage'}
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            {saveError && <Alert variant="danger">{saveError}</Alert>}

            <Input
              id="stage-edit-name"
              label="Stage Name"
              value={editName}
              maxLength={100}
              required
              error={nameError || undefined}
              onChange={(e) => {
                setEditName(e.target.value);
                if (nameError) setNameError(null);
              }}
            />

            <Input
              id="stage-edit-desc"
              label="Description"
              value={editDescription}
              maxLength={255}
              onChange={(e) => setEditDescription(e.target.value)}
              helperText="Brief summary of the stage's purpose (max 255 characters)."
            />

            <Switch
              id="stage-edit-required"
              label="Required Stage (Candidate must complete before progressing)"
              checked={editIsRequired}
              onChange={(e) => setEditIsRequired(e.target.checked)}
            />

            <Switch
              id="stage-edit-active"
              label={
                editingStage.stageKey === 'completed' || editingStage.isTerminal
                  ? 'Active Stage (Terminal stage is protected and cannot be deactivated)'
                  : 'Active Stage (Included in the candidate onboarding workflow)'
              }
              disabled={editingStage.stageKey === 'completed' || editingStage.isTerminal}
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </Stack>
        </Modal>
      )}

      {/* Accessible Delete Confirmation Modal per Section 13 */}
      {deletingStage && (
        <Modal
          isOpen={Boolean(deletingStage)}
          onClose={closeDeleteModal}
          title={`Delete Stage: ${deletingStage.name}`}
          description="Are you sure you want to delete this custom stage? Stages referenced by existing cases or historical transitions cannot be deleted."
          size="sm"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? 'Deleting...' : 'Delete Stage'}
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            {deleteError && <Alert variant="danger">{deleteError}</Alert>}
            <p className="bezent-card__desc">
              Only unreferenced custom stages can be permanently removed. If this stage has any active
              cases or past history, deactivate it instead to preserve audit logs.
            </p>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default StagesSection;

