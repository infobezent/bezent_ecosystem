import type { BezentIconName } from '../../design-system/icons';

/**
 * Presentation contract for the GLOBAL personal task surface (the rail's
 * "My Tasks" drawer). Not a database entity, and not the future Project
 * Management task domain (applications/project-management) — see
 * docs/architecture/GLOBAL-UTILITIES.md.
 */
export type GlobalTaskPriority = 'High' | 'Medium' | 'Low';
export type GlobalTaskStatus = 'Open' | 'In Progress' | 'Completed';

export interface GlobalTaskItem {
  id: string;
  title: string;
  /** What the task relates to, e.g. "Some record • Some area". */
  relatedTo: string;
  icon: BezentIconName;
  priority: GlobalTaskPriority;
  /** Display label ("Today", "Tomorrow", "12 Sep"); "Today" drives the Today tab. */
  due: string;
  dueTime?: string;
  /** ISO date or YYYY-MM-DD string for precise overdue calculation. */
  dueDate?: string;
  status: GlobalTaskStatus;
  overdue?: boolean;
  /** Completion must go through the owning workflow, not a checkbox. */
  requiresWorkflow?: boolean;
}
