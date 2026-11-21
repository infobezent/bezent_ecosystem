import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import { AddEditStageModal } from './AddEditStageModal';
import type { OnboardingPipeline, PipelineStageConfig } from '../../../types/pipeline.types';

interface ConfigureStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: OnboardingPipeline | null;
  onSaveStages: (pipelineId: string, stages: PipelineStageConfig[]) => Promise<void>;
}

export function ConfigureStagesModal({
  isOpen,
  onClose,
  pipeline,
  onSaveStages,
}: ConfigureStagesModalProps) {
  const [stages, setStages] = useState<PipelineStageConfig[]>(() =>
    pipeline?.stages ? [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder) : [],
  );
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (pipeline?.stages) {
      // Clone stages to permit local staging
      setStages([...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder));
    } else {
      setStages([]);
    }
    setError(null);
    setSuccess(null);
  }, [pipeline, isOpen]);

  // Stage Reordering: Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newStages = [...stages];
    const prev = newStages[index - 1]!;
    const curr = newStages[index]!;

    // Cannot move a terminal/final stage ahead of intermediate stages
    if (curr.stageType === 'final' || curr.isTerminal) {
      setError('The Final stage must remain at the end of the pipeline.');
      return;
    }

    newStages[index - 1] = curr;
    newStages[index] = prev;

    // Renumber displayOrder
    const normalized = newStages.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setStages(normalized);
    setError(null);
  };

  // Stage Reordering: Move Down
  const handleMoveDown = (index: number) => {
    if (index >= stages.length - 1) return;
    const newStages = [...stages];
    const curr = newStages[index]!;
    const next = newStages[index + 1]!;

    // Cannot move past the final stage unless curr is not final
    if (next.stageType === 'final' || next.isTerminal) {
      setError('Cannot place intermediate stages after the Final stage.');
      return;
    }

    newStages[index] = next;
    newStages[index + 1] = curr;

    // Renumber displayOrder
    const normalized = newStages.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setStages(normalized);
    setError(null);
  };

  // Toggle stage active status
  const handleToggleActive = (stageId: string, active: boolean) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    if ((stage.stageType === 'final' || stage.isTerminal) && !active) {
      setError('The Final stage cannot be deactivated.');
      return;
    }

    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, isActive: active } : s)));
    setError(null);
  };

  // Open add stage modal
  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageModalOpen(true);
  };

  // Open edit stage modal
  const handleOpenEditStage = (stage: PipelineStageConfig) => {
    setEditingStage(stage);
    setStageModalOpen(true);
  };

  // Save stage callback from AddEditStageModal
  const handleSaveStageFromModal = (savedStage: PipelineStageConfig) => {
    if (editingStage) {
      // Editing existing stage
      let updatedStages = stages.map((s) => (s.id === savedStage.id ? savedStage : s));

      // If this stage was changed to final, ensure other stages lose final/terminal
      if (savedStage.stageType === 'final') {
        updatedStages = updatedStages.map((s) =>
          s.id === savedStage.id
            ? s
            : s.stageType === 'final'
              ? { ...s, stageType: 'standard', isTerminal: false, allowManualExit: true }
              : s,
        );
        // Move the new final stage to the end if not already at the end
        const nonFinal = updatedStages.filter((s) => s.id !== savedStage.id);
        updatedStages = [...nonFinal, { ...savedStage, displayOrder: nonFinal.length + 1 }];
      }

      const reindexed = updatedStages.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
      setStages(reindexed);
    } else {
      // Adding new stage
      let updatedStages: PipelineStageConfig[];
      if (savedStage.stageType === 'final') {
        // Demote existing final stage
        const existingDemoted = stages.map((s) =>
          s.stageType === 'final'
            ? { ...s, stageType: 'standard' as const, isTerminal: false, allowManualExit: true }
            : s,
        );
        updatedStages = [
          ...existingDemoted,
          { ...savedStage, displayOrder: existingDemoted.length + 1 },
        ];
      } else {
        // Insert right before the final stage
        const finalStageIdx = stages.findIndex((s) => s.stageType === 'final' || s.isTerminal);
        if (finalStageIdx !== -1) {
          updatedStages = [
            ...stages.slice(0, finalStageIdx),
            savedStage,
            ...stages.slice(finalStageIdx),
          ];
        } else {
          updatedStages = [...stages, savedStage];
        }
      }

      const reindexed = updatedStages.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
      setStages(reindexed);
    }
    setError(null);
  };

  // Delete stage
  const handleDeleteStage = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    if (stage.stageType === 'final' || stage.isTerminal || stage.stageKey === 'completed') {
      setError(
        'Cannot delete the Final stage. A pipeline must have exactly one terminal milestone.',
      );
      return;
    }

    if (stages.length <= 2) {
      setError('A pipeline must retain at least an entry stage and a final stage.');
      return;
    }

    const filtered = stages
      .filter((s) => s.id !== stageId)
      .map((s, idx) => ({ ...s, displayOrder: idx + 1 }));
    setStages(filtered);
    setError(null);
  };

  // Final validation and save
  const handleSaveAll = async () => {
    if (!pipeline) return;

    // 1. Minimum stages
    if (stages.length < 2) {
      setError('A pipeline requires at least an entry milestone and a final milestone.');
      return;
    }

    // 2. Exactly one final stage
    const finalStages = stages.filter((s) => s.stageType === 'final' || s.isTerminal);
    if (finalStages.length === 0) {
      setError('A final stage is mandatory to complete employee conversion.');
      return;
    }
    if (finalStages.length > 1) {
      setError('Multiple final stages detected. Exactly one stage must be designated as Final.');
      return;
    }

    // 3. Final stage must be last
    const lastStage = stages[stages.length - 1]!;
    if (lastStage.stageType !== 'final' && !lastStage.isTerminal) {
      setError('The Final milestone must be placed at the very end of the pipeline.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSaveStages(pipeline.id, stages);
      setSuccess('Pipeline stages saved and synchronized successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pipeline stages');
    } finally {
      setSaving(false);
    }
  };

  if (!pipeline) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={
          <div className="bezent-pipeline-stages-modal-title">
            <span>Configure Stages — {pipeline.name}</span>
            <div className="bezent-pipeline-stages-title-badges">
              {pipeline.isDefault && <Badge variant="info">Default</Badge>}
              <Badge variant={pipeline.isActive ? 'success' : 'neutral'}>
                {pipeline.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        }
        description="Reorder milestones, define entry gates, and set mandatory sign-off criteria."
        headerActions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenAddStage}
            leftIcon={<BezentIcon name="plus" size={14} />}
          >
            Add Stage
          </Button>
        }
        footer={
          <div className="bezent-cif-modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAll} loading={saving}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="bezent-pipeline-stages-modal-body">
          {error && (
            <Alert variant="danger" title="Stage Configuration Error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" title="Success">
              {success}
            </Alert>
          )}

          <div className="bezent-pipeline-stages-banner">
            <span className="bezent-pipeline-stages-banner-lead">
              <strong>Entry Stage:</strong> The first stage is the entry milestone for new
              candidates.
            </span>
            <span className="bezent-pipeline-stages-banner-sub">
              <strong>Final Stage:</strong> Exactly one stage is terminal, triggering candidate
              conversion into the workforce.
            </span>
          </div>

          <div className="bezent-pipeline-stages-list" role="list">
            {stages.map((stg, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === stages.length - 1;
              const isFinal = stg.stageType === 'final' || stg.isTerminal;

              return (
                <div
                  key={stg.id}
                  className={`bezent-pipeline-stage-row ${
                    isFinal ? 'bezent-pipeline-stage-row--final' : ''
                  }`}
                  role="listitem"
                >
                  {/* Reorder Up/Down Controls */}
                  <div className="bezent-pipeline-stage-reorder">
                    <button
                      type="button"
                      className="bezent-pipeline-reorder-btn"
                      onClick={() => handleMoveUp(idx)}
                      disabled={isFirst || isFinal}
                      aria-label={`Move stage ${stg.name} up`}
                      title="Move up"
                    >
                      <BezentIcon name="chevronUp" size={14} />
                    </button>
                    <span className="bezent-pipeline-stage-order">{idx + 1}</span>
                    <button
                      type="button"
                      className="bezent-pipeline-reorder-btn"
                      onClick={() => handleMoveDown(idx)}
                      disabled={isLast || isFinal}
                      aria-label={`Move stage ${stg.name} down`}
                      title="Move down"
                    >
                      <BezentIcon name="chevronDown" size={14} />
                    </button>
                  </div>

                  {/* Stage Info */}
                  <div className="bezent-pipeline-stage-info">
                    <div className="bezent-pipeline-stage-title-row">
                      <span className="bezent-pipeline-stage-name">{stg.name}</span>
                      {isFirst && <Badge variant="info">Entry Stage</Badge>}
                      {isFinal ? (
                        <Badge variant="success">Final Milestone</Badge>
                      ) : stg.stageType === 'approval' ? (
                        <Badge variant="warning">Approval Stage</Badge>
                      ) : (
                        <Badge variant="neutral">Standard</Badge>
                      )}
                    </div>

                    {stg.description && (
                      <p className="bezent-pipeline-stage-desc">{stg.description}</p>
                    )}

                    {/* Stage Control Badges */}
                    <div className="bezent-pipeline-stage-chips">
                      {stg.allowManualEntry && (
                        <span className="bezent-pipeline-chip">Manual Entry</span>
                      )}
                      {stg.requireChecklist && (
                        <span className="bezent-pipeline-chip">Checklist Req.</span>
                      )}
                      {stg.requireDocVerification && (
                        <span className="bezent-pipeline-chip">Docs Verified</span>
                      )}
                      {stg.requireHrApproval && (
                        <span className="bezent-pipeline-chip bezent-pipeline-chip--highlight">
                          HR Approval
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Toggle & Row Actions */}
                  <div className="bezent-pipeline-stage-actions">
                    <div className="bezent-pipeline-stage-toggle">
                      <Switch
                        checked={stg.isActive}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleToggleActive(stg.id, e.target.checked)
                        }
                        disabled={isFinal}
                        aria-label={`Toggle active for ${stg.name}`}
                      />
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEditStage(stg)}
                      leftIcon={<BezentIcon name="edit" size={13} />}
                    >
                      Edit
                    </Button>

                    <button
                      type="button"
                      className="bezent-pipeline-reorder-btn"
                      onClick={() => handleDeleteStage(stg.id)}
                      disabled={isFinal}
                      aria-label={`Delete stage ${stg.name}`}
                      title="Delete stage"
                    >
                      <BezentIcon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Add / Edit Stage Modal */}
      <AddEditStageModal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        onSave={handleSaveStageFromModal}
        stage={editingStage}
        existingStages={stages}
      />
    </>
  );
}
