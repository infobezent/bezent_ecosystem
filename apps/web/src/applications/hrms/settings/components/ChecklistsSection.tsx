import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import {
  SUPPORTED_STAGE_KEYS,
  type OnboardingChecklistTemplate,
  type CreateOnboardingChecklistTemplateDto,
  type UpdateOnboardingChecklistTemplateDto,
} from '../types/settings';
import { ChecklistModal } from './ChecklistModal';
import './ChecklistsSection.css';

interface ChecklistsSectionProps {
  checklists: OnboardingChecklistTemplate[];
  onCreateChecklist: (payload: CreateOnboardingChecklistTemplateDto) => Promise<void>;
  onUpdateChecklist: (id: string, payload: UpdateOnboardingChecklistTemplateDto) => Promise<void>;
  onDeleteChecklist: (id: string) => Promise<void>;
}

export function ChecklistsSection({
  checklists,
  onCreateChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
}: ChecklistsSectionProps) {
  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OnboardingChecklistTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openCreateModal = () => {
    setSelectedTask(null);
    setModalOpen(true);
    setError(null);
  };

  const openEditModal = (task: OnboardingChecklistTemplate) => {
    setSelectedTask(task);
    setModalOpen(true);
    setError(null);
  };

  const handleDelete = async (task: OnboardingChecklistTemplate) => {
    if (!window.confirm(`Are you sure you want to delete task "${task.name}"?`)) {
      return;
    }

    setDeletingId(task.id);
    setError(null);
    try {
      await onDeleteChecklist(task.id);
      setSuccess(`Task template "${task.name}" removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete checklist template');
    } finally {
      setDeletingId(null);
    }
  };

  const formatOffset = (offset: number): string => {
    if (offset === 0) return 'Day 1 (Joining)';
    if (offset < 0) return `${Math.abs(offset)}d before joining`;
    return `${offset}d after joining`;
  };

  const filteredTasks = checklists
    .filter((t) => activeStageFilter === 'all' || t.stageKey === activeStageFilter)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <div className="checklists-toolbar">
          <div>
            <h2 className="settings-card__title">Checklist Task Templates</h2>
            <p className="settings-card__subtitle">
              Standard tasks automatically generated for HR, candidates, managers, and IT.
            </p>
          </div>
          <Button variant="primary" type="button" onClick={openCreateModal}>
            <BezentIcon name="plusSign" size={14} />
            Add Task Template
          </Button>
        </div>

        <div className="checklists-filter-row">
          <button
            type="button"
            className={`checklists-tab ${activeStageFilter === 'all' ? 'checklists-tab--active' : ''}`}
            onClick={() => setActiveStageFilter('all')}
          >
            All Stages ({checklists.length})
          </button>
          {SUPPORTED_STAGE_KEYS.map((key) => {
            const count = checklists.filter((c) => c.stageKey === key).length;
            return (
              <button
                key={key}
                type="button"
                className={`checklists-tab ${activeStageFilter === key ? 'checklists-tab--active' : ''}`}
                onClick={() => setActiveStageFilter(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
              </button>
            );
          })}
        </div>
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

      {filteredTasks.length === 0 ? (
        <div className="docs-empty">
          <BezentIcon name="tasks" size={36} />
          <span>No checklist tasks found for this stage.</span>
          <Button variant="primary" type="button" onClick={openCreateModal}>
            Add First Task
          </Button>
        </div>
      ) : (
        <div className="fields-table-container">
          <table className="fields-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Stage</th>
                <th>Assignee Responsibility</th>
                <th>Due Relative</th>
                <th>Required</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div>
                      <strong>{task.name}</strong>
                      {task.description && <p className="stage-item__desc">{task.description}</p>}
                    </div>
                  </td>
                  <td>
                    <span className="fields-key">{task.stageKey}</span>
                  </td>
                  <td>
                    <span className="assignee-badge">{task.assigneeType}</span>
                  </td>
                  <td>
                    <span className="stage-pill stage-pill--optional">
                      {formatOffset(task.dueOffsetDays)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`stage-pill ${
                        task.isRequired ? 'stage-pill--required' : 'stage-pill--optional'
                      }`}
                    >
                      {task.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`stage-pill ${
                        task.isActive ? 'stage-pill--protected' : 'stage-pill--optional'
                      }`}
                    >
                      {task.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="stage-item__actions">
                      <button
                        type="button"
                        className="stage-btn-secondary"
                        onClick={() => openEditModal(task)}
                      >
                        <BezentIcon name="edit" size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="stage-btn-secondary btn-danger-icon"
                        onClick={() => handleDelete(task)}
                        disabled={deletingId === task.id}
                        aria-label={`Delete ${task.name}`}
                      >
                        <BezentIcon name="delete" size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ChecklistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        checklist={selectedTask}
        defaultStageKey={activeStageFilter === 'all' ? 'preboarding' : activeStageFilter}
        onSubmitCreate={onCreateChecklist}
        onSubmitUpdate={onUpdateChecklist}
      />
    </div>
  );
}
