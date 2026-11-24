import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import { AddEditTaskModal } from './AddEditTaskModal';
import type {
  ChecklistTemplate,
  ChecklistTaskGroup,
  ChecklistTaskItem,
  ChecklistCategory,
  ChecklistApplicableTo,
  CreateChecklistTemplateDto,
} from '../../../types/checklist.types';

export interface CreateEditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: CreateChecklistTemplateDto & {
      groups: ChecklistTaskGroup[];
      tasks: ChecklistTaskItem[];
    },
  ) => Promise<void>;
  template?: ChecklistTemplate | null;
  initialTab?: 'details' | 'tasks';
}

export function CreateEditTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  initialTab = 'details',
}: CreateEditTemplateModalProps) {
  // Navigation tab within modal
  const [activeTab, setActiveTab] = useState<'details' | 'tasks'>(initialTab);

  // Template Details State
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState<ChecklistCategory>(template?.category || 'General');
  const [applicableTo, setApplicableTo] = useState<ChecklistApplicableTo>(
    template?.applicableTo || 'all',
  );
  const [applicableValue, setApplicableValue] = useState(template?.applicableValue || '');
  const [isActive, setIsActive] = useState(template ? template.isActive !== false : true);

  // Grouped Tasks State
  const [groups, setGroups] = useState<ChecklistTaskGroup[]>(() => {
    if (template?.groups && template.groups.length > 0) {
      return [...template.groups].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return [{ id: 'grp_default', name: 'General Tasks', displayOrder: 1 }];
  });
  const [tasks, setTasks] = useState<ChecklistTaskItem[]>(() => {
    if (template?.tasks && template.tasks.length > 0) {
      return [...template.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return [];
  });

  // Task Sub-modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistTaskItem | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>('');

  // Editing Group Name Inline
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Async / Error / Notification States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (template) {
        setName(template.name || '');
        setDescription(template.description || '');
        setCategory(template.category || 'General');
        setApplicableTo(template.applicableTo || 'all');
        setApplicableValue(template.applicableValue || '');
        setIsActive(template.isActive !== false);

        const loadedGroups =
          template.groups && template.groups.length > 0
            ? [...template.groups].sort((a, b) => a.displayOrder - b.displayOrder)
            : [{ id: 'grp_default', name: 'General Tasks', displayOrder: 1 }];
        setGroups(loadedGroups);

        const loadedTasks = template.tasks
          ? [...template.tasks].sort((a, b) => a.displayOrder - b.displayOrder)
          : [];
        setTasks(loadedTasks);
      } else {
        setName('');
        setDescription('');
        setCategory('General');
        setApplicableTo('all');
        setApplicableValue('');
        setIsActive(true);
        setGroups([
          { id: `grp_${Date.now().toString(36)}`, name: 'General Tasks', displayOrder: 1 },
        ]);
        setTasks([]);
      }
      setError(null);
      setSuccess(null);
      setEditingGroupId(null);
    }
  }, [isOpen, template, initialTab]);

  // Group Management
  const handleAddGroup = () => {
    const newGroupId = `grp_${Date.now().toString(36)}`;
    const newGroup: ChecklistTaskGroup = {
      id: newGroupId,
      name: `Task Group ${groups.length + 1}`,
      displayOrder: groups.length + 1,
    };
    setGroups([...groups, newGroup]);
    setEditingGroupId(newGroupId);
    setEditingGroupName(newGroup.name);
  };

  const handleSaveGroupName = (groupId: string) => {
    if (!editingGroupName.trim()) {
      setError('Group name cannot be empty');
      return;
    }
    setGroups(groups.map((g) => (g.id === groupId ? { ...g, name: editingGroupName.trim() } : g)));
    setEditingGroupId(null);
    setEditingGroupName('');
    setError(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    const tasksInGroup = tasks.filter((t) => t.groupId === groupId);
    if (tasksInGroup.length > 0) {
      setError(
        `Cannot delete group containing ${tasksInGroup.length} task(s). Move or delete tasks first.`,
      );
      return;
    }
    if (groups.length <= 1) {
      setError('A checklist template must contain at least one task group.');
      return;
    }
    const filtered = groups.filter((g) => g.id !== groupId);
    const renumbered = filtered.map((g, idx) => ({ ...g, displayOrder: idx + 1 }));
    setGroups(renumbered);
    setError(null);
  };

  const handleMoveGroup = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groups.length) return;

    const newGroups = [...groups];
    const curr = newGroups[index]!;
    const target = newGroups[targetIndex]!;
    newGroups[index] = target;
    newGroups[targetIndex] = curr;

    setGroups(newGroups.map((g, idx) => ({ ...g, displayOrder: idx + 1 })));
  };

  // Task Management
  const handleOpenAddTask = (groupId: string) => {
    setTargetGroupId(groupId);
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: ChecklistTaskItem) => {
    setTargetGroupId(task.groupId);
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (savedTask: ChecklistTaskItem) => {
    if (editingTask) {
      setTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else {
      const order = tasks.filter((t) => t.groupId === savedTask.groupId).length + 1;
      setTasks([...tasks, { ...savedTask, displayOrder: order }]);
    }
    setTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const nextTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(nextTasks);
  };

  const handleMoveTaskOrder = (taskId: string, direction: 'up' | 'down') => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const groupTasks = tasks
      .filter((t) => t.groupId === currentTask.groupId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const currentIndex = groupTasks.findIndex((t) => t.id === taskId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= groupTasks.length) return;

    const targetTask = groupTasks[targetIndex]!;
    const updatedTasks = tasks.map((t) => {
      if (t.id === currentTask.id) return { ...t, displayOrder: targetTask.displayOrder };
      if (t.id === targetTask.id) return { ...t, displayOrder: currentTask.displayOrder };
      return t;
    });

    setTasks(updatedTasks);
  };

  const handleMoveTaskToGroup = (taskId: string, newGroupId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.groupId === newGroupId) return;

    const destinationCount = tasks.filter((t) => t.groupId === newGroupId).length;
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, groupId: newGroupId, displayOrder: destinationCount + 1 } : t,
      ),
    );
  };

  // Main Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setActiveTab('details');
      setError('Template name is required.');
      return;
    }

    if (groups.length === 0) {
      setActiveTab('tasks');
      setError('At least one task group is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: trimmedName,
        description: description.trim() || null,
        category,
        applicableTo,
        applicableValue: applicableTo === 'all' ? null : applicableValue.trim() || null,
        isActive,
        groups,
        tasks,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save checklist template');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(template);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={isEditing ? 'Edit Checklist Template' : 'Create Checklist Template'}
        description={
          isEditing
            ? 'Configure template details, custom task groups, and assignees.'
            : 'Build a reusable onboarding checklist template with grouped tasks.'
        }
        footer={
          <div className="bezent-checklist-modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving Template…' : isEditing ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        }
      >
        <div className="bezent-checklist-modal-body">
          {error && (
            <Alert variant="danger" title="Validation Error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" title="Success">
              {success}
            </Alert>
          )}

          {/* Modal Tab Switcher */}
          <div className="bezent-checklist-modal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'details'}
              className={`bezent-checklist-modal-tab ${
                activeTab === 'details' ? 'bezent-checklist-modal-tab--active' : ''
              }`}
              onClick={() => setActiveTab('details')}
            >
              <BezentIcon name="edit" size={14} />
              <span>Template Details</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tasks'}
              className={`bezent-checklist-modal-tab ${
                activeTab === 'tasks' ? 'bezent-checklist-modal-tab--active' : ''
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              <BezentIcon name="checklist" size={14} />
              <span>Checklist Tasks ({tasks.length})</span>
            </button>
          </div>

          {/* TAB 1: TEMPLATE DETAILS */}
          {activeTab === 'details' && (
            <div className="bezent-checklist-tab-panel">
              <div className="bezent-cif-form-group">
                <label htmlFor="chk-template-name" className="bezent-cif-label">
                  Template Name <span className="bezent-cif-required">*</span>
                </label>
                <Input
                  id="chk-template-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Standard Employee Onboarding Checklist"
                  required
                />
              </div>

              <div className="bezent-cif-form-group">
                <label htmlFor="chk-template-desc" className="bezent-cif-label">
                  Description
                </label>
                <textarea
                  id="chk-template-desc"
                  className="bezent-cif-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the scope and purpose of this checklist..."
                  rows={2}
                />
              </div>

              <div className="bezent-checklist-grid-2col">
                <div className="bezent-cif-form-group">
                  <label htmlFor="chk-template-cat" className="bezent-cif-label">
                    Category
                  </label>
                  <select
                    id="chk-template-cat"
                    className="bezent-cif-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ChecklistCategory)}
                  >
                    <option value="General">General</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="bezent-cif-form-group">
                  <label htmlFor="chk-template-applicable" className="bezent-cif-label">
                    Applicable To
                  </label>
                  <select
                    id="chk-template-applicable"
                    className="bezent-cif-select"
                    value={applicableTo}
                    onChange={(e) => setApplicableTo(e.target.value as ChecklistApplicableTo)}
                  >
                    <option value="all">All Employees</option>
                    <option value="employment_type">Employment Type</option>
                    <option value="department">Department</option>
                    <option value="location">Work Location</option>
                  </select>
                </div>
              </div>

              {applicableTo !== 'all' && (
                <div className="bezent-cif-form-group">
                  <label htmlFor="chk-template-appl-val" className="bezent-cif-label">
                    Target Criteria Value
                  </label>
                  <Input
                    id="chk-template-appl-val"
                    value={applicableValue}
                    onChange={(e) => setApplicableValue(e.target.value)}
                    placeholder={`Specify ${applicableTo.replace('_', ' ')} (e.g. Full-time, Engineering, HQ)`}
                  />
                </div>
              )}

              <div className="bezent-cif-form-group bezent-checklist-status-row">
                <div className="bezent-cif-switch-copy">
                  <span className="bezent-cif-switch-title">Active Template</span>
                  <span className="bezent-cif-switch-hint">
                    Active templates can be selected or assigned to onboarding pipelines and
                    candidates.
                  </span>
                </div>
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  label="Active"
                  aria-label="Active status switch"
                />
              </div>
            </div>
          )}

          {/* TAB 2: TASKS & GROUPS BUILDER */}
          {activeTab === 'tasks' && (
            <div className="bezent-checklist-tab-panel">
              <div className="bezent-checklist-builder-header">
                <div className="bezent-checklist-builder-summary">
                  <span className="bezent-checklist-builder-title">Task Groups &amp; Items</span>
                  <span className="bezent-checklist-count-chip">
                    {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} in {groups.length}{' '}
                    {groups.length === 1 ? 'Group' : 'Groups'}
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddGroup}
                  leftIcon={<BezentIcon name="plus" size={13} />}
                >
                  Add Group
                </Button>
              </div>

              <div className="bezent-checklist-groups-container">
                {groups.map((group, groupIndex) => {
                  const groupTasks = tasks
                    .filter((t) => t.groupId === group.id)
                    .sort((a, b) => a.displayOrder - b.displayOrder);

                  const isRenaming = editingGroupId === group.id;

                  return (
                    <div key={group.id} className="bezent-checklist-group-card">
                      {/* Group Header */}
                      <div className="bezent-checklist-group-header">
                        <div className="bezent-checklist-group-header-left">
                          <div className="bezent-checklist-order-buttons">
                            <button
                              type="button"
                              className="bezent-checklist-reorder-btn"
                              onClick={() => handleMoveGroup(groupIndex, 'up')}
                              disabled={groupIndex === 0}
                              title="Move Group Up"
                              aria-label="Move group up"
                            >
                              <BezentIcon name="chevron-up" size={13} />
                            </button>
                            <button
                              type="button"
                              className="bezent-checklist-reorder-btn"
                              onClick={() => handleMoveGroup(groupIndex, 'down')}
                              disabled={groupIndex === groups.length - 1}
                              title="Move Group Down"
                              aria-label="Move group down"
                            >
                              <BezentIcon name="chevron-down" size={13} />
                            </button>
                          </div>

                          {isRenaming ? (
                            <div className="bezent-checklist-inline-rename">
                              <input
                                type="text"
                                className="bezent-checklist-inline-input"
                                value={editingGroupName}
                                onChange={(e) => setEditingGroupName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveGroupName(group.id);
                                  if (e.key === 'Escape') setEditingGroupId(null);
                                }}
                              />
                              <button
                                type="button"
                                className="bezent-checklist-icon-action-btn"
                                onClick={() => handleSaveGroupName(group.id)}
                                title="Save name"
                              >
                                <BezentIcon name="check" size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="bezent-checklist-group-title-wrap">
                              <span className="bezent-checklist-group-name">{group.name}</span>
                              <button
                                type="button"
                                className="bezent-checklist-group-rename-trigger"
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setEditingGroupName(group.name);
                                }}
                                title="Rename group"
                              >
                                <BezentIcon name="edit" size={12} />
                              </button>
                              <span className="bezent-checklist-group-pill">
                                {groupTasks.length} {groupTasks.length === 1 ? 'task' : 'tasks'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="bezent-checklist-group-header-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenAddTask(group.id)}
                            leftIcon={<BezentIcon name="plus" size={12} />}
                          >
                            Add Task
                          </Button>
                          <button
                            type="button"
                            className="bezent-checklist-group-del-btn"
                            onClick={() => handleDeleteGroup(group.id)}
                            title="Delete group"
                            aria-label={`Delete ${group.name}`}
                          >
                            <BezentIcon name="trash" size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Group Task Items */}
                      <div className="bezent-checklist-tasks-list">
                        {groupTasks.length === 0 ? (
                          <div className="bezent-checklist-group-empty">
                            <span>
                              No tasks in this group yet. Click &quot;Add Task&quot; above.
                            </span>
                          </div>
                        ) : (
                          groupTasks.map((t, taskIdx) => (
                            <div key={t.id} className="bezent-checklist-task-row">
                              <div className="bezent-checklist-task-order">
                                <button
                                  type="button"
                                  className="bezent-checklist-reorder-btn"
                                  onClick={() => handleMoveTaskOrder(t.id, 'up')}
                                  disabled={taskIdx === 0}
                                  title="Move Up"
                                  aria-label="Move task up"
                                >
                                  <BezentIcon name="chevron-up" size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="bezent-checklist-reorder-btn"
                                  onClick={() => handleMoveTaskOrder(t.id, 'down')}
                                  disabled={taskIdx === groupTasks.length - 1}
                                  title="Move Down"
                                  aria-label="Move task down"
                                >
                                  <BezentIcon name="chevron-down" size={12} />
                                </button>
                              </div>

                              <div className="bezent-checklist-task-info">
                                <span className="bezent-checklist-task-name">{t.name}</span>
                                <div className="bezent-checklist-task-badges">
                                  <span className="bezent-checklist-badge bezent-checklist-badge--role">
                                    {t.assignedTo.toUpperCase()}
                                  </span>
                                  <span className="bezent-checklist-badge bezent-checklist-badge--due">
                                    {t.dueOffsetDays === 0
                                      ? 'Day 0'
                                      : t.dueOffsetDays > 0
                                        ? `+${t.dueOffsetDays}d`
                                        : `${t.dueOffsetDays}d`}
                                  </span>
                                  {t.isRequired ? (
                                    <span className="bezent-checklist-badge bezent-checklist-badge--req">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="bezent-checklist-badge bezent-checklist-badge--opt">
                                      Optional
                                    </span>
                                  )}
                                  {t.attachmentRequirement !== 'none' && (
                                    <span
                                      className="bezent-checklist-badge bezent-checklist-badge--indicator"
                                      title={`Attachment: ${t.attachmentRequirement}`}
                                    >
                                      Doc ({t.attachmentRequirement})
                                    </span>
                                  )}
                                  {t.approvalRequired && (
                                    <span
                                      className="bezent-checklist-badge bezent-checklist-badge--indicator"
                                      title="Approval Required"
                                    >
                                      Approval
                                    </span>
                                  )}
                                  {t.visibility === 'internal' && (
                                    <span
                                      className="bezent-checklist-badge bezent-checklist-badge--indicator"
                                      title="Internal Only"
                                    >
                                      Internal
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="bezent-checklist-task-actions">
                                {groups.length > 1 && (
                                  <select
                                    className="bezent-checklist-move-select"
                                    value={t.groupId}
                                    onChange={(e) => handleMoveTaskToGroup(t.id, e.target.value)}
                                    title="Move to another group"
                                    aria-label="Move to group"
                                  >
                                    {groups.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <button
                                  type="button"
                                  className="bezent-checklist-icon-action-btn"
                                  onClick={() => handleOpenEditTask(t)}
                                  title="Edit Task"
                                  aria-label="Edit task"
                                >
                                  <BezentIcon name="edit" size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="bezent-checklist-icon-action-btn bezent-checklist-icon-action-btn--danger"
                                  onClick={() => handleDeleteTask(t.id)}
                                  title="Delete Task"
                                  aria-label="Delete task"
                                >
                                  <BezentIcon name="trash" size={13} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Task Creation & Editing Popup */}
      <AddEditTaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
        groups={groups}
        defaultGroupId={targetGroupId}
        allExistingTasks={tasks}
      />
    </>
  );
}
