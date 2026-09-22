import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BezentIcon } from '../../design-system/icons';
import type { GlobalTaskItem } from './types';
import './TasksPage.css';

interface OutletContextData {
  tasks?: GlobalTaskItem[];
  completeTask?: (id: string) => void;
}

export function TasksPage() {
  const outlet = useOutletContext<OutletContextData | undefined>();
  const initialTasks: GlobalTaskItem[] = outlet?.tasks ?? [
    {
      id: 't1',
      title: 'Review candidate interview feedback for Senior Frontend Role',
      relatedTo: 'Recruitment • Senior FE',
      icon: 'recruitment',
      due: 'Today, 5:00 PM',
      priority: 'High',
      status: 'Open',
    },
    {
      id: 't2',
      title: 'Submit Q3 payroll adjustment summary',
      relatedTo: 'Payroll • Compliance',
      icon: 'payroll',
      due: 'Tomorrow',
      priority: 'Medium',
      status: 'In Progress',
    },
    {
      id: 't3',
      title: 'Approve annual leave request for Engineering Lead',
      relatedTo: 'Leave Tracker • Team Alpha',
      icon: 'leave',
      due: 'Today',
      priority: 'High',
      status: 'Open',
    },
  ];

  const [taskList, setTaskList] = useState<GlobalTaskItem[]>(initialTasks);
  const [activeList, setActiveList] = useState<'all' | 'starred' | 'my-tasks'>('my-tasks');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set(['t1']));
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDue, setNewTaskDue] = useState('Today');

  function handleToggleComplete(id: string) {
    if (outlet?.completeTask) {
      outlet.completeTask(id);
    }
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'Completed' ? 'Open' : 'Completed' } : t,
      ),
    );
  }

  function handleToggleStar(id: string) {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    const newTask: GlobalTaskItem = {
      id: `custom-task-${Date.now()}`,
      title: newTaskTitle.trim(),
      relatedTo: newTaskDesc.trim() || 'My Tasks',
      icon: 'tasks',
      due: newTaskDue,
      priority: newTaskPriority,
      status: 'Open',
    };
    setTaskList((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsAdding(false);
  }

  function handleDeleteTask(id: string) {
    setTaskList((prev) => prev.filter((t) => t.id !== id));
  }

  const filteredTasks = useMemo(() => {
    if (activeList === 'starred') {
      return taskList.filter((t) => starredIds.has(t.id));
    }
    if (activeList === 'my-tasks') {
      return taskList;
    }
    return taskList;
  }, [taskList, activeList, starredIds]);

  const openTasks = filteredTasks.filter((t) => t.status !== 'Completed');
  const completedTasks = filteredTasks.filter((t) => t.status === 'Completed');

  return (
    <div className="tasks-page">
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <header className="tasks-page__header">
        <div className="tasks-page__brand">
          <span className="tasks-page__brand-icon">
            <BezentIcon name="tasks" size={20} active color="currentColor" />
          </span>
          <span className="tasks-page__brand-text">Tasks</span>
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Content) ───────────────────────────── */}
      <div className="tasks-page__body">
        {/* Left Navigation Sidebar */}
        <aside className="tasks-page__sidebar">
          <button
            type="button"
            className="tasks-page__create-btn"
            onClick={() => setIsAdding(true)}
          >
            <BezentIcon name="plusSign" size={20} color="#1a73e8" />
            <span>Create</span>
          </button>

          <nav className="tasks-page__nav" aria-label="Task lists navigation">
            <button
              type="button"
              className={`tasks-page__nav-item ${activeList === 'all' ? 'is-active' : ''}`.trim()}
              onClick={() => setActiveList('all')}
            >
              <BezentIcon name="tasks" size={18} color="currentColor" />
              <span>All tasks</span>
            </button>

            <button
              type="button"
              className={`tasks-page__nav-item ${activeList === 'starred' ? 'is-active' : ''}`.trim()}
              onClick={() => setActiveList('starred')}
            >
              <BezentIcon name="sparkles" size={18} color="currentColor" />
              <span>Starred</span>
            </button>

            <div className="tasks-page__nav-divider" />

            <div className="tasks-page__nav-section-title">Lists</div>

            <button
              type="button"
              className={`tasks-page__nav-item ${activeList === 'my-tasks' ? 'is-active' : ''}`.trim()}
              onClick={() => setActiveList('my-tasks')}
            >
              <BezentIcon name="check" size={18} color="currentColor" />
              <span>My Tasks</span>
            </button>

            <button
              type="button"
              className="tasks-page__nav-item tasks-page__nav-item--add"
              onClick={() => setIsAdding(true)}
            >
              <BezentIcon name="plusSign" size={16} color="currentColor" />
              <span>Create new list</span>
            </button>
          </nav>
        </aside>

        {/* Central Tasks Content Card */}
        <main className="tasks-page__content">
          <div className="tasks-card">
            {/* List Header */}
            <div className="tasks-card__header">
              <h1 className="tasks-card__title">
                {activeList === 'starred'
                  ? 'Starred Tasks'
                  : activeList === 'all'
                    ? 'All Tasks'
                    : 'My Tasks'}
              </h1>
              <span className="tasks-card__count">{openTasks.length} pending</span>
            </div>

            {/* Inline Add Task Input */}
            {isAdding ? (
              <div className="tasks-card__add-box">
                <input
                  type="text"
                  placeholder="Title"
                  className="tasks-card__input-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
                <textarea
                  placeholder="Details (optional)"
                  className="tasks-card__input-desc"
                  rows={2}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />

                <div className="tasks-card__add-controls">
                  <div className="tasks-card__chips">
                    <select
                      className="tasks-card__select"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                    >
                      <option value="Today">Due: Today</option>
                      <option value="Tomorrow">Due: Tomorrow</option>
                      <option value="This Week">Due: This Week</option>
                      <option value="Next Week">Due: Next Week</option>
                    </select>

                    <select
                      className="tasks-card__select"
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(e.target.value as 'High' | 'Medium' | 'Low')
                      }
                    >
                      <option value="High">Priority: High</option>
                      <option value="Medium">Priority: Medium</option>
                      <option value="Low">Priority: Low</option>
                    </select>
                  </div>

                  <div className="tasks-card__btn-group">
                    <button
                      type="button"
                      className="tasks-card__btn-secondary"
                      onClick={() => setIsAdding(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="tasks-card__btn-primary"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="tasks-card__quick-add-btn"
                onClick={() => setIsAdding(true)}
              >
                <BezentIcon name="plusSign" size={18} color="#1a73e8" />
                <span>Add a task</span>
              </button>
            )}

            {/* Task Items List */}
            <div className="tasks-card__list">
              {openTasks.map((task) => {
                const isStarred = starredIds.has(task.id);

                return (
                  <div key={task.id} className="tasks-item">
                    <button
                      type="button"
                      className="tasks-item__check-btn"
                      aria-label="Mark task complete"
                      onClick={() => handleToggleComplete(task.id)}
                    >
                      <span className="tasks-item__circle" />
                    </button>

                    <div className="tasks-item__content">
                      <div className="tasks-item__title">{task.title}</div>
                      <div className="tasks-item__meta">
                        {task.due && (
                          <span className="tasks-item__due-chip">
                            <BezentIcon name="calendar" size={13} color="currentColor" />
                            <span>{task.due}</span>
                          </span>
                        )}
                        <span
                          className={`tasks-item__priority tasks-item__priority--${task.priority?.toLowerCase() ?? 'medium'}`}
                        >
                          {task.priority}
                        </span>
                        {task.relatedTo && (
                          <span className="tasks-item__source">{task.relatedTo}</span>
                        )}
                      </div>
                    </div>

                    <div className="tasks-item__actions">
                      <button
                        type="button"
                        className={`tasks-item__star-btn ${isStarred ? 'is-starred' : ''}`.trim()}
                        aria-label="Star task"
                        onClick={() => handleToggleStar(task.id)}
                      >
                        <BezentIcon name="sparkles" size={16} color="currentColor" />
                      </button>

                      <button
                        type="button"
                        className="tasks-item__del-btn"
                        aria-label="Delete task"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <BezentIcon name="delete" size={16} color="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty State when no tasks */}
              {openTasks.length === 0 && !isAdding && (
                <div className="tasks-empty">
                  <div className="tasks-empty__graphic" aria-hidden="true">
                    <span className="tasks-empty__pill" />
                    <span className="tasks-empty__illustration-icon">
                      <BezentIcon name="tasks" size={36} color="#1a73e8" active />
                    </span>
                  </div>
                  <h3 className="tasks-empty__title">No tasks yet</h3>
                  <p className="tasks-empty__desc">
                    Add your to-dos and keep track of them across BEZENT Workspace.
                  </p>
                </div>
              )}

              {/* Completed Tasks Accordion */}
              {completedTasks.length > 0 && (
                <div className="tasks-completed-section">
                  <div className="tasks-completed-section__title">
                    Completed ({completedTasks.length})
                  </div>
                  {completedTasks.map((task) => (
                    <div key={task.id} className="tasks-item is-completed">
                      <button
                        type="button"
                        className="tasks-item__check-btn is-checked"
                        aria-label="Mark task incomplete"
                        onClick={() => handleToggleComplete(task.id)}
                      >
                        <BezentIcon name="check" size={14} color="#ffffff" />
                      </button>
                      <div className="tasks-item__content">
                        <div className="tasks-item__title">{task.title}</div>
                      </div>
                      <button
                        type="button"
                        className="tasks-item__del-btn"
                        aria-label="Delete task"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <BezentIcon name="delete" size={16} color="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default TasksPage;
