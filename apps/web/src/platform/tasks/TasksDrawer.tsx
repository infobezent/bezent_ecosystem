import { useEffect, useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { EmptyState } from '../../design-system/components';
import {
  ToneChip,
  UtilityDrawerFilterPanel,
  UtilityDrawerFooter,
  UtilityDrawerHeader,
  UtilityDrawerTabs,
  UtilityFooterLink,
  UtilityIconAction,
  UtilityLinkButton,
} from '../utility-drawer';
import { formatTaskDueLabel, getTaskBadgeCount, isDueTodayOrOverdue } from './taskUtils';
import type { GlobalTaskItem } from './types';
import './TasksDrawer.css';

type TaskTab = 'today' | 'upcoming' | 'completed';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
] as const;

const FILTERS = [
  { label: 'Status', options: ['All', 'Open', 'In Progress', 'Completed'] },
  { label: 'Due', options: ['Overdue', 'Today', 'Tomorrow', 'This Week'] },
  { label: 'Priority', options: ['High', 'Medium', 'Low'] },
] as const;

export interface TasksDrawerProps {
  tasks: GlobalTaskItem[];
  onClose: () => void;
  onViewAll?: () => void;
  onOpenTask?: (id: string) => void;
  onCompleteTask?: (id: string) => void;
  onAddTask?: () => void;
}

/**
 * The global "My Tasks" drawer body. Source: old approved UI `TaskDrawer`
 * / `TaskRow` (`App.tsx` 3184-3435). Data and actions arrive by props; the
 * full-page task view and the add-task form are separate, deferred UI.
 */
export function TasksDrawer({
  tasks,
  onClose,
  onViewAll,
  onOpenTask,
  onCompleteTask,
  onAddTask,
}: TasksDrawerProps) {
  const [tab, setTab] = useState<TaskTab>('today');
  const [filterOpen, setFilterOpen] = useState(false);

  // Single predicate isDueTodayOrOverdue ensures exact sync between default Today tab and badge count
  const visible = tasks.filter((t) =>
    tab === 'today'
      ? isDueTodayOrOverdue(t)
      : tab === 'upcoming'
        ? t.status !== 'Completed' && !isDueTodayOrOverdue(t)
        : t.status === 'Completed',
  );
  const badgeCount = getTaskBadgeCount(tasks);

  return (
    <div className="tasks-drawer">
      <UtilityDrawerHeader
        title="My Tasks"
        description="Your assigned work and follow-ups"
        icon="tasks"
        count={badgeCount}
        onFullScreen={onViewAll}
        onClose={onClose}
        actions={
          <>
            <UtilityIconAction icon="plusSign" label="Add Task" onClick={onAddTask} />
            <UtilityIconAction
              icon="filter"
              label="Filter"
              active={filterOpen}
              onClick={() => setFilterOpen((v) => !v)}
            />
          </>
        }
      />
      <UtilityDrawerTabs tabs={TABS} value={tab} onChange={setTab} label="Task views" />
      {filterOpen && <UtilityDrawerFilterPanel groups={FILTERS} />}

      <div className="tasks-drawer__list">
        {visible.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onComplete={() => onCompleteTask?.(task.id)}
            onOpen={() => onOpenTask?.(task.id)}
          />
        ))}
        {visible.length === 0 && (
          <EmptyState
            size="compact"
            title={tab === 'completed' ? 'No completed tasks' : 'No tasks assigned'}
            description={
              tab === 'completed' ? 'Completed tasks will appear here.' : "You're all caught up."
            }
            primaryAction={
              tab !== 'completed' ? { label: 'Create Task', onClick: onAddTask } : undefined
            }
          />
        )}
      </div>

      <UtilityDrawerFooter>
        <UtilityFooterLink onClick={onViewAll}>View all tasks →</UtilityFooterLink>
      </UtilityDrawerFooter>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  onOpen,
}: {
  task: GlobalTaskItem;
  onComplete: () => void;
  onOpen: () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [warnWorkflow, setWarnWorkflow] = useState(false);
  const isDone = task.status === 'Completed';

  // The "requires workflow" hint shows briefly, as in the old row.
  useEffect(() => {
    if (!warnWorkflow) return;
    const timer = setTimeout(() => setWarnWorkflow(false), 2500);
    return () => clearTimeout(timer);
  }, [warnWorkflow]);

  // Guaranteed completion sync if transition end is skipped/delayed
  useEffect(() => {
    if (!completing) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 320);
    return () => clearTimeout(timer);
  }, [completing, onComplete]);

  function handleCheck() {
    if (isDone || completing) return;
    if (task.requiresWorkflow) {
      setWarnWorkflow(true);
      return;
    }
    setCompleting(true);
  }

  return (
    <div
      className={`task-row ${completing ? 'is-completing' : ''}`.trim()}
      onTransitionEnd={(e) => {
        if (completing && e.propertyName === 'opacity' && e.target === e.currentTarget) {
          onComplete();
        }
      }}
    >
      <button
        type="button"
        className={`task-row__check ${isDone ? 'is-checked' : ''}`.trim()}
        role="checkbox"
        aria-checked={isDone}
        aria-label={`Complete ${task.title}`}
        disabled={isDone}
        onClick={handleCheck}
      >
        {isDone && <BezentIcon name="check" size={11} color="currentColor" strokeWidth={2.4} />}
      </button>

      {(() => {
        const { isOverdue, label: dueLabel } = formatTaskDueLabel(task);
        return (
          <>
            <span className={`task-row__icon ${isOverdue ? 'is-overdue' : ''}`.trim()}>
              <BezentIcon name={task.icon} size={15} color="currentColor" />
            </span>

            <div className="task-row__body">
              <div className="task-row__title-line">
                <span className={`task-row__title ${isDone ? 'is-done' : ''}`.trim()}>
                  {task.title}
                </span>
                {task.priority === 'High' && !isDone && (
                  <ToneChip tone="danger" caps>
                    High
                  </ToneChip>
                )}
              </div>
              <div className="task-row__related">{task.relatedTo}</div>

              {warnWorkflow ? (
                <div className="task-row__warn" role="status">
                  Requires workflow action —{' '}
                  <UtilityLinkButton onClick={onOpen}>Open →</UtilityLinkButton>
                </div>
              ) : (
                <div className="task-row__meta">
                  {isOverdue && (
                    <>
                      <span className="task-row__overdue">
                        <BezentIcon name="warning" size={11} color="currentColor" />
                        Overdue
                      </span>
                      <span className="task-row__dot" aria-hidden="true" />
                    </>
                  )}
                  <span className="task-row__due">{dueLabel}</span>
                  {!isDone && (
                    <>
                      <span className="task-row__dot" aria-hidden="true" />
                      <UtilityLinkButton onClick={onOpen}>Open →</UtilityLinkButton>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
