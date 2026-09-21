import { useState } from 'react';
import type { ApprovalItem } from '../../platform/approvals';
import type { CalendarEvent } from '../../platform/calendar';
import type { NoteDraft, NoteItem } from '../../platform/notes';
import type { NotificationItem } from '../../platform/notifications';
import type { GlobalTaskItem } from '../../platform/tasks';

/**
 * DEVELOPMENT-ONLY utility data and state, used to verify the global
 * utility UIs. Everything here is obviously fake and generic — no real
 * HRMS/CRM/PM entities — and must never be imported by production code.
 * Real data will arrive through providers/contracts supplied by the
 * applications (and, later, a backend); delete this file then.
 */

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Sample request needs your review',
    description: '3 sample items were submitted.',
    sourceLabel: 'Sample Source A',
    icon: 'requests',
    timeLabel: '5 min ago',
    read: false,
    group: 'today',
    tabs: ['action'],
    actionLabel: 'Review',
  },
  {
    id: 'n2',
    title: 'Sample feedback pending',
    description: 'Sample Person One',
    sourceLabel: 'Sample Source B',
    icon: 'recruitment',
    timeLabel: '18 min ago',
    read: false,
    group: 'today',
    tabs: ['action'],
    actionLabel: 'Open',
  },
  {
    id: 'n3',
    title: 'Sample Person Two mentioned you in Item #DEV-1024',
    sourceLabel: 'Sample Source A',
    icon: 'notes',
    timeLabel: '1 hr ago',
    read: false,
    group: 'today',
    tabs: ['mention'],
    actionLabel: 'View',
  },
  {
    id: 'n4',
    title: '2 sample documents need verification',
    sourceLabel: 'Sample Source C',
    icon: 'documents',
    timeLabel: '4 hrs ago',
    read: true,
    group: 'earlier',
    tabs: [],
    actionLabel: 'Open',
  },
];

const APPROVALS: ApprovalItem[] = [
  {
    id: 'ap1',
    requester: 'Sample Person One',
    requestType: 'Sample Request Type A',
    icon: 'requests',
    summary: 'Sample summary • 2 items',
    submitted: '20 min ago',
    priority: 'Normal',
    status: 'Pending',
  },
  {
    id: 'ap2',
    requester: 'Sample Person Two',
    requestType: 'Sample Request Type B',
    icon: 'attendance',
    summary: 'Sample summary • Urgent',
    submitted: '1 hr ago',
    priority: 'Urgent',
    status: 'Pending',
  },
  {
    id: 'ap3',
    requester: 'Sample Person Three',
    requestType: 'Sample Request Type C',
    icon: 'documents',
    summary: 'Sample summary • Approved',
    submitted: 'Yesterday',
    priority: 'Normal',
    status: 'Approved',
  },
];

const TASKS: GlobalTaskItem[] = [
  {
    id: 'tk1',
    title: 'Verify sample documents',
    relatedTo: 'Sample Person One • Sample Area',
    icon: 'documents',
    priority: 'High',
    due: 'Today',
    dueTime: '5:00 PM',
    status: 'In Progress',
  },
  {
    id: 'tk2',
    title: 'Prepare sample report',
    relatedTo: 'Sample Report Alpha',
    icon: 'reports',
    priority: 'Medium',
    due: 'Today',
    dueTime: '11:00 AM',
    status: 'Open',
  },
  {
    id: 'tk3',
    title: 'Complete sample workflow step',
    relatedTo: 'Sample Person Two • Sample Area',
    icon: 'requests',
    priority: 'Low',
    due: 'Today',
    status: 'Open',
    requiresWorkflow: true,
  },
  {
    id: 'tk4',
    title: 'Schedule sample follow-up',
    relatedTo: 'Sample Person Three',
    icon: 'calendar',
    priority: 'Medium',
    due: 'Tomorrow',
    status: 'Open',
  },
  {
    id: 'tk5',
    title: 'Archive sample records',
    relatedTo: 'Sample Area',
    icon: 'assets',
    priority: 'Low',
    due: 'Yesterday',
    status: 'Completed',
  },
];

const EVENTS: CalendarEvent[] = [
  {
    id: 'ce1',
    title: 'Sample Interview',
    date: isoDay(0),
    time: '09:30 AM',
    endTime: '10:30 AM',
    person: 'Sample Person One • Sample Role',
    category: 'Interview',
    sourceLabel: 'Sample Source B',
    icon: 'recruitment',
    tone: 'accent',
    description: 'Development-only sample event.',
  },
  {
    id: 'ce2',
    title: 'Sample Onboarding Session',
    date: isoDay(0),
    time: '11:00 AM',
    endTime: '12:00 PM',
    person: 'Sample Person Two',
    category: 'Onboarding',
    sourceLabel: 'Sample Source A',
    icon: 'onboarding',
    tone: 'success',
  },
  {
    id: 'ce3',
    title: 'Sample Review Meeting',
    date: isoDay(0),
    time: '02:00 PM',
    endTime: '03:00 PM',
    location: 'Meeting Room 2',
    category: 'Meeting',
    sourceLabel: 'Sample Source C',
    icon: 'calendar',
    tone: 'neutral',
    participants: ['Sample Person One', 'Sample Person Three'],
  },
  {
    id: 'ce4',
    title: 'Sample Deadline',
    date: isoDay(1),
    time: '04:30 PM',
    category: 'Deadline',
    sourceLabel: 'Sample Source A',
    icon: 'reports',
    tone: 'warning',
  },
];

const NOTES: NoteItem[] = [
  {
    id: 'nt1',
    title: 'Sample note one',
    content: 'Development-only sample text. Follow up on the sample item before Friday.',
    updatedLabel: 'Today • 10:45 AM',
    recency: 'today',
    pinned: true,
    relatedTo: 'Sample Person One',
  },
  {
    id: 'nt2',
    title: 'Sample note two',
    content: 'Another sample note with a bit more text so the two-line clamp shows up in the card.',
    updatedLabel: 'Today • 9:30 AM',
    recency: 'today',
    pinned: false,
  },
  {
    id: 'nt3',
    title: 'Sample note three',
    content: 'Older sample note.',
    updatedLabel: 'Yesterday',
    recency: 'earlier',
    pinned: false,
  },
];

/** Dev-only state + handlers standing in for real providers. */
export function useDevUtilityData() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [tasks, setTasks] = useState(TASKS);
  const [notes, setNotes] = useState(NOTES);

  return {
    notifications,
    approvals: APPROVALS,
    tasks,
    events: EVENTS,
    notes,
    markNotificationRead: (id: string) =>
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllNotificationsRead: () =>
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    completeTask: (id: string) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Completed', overdue: false } : t)),
      ),
    saveNote: (id: string | null, draft: NoteDraft) =>
      setNotes((prev) =>
        id
          ? prev.map((n) =>
              n.id === id ? { ...n, ...draft, updatedLabel: 'Today • now', recency: 'today' } : n,
            )
          : [
              {
                id: `nt-${Date.now()}`,
                ...draft,
                updatedLabel: 'Today • now',
                recency: 'today',
                pinned: false,
              },
              ...prev,
            ],
      ),
    deleteNote: (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id)),
    toggleNotePin: (id: string) =>
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))),
  };
}
