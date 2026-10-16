import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  Toolbar,
  EmptyState,
  Select,
  type BadgeVariant,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { essApi, type EssTask } from '../api/essApi';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function EssTasksPage() {
  const [tasks, setTasks] = useState<EssTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('all');

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

  const priorityVariant = (p: EssTask['priority']): BadgeVariant =>
    p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'neutral';

  const statusVariant = (s: EssTask['status']): BadgeVariant =>
    s === 'completed' ? 'success' : s === 'in_progress' ? 'info' : 'neutral';

  // Metrics
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  // Filtered List
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  if (loading) return <LoadingState label="Loading tasks..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  return (
    <Page>
      <PageHeader
        title="My Tasks"
        subtitle="Assigned onboarding, compliance, performance, and general administrative action items"
      />

      {successMsg && (
        <Alert variant="success" title="Updated">
          {successMsg}
        </Alert>
      )}

      {/* ── Summary Counters Strip ─────────────────────────────────── */}
      <Section title="Tasks Overview">
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span>Total Tasks</span>
              <strong>{totalCount}</strong>
              <span>Assigned across cycles</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Pending Action</span>
              <strong>{pendingCount}</strong>
              <span>Not yet started</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>In Progress</span>
              <strong>{inProgressCount}</strong>
              <span>Currently ongoing</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Completed</span>
              <strong>{completedCount}</strong>
              <span>Resolved action items</span>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Task List ─────────────────────────────────────────────── */}
      <Section title="Task List">
        <Stack gap="md">
          <Toolbar
            left={
              <Inline gap="sm" align="center">
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </Inline>
            }
            right={
              <span>
                Showing <strong>{filteredTasks.length}</strong> task(s)
              </span>
            }
          />

          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No Tasks Found"
              description={
                totalCount === 0
                  ? 'You are all caught up! No active tasks are currently assigned to you.'
                  : `No tasks found matching status "${statusFilter}".`
              }
            />
          ) : (
            <Stack gap="sm">
              {filteredTasks.map((task) => (
                <Card key={task.id} variant="default">
                  <Inline gap="md" align="start" justify="between" wrap>
                    <Stack gap="xs">
                      <Inline gap="sm" align="center">
                        <BezentIcon name="tasks" size={16} />
                        <strong>{task.title}</strong>
                        <Badge variant={priorityVariant(task.priority)} size="sm">
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Badge variant={statusVariant(task.status)} size="sm">
                          {task.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </Inline>
                      {task.description && <span>{task.description}</span>}
                      {task.dueDate && (
                        <Inline gap="xs" align="center">
                          <BezentIcon name="calendar" size={14} />
                          <span>
                            Due date: <strong>{task.dueDate}</strong>
                          </span>
                        </Inline>
                      )}
                    </Stack>

                    <Inline gap="xs" align="center">
                      {task.status === 'pending' && (
                        <Button
                          id={`task-start-${task.id}`}
                          variant="secondary"
                          size="sm"
                          onClick={() => updateStatus(task.id, 'in_progress')}
                          loading={updatingId === task.id}
                        >
                          Start Task
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
                      {task.status === 'completed' && (
                        <Badge variant="success" size="md">
                          Completed
                        </Badge>
                      )}
                    </Inline>
                  </Inline>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Section>
    </Page>
  );
}
