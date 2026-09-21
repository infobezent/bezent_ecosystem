import type { GlobalTaskItem } from './types';

/**
 * Parses time string supporting '5:00 PM', '09:30 AM', '17:00', '9:30'.
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Parses YYYY-MM-DD from a date string.
 */
export function parseDateParts(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1]!, 10),
    month: parseInt(match[2]!, 10) - 1,
    day: parseInt(match[3]!, 10),
  };
}

/**
 * Checks whether a task is due on the reference date (defaults to today in local time).
 */
export function isTaskDueToday(task: GlobalTaskItem, referenceNow = new Date()): boolean {
  if (task.dueDate) {
    const parts = parseDateParts(task.dueDate);
    if (parts) {
      return (
        parts.year === referenceNow.getFullYear() &&
        parts.month === referenceNow.getMonth() &&
        parts.day === referenceNow.getDate()
      );
    }
  }
  return task.due?.toLowerCase() === 'today';
}

/**
 * Determines whether a task is overdue.
 *
 * Rules:
 * 1. A completed task is never overdue.
 * 2. Overdue = dueDateTime < now.
 * 3. A task due today with a future time shows 'Due Today' and is NOT overdue.
 * 4. A task due today with a past time IS overdue.
 * 5. Date-only strings ("YYYY-MM-DD") are ALWAYS parsed as local dates using
 *    new Date(y, m-1, d, 23, 59, 59, 999) and are overdue only after the end of that day.
 * 6. Tasks with a past date (or relative 'Yesterday') are overdue.
 */
export function isTaskOverdue(task: GlobalTaskItem, referenceNow = new Date()): boolean {
  if (task.status === 'Completed') return false;

  const now = referenceNow.getTime();

  // 1. Explicit dueDate (e.g. '2026-09-18' or '2026-09-19T17:00:00')
  if (task.dueDate) {
    // If dueDate has ISO time component (contains 'T')
    if (task.dueDate.includes('T')) {
      const parsed = new Date(task.dueDate).getTime();
      if (!isNaN(parsed)) {
        return parsed < now;
      }
    }

    // Date-only string: parse locally into numeric parts (never new Date("YYYY-MM-DD"))
    const parts = parseDateParts(task.dueDate);
    if (parts) {
      const timeParsed = task.dueTime ? parseTimeString(task.dueTime) : null;
      if (timeParsed) {
        const dueDateTime = new Date(
          parts.year,
          parts.month,
          parts.day,
          timeParsed.hours,
          timeParsed.minutes,
          0,
          0,
        ).getTime();
        return dueDateTime < now;
      }

      // Date-only with no time: local end of day (23:59:59.999)
      const endOfDay = new Date(parts.year, parts.month, parts.day, 23, 59, 59, 999).getTime();
      return endOfDay < now;
    }
  }

  // 2. Relative due labels ('Today', 'Yesterday', 'Tomorrow')
  const dueLower = task.due?.toLowerCase()?.trim();
  if (dueLower === 'yesterday') {
    return true;
  }

  if (dueLower === 'today') {
    if (task.dueTime) {
      const timeParsed = parseTimeString(task.dueTime);
      if (timeParsed) {
        const dueToday = new Date(
          referenceNow.getFullYear(),
          referenceNow.getMonth(),
          referenceNow.getDate(),
          timeParsed.hours,
          timeParsed.minutes,
          0,
          0,
        ).getTime();
        return dueToday < now;
      }
    }
    // Today with no time: not overdue until after end of day
    return false;
  }

  if (dueLower === 'tomorrow') {
    return false;
  }

  // Fallback to explicit overdue boolean if present
  if (typeof task.overdue === 'boolean') {
    return task.overdue;
  }

  return false;
}

/**
 * Single predicate used identically across:
 * 1. Today tab visible filter
 * 2. Drawer header badge count
 * 3. Right rail utility button badge count
 */
export function isDueTodayOrOverdue(task: GlobalTaskItem, referenceNow = new Date()): boolean {
  if (task.status === 'Completed') return false;
  return isTaskDueToday(task, referenceNow) || isTaskOverdue(task, referenceNow);
}

/**
 * Single selector for the My Tasks count badge across right rail, panel header, and loading states.
 * Rule: Count of non-completed tasks that are due today or overdue.
 * This precisely equals the count of visible items in the default Today tab.
 */
export function getTaskBadgeCount(tasks: GlobalTaskItem[], referenceNow = new Date()): number {
  return tasks.filter((t) => isDueTodayOrOverdue(t, referenceNow)).length;
}

/**
 * Formats due presentation label avoiding conflicting 'Overdue' and 'Due Today' labels.
 */
export function formatTaskDueLabel(
  task: GlobalTaskItem,
  referenceNow = new Date(),
): { isOverdue: boolean; label: string } {
  const isOverdue = isTaskOverdue(task, referenceNow);
  const dueLower = task.due?.toLowerCase()?.trim();

  if (isOverdue) {
    if (dueLower === 'today') {
      const label = task.dueTime ? `Due ${task.dueTime}` : 'Due earlier today';
      return { isOverdue: true, label };
    }
    const dueTimePart = task.dueTime ? `${task.due} • ${task.dueTime}` : task.due;
    return { isOverdue: true, label: `Due ${dueTimePart}` };
  }

  const dueTimePart = task.dueTime ? `${task.due} • ${task.dueTime}` : task.due;
  return { isOverdue: false, label: `Due ${dueTimePart}` };
}
