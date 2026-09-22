import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import {
  SUPPORTED_STAGE_KEYS,
  type OnboardingChecklistTemplate,
  type CreateOnboardingChecklistTemplateDto,
  type UpdateOnboardingChecklistTemplateDto,
} from '../types/settings';
import './DocumentModal.css';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: OnboardingChecklistTemplate | null;
  defaultStageKey?: string;
  onSubmitCreate: (payload: CreateOnboardingChecklistTemplateDto) => Promise<void>;
  onSubmitUpdate: (id: string, payload: UpdateOnboardingChecklistTemplateDto) => Promise<void>;
}

const COMMON_ASSIGNEES = [
  { value: 'hr', label: 'HR Team' },
  { value: 'employee', label: 'Employee / Candidate' },
  { value: 'manager', label: 'Hiring Manager' },
  { value: 'it_admin', label: 'IT Administrator' },
  { value: 'finance', label: 'Finance / Payroll' },
];

export function ChecklistModal({
  isOpen,
  onClose,
  checklist,
  defaultStageKey = 'preboarding',
  onSubmitCreate,
  onSubmitUpdate,
}: ChecklistModalProps) {
  const isEditing = Boolean(checklist);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stageKey, setStageKey] = useState(defaultStageKey);
  const [assigneeType, setAssigneeType] = useState('hr');
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [isRequired, setIsRequired] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (checklist) {
      setName(checklist.name);
      setDescription(checklist.description || '');
      setStageKey(checklist.stageKey);
      setAssigneeType(checklist.assigneeType);
      setDueOffsetDays(checklist.dueOffsetDays);
      setIsRequired(checklist.isRequired);
      setDisplayOrder(checklist.displayOrder);
      setIsActive(checklist.isActive);
    } else {
      setName('');
      setDescription('');
      setStageKey(defaultStageKey);
      setAssigneeType('hr');
      setDueOffsetDays(0);
      setIsRequired(true);
      setDisplayOrder(0);
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [checklist, defaultStageKey, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Task name is required');
      return;
    }

    if (dueOffsetDays < -90 || dueOffsetDays > 365) {
      setErrorMessage('Due offset days must be between -90 and 365');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && checklist) {
        await onSubmitUpdate(checklist.id, {
          name: name.trim(),
          description: description.trim() || null,
          stageKey,
          assigneeType,
          dueOffsetDays,
          isRequired,
          displayOrder,
          isActive,
        });
      } else {
        await onSubmitCreate({
          name: name.trim(),
          description: description.trim() || null,
          stageKey,
          assigneeType,
          dueOffsetDays,
          isRequired,
          displayOrder,
          isActive,
        });
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save checklist template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-modal-backdrop" role="dialog" aria-modal="true">
      <div className="settings-modal">
        <div className="settings-modal__header">
          <h3 className="settings-modal__title">
            {isEditing ? 'Edit Checklist Task' : 'Add Checklist Task'}
          </h3>
          <button
            type="button"
            className="settings-modal__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <BezentIcon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-modal__body">
            {errorMessage && (
              <div className="settings-alert settings-alert--error" role="alert">
                <BezentIcon name="warning" size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="settings-form__row">
              <label htmlFor="chk-name-input" className="settings-form__label">
                Task Name *
              </label>
              <input
                id="chk-name-input"
                type="text"
                className="settings-form__input"
                placeholder="e.g., Send Welcome Kit, Provision Laptop"
                value={name}
                maxLength={150}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="settings-form__row">
              <label htmlFor="chk-stage-select" className="settings-form__label">
                Assigned Stage *
              </label>
              <select
                id="chk-stage-select"
                className="settings-form__input"
                value={stageKey}
                onChange={(e) => setStageKey(e.target.value)}
              >
                {SUPPORTED_STAGE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-form__row">
              <label htmlFor="chk-assignee-select" className="settings-form__label">
                Assignee Responsibility Category
              </label>
              <select
                id="chk-assignee-select"
                className="settings-form__input"
                value={assigneeType}
                onChange={(e) => setAssigneeType(e.target.value)}
              >
                {COMMON_ASSIGNEES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} ({a.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-form__row">
              <label htmlFor="chk-offset-input" className="settings-form__label">
                Due Offset (Days Relative to Joining Date)
              </label>
              <span className="settings-form__hint">
                0 = Due on joining day; -3 = 3 days before joining; 5 = 5 days after joining
              </span>
              <input
                id="chk-offset-input"
                type="number"
                min={-90}
                max={365}
                className="settings-form__input"
                value={dueOffsetDays}
                onChange={(e) => setDueOffsetDays(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="settings-form__row">
              <label htmlFor="chk-desc-input" className="settings-form__label">
                Description / Action Instructions
              </label>
              <input
                id="chk-desc-input"
                type="text"
                className="settings-form__input"
                placeholder="e.g., Ship hardware to candidate address"
                value={description}
                maxLength={255}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="settings-form__row">
              <label htmlFor="chk-order-input" className="settings-form__label">
                Display Order
              </label>
              <input
                id="chk-order-input"
                type="number"
                min={0}
                className="settings-form__input"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">Mandatory Task</span>
                <span className="settings-form__hint">Must be completed before stage closure</span>
              </div>
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
            </label>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">Active Status</span>
                <span className="settings-form__hint">Task template enabled for new cases</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-modal__footer">
            <button
              type="button"
              className="stage-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
