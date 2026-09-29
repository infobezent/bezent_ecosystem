import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  EmptyState,
  type BadgeVariant,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssTask } from '../api/essApi';

export function EssTasksPage() {
  const [tasks, setTasks] = useState<EssTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getTasks();
      setTasks(data.tasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: EssTask['status']) => {
    setUpdatingId(id);
    try {
      await essApi.updateTaskStatus(id, status);
      setSuccessMsg(`Task marked as ${status.replace('_', ' ')}.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading tasks..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  const priorityVariant = (p: EssTask['priority']): BadgeVariant =>
    p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'neutral';

  const statusVariant = (s: EssTask['status']): BadgeVariant =>
    s === 'completed' ? 'success' : s === 'in_progress' ? 'info' : 'neutral';

  const activeCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <Page>
      <PageHeader
        title="My Tasks"
        subtitle={`${activeCount} active task${activeCount !== 1 ? 's' : ''} assigned to you`}
      />

      {successMsg && (
        <Alert variant="success" title="Updated">
          {successMsg}
        </Alert>
      )}

      <Section title="Task List">
        {tasks.length === 0 ? (
          <EmptyState
            title="No Tasks Assigned"
            description="Tasks assigned to you by HR or your manager will appear here."
          />
        ) : (
          <Stack gap="sm">
            {tasks.map((task) => (
              <Card key={task.id}>
                <Inline gap="md" align="start" justify="between">
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="tasks" size={16} />
                      <strong>{task.title}</strong>
                      <Badge variant={priorityVariant(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </Inline>
                    {task.description && <span>{task.description}</span>}
                    <Inline gap="sm">
                      {task.dueDate && (
                        <Inline gap="xs" align="center">
                          <BezentIcon name="calendar" size={12} />
                          <span>Due {task.dueDate}</span>
                        </Inline>
                      )}
                      <Badge variant={statusVariant(task.status)}>
                        {task.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </Inline>
                  </Stack>
                  <Inline gap="xs">
                    {task.status === 'pending' && (
                      <Button
                        id={`task-start-${task.id}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => updateStatus(task.id, 'in_progress')}
                        loading={updatingId === task.id}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        id={`task-complete-${task.id}`}
                        variant="primary"
                        size="sm"
                        onClick={() => updateStatus(task.id, 'completed')}
                        loading={updatingId === task.id}
                      >
                        Mark Complete
                      </Button>
                    )}
                    {task.status === 'completed' && <Badge variant="success">Done</Badge>}
                  </Inline>
                </Inline>
              </Card>
            ))}
          </Stack>
        )}
      </Section>
    </Page>
  );
}
