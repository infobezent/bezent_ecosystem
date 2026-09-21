import { describe, expect, it } from 'vitest';
import type { GlobalTaskItem } from './types';
import {
  formatTaskDueLabel,
  getTaskBadgeCount,
  isDueTodayOrOverdue,
  isTaskDueToday,
  isTaskOverdue,
  parseTimeString,
} from './taskUtils';

describe('parseTimeString', () => {
  it('parses 12-hour AM/PM formats', () => {
    expect(parseTimeString('5:00 PM')).toEqual({ hours: 17, minutes: 0 });
    expect(parseTimeString('09:30 AM')).toEqual({ hours: 9, minutes: 30 });
    expect(parseTimeString('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
    expect(parseTimeString('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
  });

  it('parses 24-hour formats', () => {
    expect(parseTimeString('17:45')).toEqual({ hours: 17, minutes: 45 });
    expect(parseTimeString('08:15')).toEqual({ hours: 8, minutes: 15 });
  });
});

describe('isTaskOverdue & task acceptance rules (BZ-01)', () => {
  // Reference time: 2026-09-19 at 14:00:00 (2:00 PM)
  const now = new Date(2026, 8, 19, 14, 0, 0);

  const baseTask: GlobalTaskItem = {
    id: 'test-1',
    title: 'Test Task',
    relatedTo: 'Test Related',
    icon: 'tasks',
    priority: 'Medium',
    due: 'Today',
    status: 'Open',
  };

  it('identifies past date as overdue', () => {
    const pastTask: GlobalTaskItem = {
      ...baseTask,
      due: '18 Sep',
      dueDate: '2026-09-18',
    };
    expect(isTaskOverdue(pastTask, now)).toBe(true);

    const yesterdayTask: GlobalTaskItem = {
      ...baseTask,
      due: 'Yesterday',
    };
    expect(isTaskOverdue(yesterdayTask, now)).toBe(true);
  });

  it('identifies task due today with future time as NOT overdue (shows Due Today)', () => {
    const futureTimeTask: GlobalTaskItem = {
      ...baseTask,
      due: 'Today',
      dueDate: '2026-09-19',
      dueTime: '5:00 PM', // 17:00 > 14:00
    };
    expect(isTaskOverdue(futureTimeTask, now)).toBe(false);
    expect(isTaskDueToday(futureTimeTask, now)).toBe(true);

    const presentation = formatTaskDueLabel(futureTimeTask, now);
    expect(presentation.isOverdue).toBe(false);
    expect(presentation.label).toBe('Due Today • 5:00 PM');
  });

  it('identifies task due today with past time as overdue', () => {
    const pastTimeTask: GlobalTaskItem = {
      ...baseTask,
      due: 'Today',
      dueDate: '2026-09-19',
      dueTime: '11:00 AM', // 11:00 < 14:00
    };
    expect(isTaskOverdue(pastTimeTask, now)).toBe(true);

    const presentation = formatTaskDueLabel(pastTimeTask, now);
    expect(presentation.isOverdue).toBe(true);
    // Crucial rule: must not say "Due Today" when overdue
    expect(presentation.label).not.toContain('Due Today');
    expect(presentation.label).toBe('Due 11:00 AM');
  });

  it('identifies task due today with no time as NOT overdue before end of day', () => {
    const noTimeTask: GlobalTaskItem = {
      ...baseTask,
      due: 'Today',
      dueDate: '2026-09-19',
    };
    expect(isTaskOverdue(noTimeTask, now)).toBe(false);

    // After end of day (e.g. next morning 2026-09-20 at 08:00)
    const nextDay = new Date(2026, 8, 20, 8, 0, 0);
    expect(isTaskOverdue(noTimeTask, nextDay)).toBe(true);
  });

  it('never treats completed tasks as overdue', () => {
    const completedTask: GlobalTaskItem = {
      ...baseTask,
      due: 'Yesterday',
      dueDate: '2026-09-18',
      status: 'Completed',
    };
    expect(isTaskOverdue(completedTask, now)).toBe(false);
  });
});

describe('Timezone safety for date-only strings (local calendar day)', () => {
  const dateOnlyToday: GlobalTaskItem = {
    id: 'tz-today',
    title: 'Date-only task',
    relatedTo: 'Area',
    icon: 'tasks',
    priority: 'Medium',
    due: '19 Sep',
    dueDate: '2026-09-19',
    status: 'Open',
  };

  const dateOnlyYesterday: GlobalTaskItem = {
    id: 'tz-yesterday',
    title: 'Yesterday task',
    relatedTo: 'Area',
    icon: 'tasks',
    priority: 'Medium',
    due: '18 Sep',
    dueDate: '2026-09-18',
    status: 'Open',
  };

  it('evaluates date-only today as NOT overdue at 00:30 local', () => {
    const earlyMorning = new Date(2026, 8, 19, 0, 30, 0);
    expect(isTaskOverdue(dateOnlyToday, earlyMorning)).toBe(false);
    expect(isTaskDueToday(dateOnlyToday, earlyMorning)).toBe(true);
    expect(isDueTodayOrOverdue(dateOnlyToday, earlyMorning)).toBe(true);
  });

  it('evaluates date-only today as NOT overdue at 23:30 local', () => {
    const lateNight = new Date(2026, 8, 19, 23, 30, 0);
    expect(isTaskOverdue(dateOnlyToday, lateNight)).toBe(false);
    expect(isTaskDueToday(dateOnlyToday, lateNight)).toBe(true);
    expect(isDueTodayOrOverdue(dateOnlyToday, lateNight)).toBe(true);
  });

  it('evaluates date-only yesterday as overdue', () => {
    const earlyMorning = new Date(2026, 8, 19, 0, 30, 0);
    expect(isTaskOverdue(dateOnlyYesterday, earlyMorning)).toBe(true);
    expect(isDueTodayOrOverdue(dateOnlyYesterday, earlyMorning)).toBe(true);
  });
});

describe('Single predicate isDueTodayOrOverdue & completion sync (BZ-02)', () => {
  const now = new Date(2026, 8, 19, 14, 0, 0);

  const mixedTasks: GlobalTaskItem[] = [
    {
      id: 'tk1',
      title: 'Task 1',
      relatedTo: 'Area',
      icon: 'tasks',
      priority: 'High',
      due: 'Today',
      dueTime: '5:00 PM',
      status: 'In Progress',
    },
    {
      id: 'tk2',
      title: 'Task 2',
      relatedTo: 'Area',
      icon: 'reports',
      priority: 'Medium',
      due: 'Today',
      dueTime: '11:00 AM',
      status: 'Open',
    },
    {
      id: 'tk3',
      title: 'Task 3',
      relatedTo: 'Area',
      icon: 'requests',
      priority: 'Low',
      due: 'Today',
      status: 'Open',
    },
    {
      id: 'tk4',
      title: 'Task 4',
      relatedTo: 'Area',
      icon: 'calendar',
      priority: 'Medium',
      due: 'Tomorrow',
      status: 'Open',
    },
    {
      id: 'tk5',
      title: 'Task 5',
      relatedTo: 'Area',
      icon: 'assets',
      priority: 'Low',
      due: 'Yesterday',
      status: 'Completed',
    },
  ];

  it('guarantees badge count equals Today tab visible rows using the single predicate', () => {
    // Both Today tab filter and badge selector call isDueTodayOrOverdue
    const todayTabVisibleRows = mixedTasks.filter((t) => isDueTodayOrOverdue(t, now));
    const badgeCount = getTaskBadgeCount(mixedTasks, now);

    expect(todayTabVisibleRows.length).toBe(3);
    expect(badgeCount).toBe(todayTabVisibleRows.length);
  });

  it('ensures completing one task causes both Today tab rows and badge count to drop by 1', () => {
    // Complete tk2
    const updatedTasks = mixedTasks.map((t) =>
      t.id === 'tk2' ? { ...t, status: 'Completed' as const } : t,
    );

    const todayTabVisibleRows = updatedTasks.filter((t) => isDueTodayOrOverdue(t, now));
    const badgeCount = getTaskBadgeCount(updatedTasks, now);

    expect(todayTabVisibleRows.length).toBe(2);
    expect(badgeCount).toBe(2);
    expect(badgeCount).toBe(todayTabVisibleRows.length);
  });
});
