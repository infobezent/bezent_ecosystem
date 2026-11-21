import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import type { PipelineStageConfig, StageType } from '../../../types/pipeline.types';

interface AddEditStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stage: PipelineStageConfig) => void;
  stage?: PipelineStageConfig | null;
  existingStages: PipelineStageConfig[];
}

export function AddEditStageModal({
  isOpen,
  onClose,
  onSave,
  stage,
  existingStages,
}: AddEditStageModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stageType, setStageType] = useState<StageType>('standard');
  const [color, setColor] = useState('');

  // Stage controls
  const [allowManualEntry, setAllowManualEntry] = useState(true);
  const [allowManualExit, setAllowManualExit] = useState(true);
  const [requireChecklist, setRequireChecklist] = useState(false);
  const [requireDocVerification, setRequireDocVerification] = useState(false);
  const [requireHrApproval, setRequireHrApproval] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stage) {
      setName(stage.name || '');
      setDescription(stage.description || '');
      setStageType(stage.stageType || (stage.isTerminal ? 'final' : 'standard'));
      setColor(stage.color || '');
      setAllowManualEntry(stage.allowManualEntry ?? true);
      setAllowManualExit(stage.allowManualExit ?? (stage.stageType !== 'final'));
      setRequireChecklist(Boolean(stage.requireChecklist));
      setRequireDocVerification(Boolean(stage.requireDocVerification));
      setRequireHrApproval(Boolean(stage.requireHrApproval));
    } else {
      setName('');
      setDescription('');
      setStageType('standard');
      setColor('');
      setAllowManualEntry(true);
      setAllowManualExit(true);
      setRequireChecklist(false);
      setRequireDocVerification(false);
      setRequireHrApproval(false);
    }
    setError(null);
  }, [stage, isOpen]);

  // Adjust controls automatically based on stageType
  const handleStageTypeChange = (newType: StageType) => {
    setStageType(newType);
    if (newType === 'final') {
      setAllowManualExit(false);
    } else if (newType === 'approval') {
      setRequireHrApproval(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Stage name is required.');
      return;
    }

    // Name uniqueness check within pipeline
    const duplicate = existingStages.find(
      (s) =>
        s.id !== stage?.id &&
        s.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      setError(`A stage named "${trimmedName}" already exists in this pipeline.`);
      return;
    }

    const isFinal = stageType === 'final';

    const updatedStage: PipelineStageConfig = {
      id: stage?.id || `stg_custom_${Date.now()}`,
      stageKey:
        stage?.stageKey ||
        `stage_${trimmedName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      description: description.trim() || null,
      stageType,
      displayOrder: stage?.displayOrder ?? existingStages.length + 1,
      isRequired: stage?.isRequired ?? true,
      isActive: stage?.isActive ?? true,
      isTerminal: isFinal,
      color: color.trim() || null,
      allowManualEntry,
      allowManualExit: isFinal ? false : allowManualExit,
      requireChecklist,
      requireDocVerification,
      requireHrApproval: stageType === 'approval' ? true : requireHrApproval,
    };

    onSave(updatedStage);
    onClose();
  };

  const isEditing = Boolean(stage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isEditing ? 'Edit Stage' : 'Add Stage'}
      description="Configure stage details, milestone type, and transition gating rules."
      footer={
        <div className="bezent-cif-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEditing ? 'Update Stage' : 'Add Stage'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="bezent-pipeline-modal-form">
        {error && (
          <Alert variant="danger" title="Validation Error">
            {error}
          </Alert>
        )}

        <div className="bezent-pipeline-modal-field">
          <label htmlFor="stage-name-input" className="bezent-pipeline-label">
            Stage Name <span className="bezent-pipeline-required">*</span>
          </label>
          <Input
            id="stage-name-input"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Document Verification &amp; BG Check"
            autoFocus
          />
        </div>

        <div className="bezent-pipeline-modal-field">
          <label htmlFor="stage-desc-input" className="bezent-pipeline-label">
            Description <span className="bezent-pipeline-optional">(Optional)</span>
          </label>
          <textarea
            id="stage-desc-input"
            className="bezent-pipeline-textarea"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Explain what activities occur in this milestone..."
            rows={2}
          />
        </div>

        <div className="bezent-pipeline-modal-row">
          <div className="bezent-pipeline-modal-field">
            <label htmlFor="stage-type-select" className="bezent-pipeline-label">
              Stage Type
            </label>
            <Select
              id="stage-type-select"
              value={stageType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleStageTypeChange(e.target.value as StageType)
              }
            >
              <option value="standard">Standard Stage</option>
              <option value="approval">Approval Stage (Requires sign-off)</option>
              <option value="final">Final Stage (Terminal completion)</option>
            </Select>
          </div>

          <div className="bezent-pipeline-modal-field">
            <label htmlFor="stage-color-input" className="bezent-pipeline-label">
              Stage Accent <span className="bezent-pipeline-optional">(Optional)</span>
            </label>
            <Select
              id="stage-color-input"
              value={color}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setColor(e.target.value)}
            >
              <option value="">Default (Blue)</option>
              <option value="teal">Teal</option>
              <option value="indigo">Indigo</option>
              <option value="amber">Amber</option>
              <option value="emerald">Emerald</option>
            </Select>
          </div>
        </div>

        {/* Stage Controls & Gating Section */}
        <div className="bezent-pipeline-controls-section">
          <h4 className="bezent-pipeline-controls-title">Stage Controls &amp; Gating</h4>

          <div className="bezent-pipeline-control-item">
            <div className="bezent-pipeline-control-text">
              <span className="bezent-pipeline-control-label">Allow Manual Entry</span>
              <span className="bezent-pipeline-control-hint">
                Permits HR administrators to advance a candidate directly to this stage.
              </span>
            </div>
            <Switch
              checked={allowManualEntry}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAllowManualEntry(e.target.checked)
              }
              aria-label="Allow Manual Entry"
            />
          </div>

          {stageType !== 'final' && (
            <div className="bezent-pipeline-control-item">
              <div className="bezent-pipeline-control-text">
                <span className="bezent-pipeline-control-label">Allow Manual Exit</span>
                <span className="bezent-pipeline-control-hint">
                  Allows manual stage progression without requiring automated gate triggers.
                </span>
              </div>
              <Switch
                checked={allowManualExit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAllowManualExit(e.target.checked)
                }
                aria-label="Allow Manual Exit"
              />
            </div>
          )}

          <div className="bezent-pipeline-control-item">
            <div className="bezent-pipeline-control-text">
              <span className="bezent-pipeline-control-label">Require Checklist Completion</span>
              <span className="bezent-pipeline-control-hint">
                Enforces all tasks assigned under Checklist Templates to be done before exit.
              </span>
            </div>
            <Switch
              checked={requireChecklist}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRequireChecklist(e.target.checked)
              }
              aria-label="Require Checklist Completion"
            />
          </div>

          <div className="bezent-pipeline-control-item">
            <div className="bezent-pipeline-control-text">
              <span className="bezent-pipeline-control-label">Require Document Verification</span>
              <span className="bezent-pipeline-control-hint">
                Mandates HR approval of all Required Documents prior to advancing past this stage.
              </span>
            </div>
            <Switch
              checked={requireDocVerification}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRequireDocVerification(e.target.checked)
              }
              aria-label="Require Document Verification"
            />
          </div>

          <div className="bezent-pipeline-control-item">
            <div className="bezent-pipeline-control-text">
              <span className="bezent-pipeline-control-label">Require HR Approval</span>
              <span className="bezent-pipeline-control-hint">
                Requires explicit HR managerial sign-off to clear this milestone.
              </span>
            </div>
            <Switch
              checked={stageType === 'approval' ? true : requireHrApproval}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRequireHrApproval(e.target.checked)
              }
              disabled={stageType === 'approval'}
              aria-label="Require HR Approval"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
