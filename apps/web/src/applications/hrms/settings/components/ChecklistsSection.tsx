import { useState } from 'react';
import {
  Button,
  Card,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Alert,
  EmptyState,
  Toolbar,
  Actions,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  SUPPORTED_STAGE_KEYS,
  type OnboardingChecklistTemplate,
  type CreateOnboardingChecklistTemplateDto,
  type UpdateOnboardingChecklistTemplateDto,
} from '../types/settings';
import { ChecklistModal } from './ChecklistModal';

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

  const stageTabs = [
    {
      id: 'all',
      label: `All Stages (${checklists.length})`,
    },
    ...SUPPORTED_STAGE_KEYS.map((key) => {
      const count = checklists.filter((c) => c.stageKey === key).length;
      return {
        id: key,
        label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${count})`,
      };
    }),
  ];

  return (
    <Card padding="lg">
      <Stack gap="lg">
        <Toolbar
          left={
            <div>
              <h2 className="bezent-card__title">Checklist Task Templates</h2>
              <p className="bezent-card__desc">
                Standard tasks automatically generated for HR, candidates, managers, and IT.
              </p>
            </div>
          }
          right={
            <Button variant="primary" type="button" onClick={openCreateModal}>
              <BezentIcon name="plusSign" size={14} />
              Add Task Template
            </Button>
          }
        />

        <Tabs
          items={stageTabs}
          activeId={activeStageFilter}
          onChange={(id) => setActiveStageFilter(id)}
          variant="pills"
        />

        {success && <Alert variant="success">{success}</Alert>}

        {error && <Alert variant="danger">{error}</Alert>}

        {filteredTasks.length === 0 ? (
          <EmptyState
            title="No checklist tasks found for this stage."
            description="Add task templates to assign responsibilities automatically across onboarding stages."
            action={
              <Button variant="primary" type="button" onClick={openCreateModal}>
                Add First Task
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Task Name</TableHeaderCell>
                <TableHeaderCell>Stage</TableHeaderCell>
                <TableHeaderCell>Assignee Responsibility</TableHeaderCell>
                <TableHeaderCell>Due Relative</TableHeaderCell>
                <TableHeaderCell>Required</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <strong>{task.name}</strong>
                      {task.description && <p className="bezent-card__desc">{task.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{task.stageKey}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{task.assigneeType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm">
                      {formatOffset(task.dueOffsetDays)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.isRequired ? 'warning' : 'neutral'} size="sm">
                      {task.isRequired ? 'Required' : 'Optional'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge status={task.isActive ? 'active' : 'inactive'} size="sm">
                      {task.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Actions align="start" gap="xs">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(task)}
                      >
                        <BezentIcon name="edit" size={13} />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(task)}
                        disabled={deletingId === task.id}
                        aria-label={`Delete ${task.name}`}
                      >
                        <BezentIcon name="delete" size={13} />
                        Delete
                      </Button>
                    </Actions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      <ChecklistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        checklist={selectedTask}
        defaultStageKey={activeStageFilter === 'all' ? 'preboarding' : activeStageFilter}
        onSubmitCreate={onCreateChecklist}
        onSubmitUpdate={onUpdateChecklist}
      />
    </Card>
  );
}

export default ChecklistsSection;
