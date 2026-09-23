import { useState, useEffect, type FormEvent } from 'react';
import {
  Button,
  Modal,
  Input,
  Select,
  Switch,
  Alert,
  Stack,
  Actions,
} from '../../../../design-system/components';
import {
  SUPPORTED_STAGE_KEYS,
  type OnboardingChecklistTemplate,
  type CreateOnboardingChecklistTemplateDto,
  type UpdateOnboardingChecklistTemplateDto,
} from '../types/settings';

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

  const stageOptions = SUPPORTED_STAGE_KEYS.map((k) => ({
    value: k,
    label: k.charAt(0).toUpperCase() + k.slice(1),
  }));

  const assigneeOptions = COMMON_ASSIGNEES.map((a) => ({
    value: a.value,
    label: `${a.label} (${a.value})`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Checklist Task' : 'Add Checklist Task'}
      footer={
        <Actions align="end" gap="sm">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting} form="checklist-modal-form">
            {submitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </Actions>
      }
    >
      <form id="checklist-modal-form" onSubmit={handleSubmit}>
        <Stack gap="md">
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

          <Input
            id="chk-name-input"
            label="Task Name *"
            placeholder="e.g., Send Welcome Kit, Provision Laptop"
            value={name}
            maxLength={150}
            required
            onChange={(e) => setName(e.target.value)}
          />

          <Select
            id="chk-stage-select"
            label="Assigned Stage *"
            value={stageKey}
            options={stageOptions}
            onChange={(e) => setStageKey(e.target.value)}
          />

          <Select
            id="chk-assignee-select"
            label="Assignee Responsibility Category"
            value={assigneeType}
            options={assigneeOptions}
            onChange={(e) => setAssigneeType(e.target.value)}
          />

          <Input
            id="chk-offset-input"
            label="Due Offset (Days Relative to Joining Date)"
            helperText="0 = Due on joining day; -3 = 3 days before joining; 5 = 5 days after joining"
            type="number"
            min={-90}
            max={365}
            value={dueOffsetDays}
            onChange={(e) => setDueOffsetDays(parseInt(e.target.value, 10) || 0)}
          />

          <Input
            id="chk-desc-input"
            label="Description / Action Instructions"
            placeholder="e.g., Ship hardware to candidate address"
            value={description}
            maxLength={255}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            id="chk-order-input"
            label="Display Order"
            type="number"
            min={0}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
          />

          <Switch
            id="chk-required-switch"
            label="Mandatory Task (Must be completed before stage closure)"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />

          <Switch
            id="chk-active-switch"
            label="Active Status (Task template enabled for new cases)"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </Stack>
      </form>
    </Modal>
  );
}

export default ChecklistModal;
