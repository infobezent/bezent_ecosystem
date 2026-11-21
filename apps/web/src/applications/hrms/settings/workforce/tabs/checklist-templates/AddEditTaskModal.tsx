import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  ChecklistTaskItem,
  ChecklistTaskGroup,
  TaskAssigneeRole,
  AttachmentRequirement,
  TaskVisibility,
} from '../../../types/checklist.types';

export interface AddEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: ChecklistTaskItem) => void;
  task: ChecklistTaskItem | null;
  groups: ChecklistTaskGroup[];
  defaultGroupId?: string;
  allExistingTasks: ChecklistTaskItem[];
}

export function AddEditTaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  groups,
  defaultGroupId,
  allExistingTasks,
}: AddEditTaskModalProps) {
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [groupId, setGroupId] = useState(task?.groupId || defaultGroupId || groups[0]?.id || '');
  const [assignedTo, setAssignedTo] = useState<TaskAssigneeRole>(task?.assignedTo || 'hr');
  const [specificRoleName, setSpecificRoleName] = useState(task?.specificRoleName ?? '');
  const [isRequired, setIsRequired] = useState(task ? task.isRequired : true);
  const [dueOffsetDays, setDueOffsetDays] = useState(task ? task.dueOffsetDays : 0);

  // Advanced collapsible properties
  const [showAdvanced, setShowAdvanced] = useState(
    task
      ? task.attachmentRequirement !== 'none' ||
          task.approvalRequired ||
          Boolean(task.dependencyTaskId) ||
          task.visibility === 'internal'
      : false,
  );
  const [attachmentRequirement, setAttachmentRequirement] = useState<AttachmentRequirement>(
    task?.attachmentRequirement || 'none',
  );
  const [approvalRequired, setApprovalRequired] = useState(task ? task.approvalRequired : false);
  const [dependencyTaskId, setDependencyTaskId] = useState(task?.dependencyTaskId ?? '');
  const [visibility, setVisibility] = useState<TaskVisibility>(
    task?.visibility || 'employee_visible',
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description ?? '');
      setGroupId(task.groupId);
      setAssignedTo(task.assignedTo);
      setSpecificRoleName(task.specificRoleName ?? '');
      setIsRequired(task.isRequired);
      setDueOffsetDays(task.dueOffsetDays);
      setAttachmentRequirement(task.attachmentRequirement);
      setApprovalRequired(task.approvalRequired);
      setDependencyTaskId(task.dependencyTaskId ?? '');
      setVisibility(task.visibility);
      setShowAdvanced(
        task.attachmentRequirement !== 'none' ||
          task.approvalRequired ||
          Boolean(task.dependencyTaskId) ||
          task.visibility === 'internal',
      );
    } else {
      setName('');
      setDescription('');
      setGroupId(defaultGroupId || groups[0]?.id || '');
      setAssignedTo('hr');
      setSpecificRoleName('');
      setIsRequired(true);
      setDueOffsetDays(0);
      setAttachmentRequirement('none');
      setApprovalRequired(false);
      setDependencyTaskId('');
      setVisibility('employee_visible');
      setShowAdvanced(false);
    }
    setValidationError(null);
  }, [task, groups, defaultGroupId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Task Name is required');
      return;
    }

    const selectedGroupId = groupId || groups[0]?.id || 'default_grp';

    const normalizedTask: ChecklistTaskItem = {
      id: task?.id || `tsk_${Date.now().toString(36)}`,
      name: name.trim(),
      description: description.trim() || null,
      groupId: selectedGroupId,
      assignedTo,
      specificRoleName: assignedTo === 'specific_role' ? specificRoleName.trim() || null : null,
      isRequired,
      dueOffsetDays: Number(dueOffsetDays) || 0,
      attachmentRequirement,
      approvalRequired,
      dependencyTaskId: dependencyTaskId.trim() || null,
      visibility,
      displayOrder: task?.displayOrder ?? 999,
    };

    onSave(normalizedTask);
    onClose();
  };

  // Other tasks available for dependency
  const dependencyOptions = allExistingTasks.filter((t) => !task || t.id !== task.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Add New Task'} size="md">
      <form onSubmit={handleSubmit} className="bezent-checklist-task-form">
        {validationError && (
          <div className="bezent-checklist-form-error" role="alert">
            <BezentIcon name="alert" size={14} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Task Name */}
        <div className="bezent-checklist-field">
          <label htmlFor="chk-task-name" className="bezent-checklist-label">
            Task Name <span className="bezent-checklist-required">*</span>
          </label>
          <input
            id="chk-task-name"
            type="text"
            className="bezent-checklist-input"
            placeholder="e.g., Provision Laptop & Corporate Email"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setValidationError(null);
            }}
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="bezent-checklist-field">
          <label htmlFor="chk-task-desc" className="bezent-checklist-label">
            Description
          </label>
          <textarea
            id="chk-task-desc"
            className="bezent-checklist-textarea"
            placeholder="Detailed instructions or guidelines for this task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Row: Task Group & Assigned To */}
        <div className="bezent-checklist-form-row">
          <div className="bezent-checklist-field">
            <label htmlFor="chk-task-group" className="bezent-checklist-label">
              Task Group
            </label>
            <select
              id="chk-task-group"
              className="bezent-checklist-select"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bezent-checklist-field">
            <label htmlFor="chk-task-assigned" className="bezent-checklist-label">
              Assigned To
            </label>
            <select
              id="chk-task-assigned"
              className="bezent-checklist-select"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value as TaskAssigneeRole)}
            >
              <option value="hr">HR Administrator</option>
              <option value="it">IT Department</option>
              <option value="finance">Finance &amp; Payroll</option>
              <option value="manager">Reporting Manager</option>
              <option value="employee">Candidate / Employee</option>
              <option value="specific_role">Specific Role...</option>
            </select>
          </div>
        </div>

        {assignedTo === 'specific_role' && (
          <div className="bezent-checklist-field">
            <label htmlFor="chk-task-role" className="bezent-checklist-label">
              Role Title
            </label>
            <input
              id="chk-task-role"
              type="text"
              className="bezent-checklist-input"
              placeholder="e.g., Security Officer, Facilities Lead"
              value={specificRoleName}
              onChange={(e) => setSpecificRoleName(e.target.value)}
            />
          </div>
        )}

        {/* Row: Due Date Offset & Mandatory Switch */}
        <div className="bezent-checklist-form-row bezent-checklist-form-row--align-center">
          <div className="bezent-checklist-field">
            <label htmlFor="chk-task-offset" className="bezent-checklist-label">
              Due Date Offset (Days)
            </label>
            <input
              id="chk-task-offset"
              type="number"
              className="bezent-checklist-input"
              placeholder="0 (Joining Day), -3 (3 days before)"
              value={dueOffsetDays}
              onChange={(e) => setDueOffsetDays(parseInt(e.target.value, 10) || 0)}
            />
            <span className="bezent-checklist-hint">
              {dueOffsetDays < 0
                ? `${Math.abs(dueOffsetDays)} days before joining date`
                : dueOffsetDays === 0
                  ? 'On joining day'
                  : `${dueOffsetDays} days after joining date`}
            </span>
          </div>

          <div className="bezent-checklist-field bezent-checklist-field--toggle">
            <label className="bezent-checklist-label">Mandatory Task</label>
            <div className="bezent-checklist-switch-wrap">
              <Switch
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                label={isRequired ? 'Required' : 'Optional'}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div className="bezent-checklist-advanced-section">
          <button
            type="button"
            className="bezent-checklist-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
          >
            <BezentIcon name={showAdvanced ? 'chevron-down' : 'chevron-right'} size={14} />
            <span>Advanced Configuration (Attachments, Approvals, Visibility)</span>
          </button>

          {showAdvanced && (
            <div className="bezent-checklist-advanced-content">
              {/* Row: Attachment Requirement & Approval Required */}
              <div className="bezent-checklist-form-row">
                <div className="bezent-checklist-field">
                  <label htmlFor="chk-task-attach" className="bezent-checklist-label">
                    Attachment Upload
                  </label>
                  <select
                    id="chk-task-attach"
                    className="bezent-checklist-select"
                    value={attachmentRequirement}
                    onChange={(e) =>
                      setAttachmentRequirement(e.target.value as AttachmentRequirement)
                    }
                  >
                    <option value="none">No Attachment</option>
                    <option value="optional">Optional Attachment</option>
                    <option value="required">Mandatory Document Upload</option>
                  </select>
                </div>

                <div className="bezent-checklist-field bezent-checklist-field--toggle">
                  <label className="bezent-checklist-label">Approval Required</label>
                  <div className="bezent-checklist-switch-wrap">
                    <Switch
                      checked={approvalRequired}
                      onChange={(e) => setApprovalRequired(e.target.checked)}
                      label={approvalRequired ? 'Approval Gate' : 'No Approval'}
                    />
                  </div>
                </div>
              </div>

              {/* Row: Task Dependency & Visibility */}
              <div className="bezent-checklist-form-row">
                <div className="bezent-checklist-field">
                  <label htmlFor="chk-task-dep" className="bezent-checklist-label">
                    Task Dependency
                  </label>
                  <select
                    id="chk-task-dep"
                    className="bezent-checklist-select"
                    value={dependencyTaskId}
                    onChange={(e) => setDependencyTaskId(e.target.value)}
                  >
                    <option value="">No prerequisite task</option>
                    {dependencyOptions.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bezent-checklist-field">
                  <label htmlFor="chk-task-vis" className="bezent-checklist-label">
                    Visibility
                  </label>
                  <select
                    id="chk-task-vis"
                    className="bezent-checklist-select"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as TaskVisibility)}
                  >
                    <option value="employee_visible">Employee / Candidate Visible</option>
                    <option value="internal">Internal HR / Team Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bezent-checklist-modal-actions">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {task ? 'Update Task' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
