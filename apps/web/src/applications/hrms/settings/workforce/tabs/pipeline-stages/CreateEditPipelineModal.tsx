import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import type { OnboardingPipeline } from '../../../types/pipeline.types';

interface CreateEditPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; isDefault: boolean }) => Promise<void>;
  pipeline?: OnboardingPipeline | null;
}

export function CreateEditPipelineModal({
  isOpen,
  onClose,
  onSave,
  pipeline,
}: CreateEditPipelineModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pipeline) {
      setName(pipeline.name || '');
      setDescription(pipeline.description || '');
      setIsDefault(Boolean(pipeline.isDefault));
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
    }
    setError(null);
  }, [pipeline, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Pipeline name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: trimmedName,
        description: description.trim(),
        isDefault,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(pipeline);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={isEditing ? 'Edit Pipeline' : 'Create Pipeline'}
      description={
        isEditing
          ? 'Update the onboarding pipeline name and default status.'
          : 'Define a new onboarding pipeline for distinct workforce cohorts.'
      }
      footer={
        <div className="bezent-cif-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEditing ? 'Save Pipeline' : 'Create Pipeline'}
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
          <label htmlFor="pipeline-name-input" className="bezent-pipeline-label">
            Pipeline Name <span className="bezent-pipeline-required">*</span>
          </label>
          <Input
            id="pipeline-name-input"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Contractor &amp; Intern Onboarding"
            autoFocus
          />
        </div>

        <div className="bezent-pipeline-modal-field">
          <label htmlFor="pipeline-desc-input" className="bezent-pipeline-label">
            Description <span className="bezent-pipeline-optional">(Optional)</span>
          </label>
          <textarea
            id="pipeline-desc-input"
            className="bezent-pipeline-textarea"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Provide guidance on which candidate categories should use this pipeline..."
            rows={3}
          />
        </div>

        <div className="bezent-pipeline-modal-field bezent-pipeline-modal-switch-field">
          <div className="bezent-pipeline-switch-info">
            <span className="bezent-pipeline-switch-label">Set as Default Pipeline</span>
            <span className="bezent-pipeline-switch-hint">
              Automatically routes candidates when no specific assignment rule matches.
            </span>
          </div>
          <Switch
            checked={isDefault}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsDefault(e.target.checked)}
            disabled={isEditing && pipeline?.isDefault}
            aria-label="Set as default pipeline"
          />
        </div>
      </form>
    </Modal>
  );
}
