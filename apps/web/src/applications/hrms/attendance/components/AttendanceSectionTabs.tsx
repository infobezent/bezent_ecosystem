import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, type TabItem } from '../../../../design-system/components';

export type AttendanceSectionGroup = 'records' | 'requests';

export interface AttendanceSectionTab extends TabItem {
  path: string;
}

export const RECORDS_TABS: AttendanceSectionTab[] = [
  { id: 'daily-log', label: 'Daily', path: '/hrms/attendance/daily-log' },
  { id: 'monthly-summary', label: 'Monthly', path: '/hrms/attendance/monthly-summary' },
  { id: 'punch-logs', label: 'Punch Logs', path: '/hrms/attendance/punch-logs' },
];

export const REQUESTS_TABS: AttendanceSectionTab[] = [
  { id: 'regularization', label: 'Regularization', path: '/hrms/attendance/regularization' },
  { id: 'on-duty', label: 'On-Duty', path: '/hrms/attendance/on-duty' },
  { id: 'overtime', label: 'Overtime', path: '/hrms/attendance/overtime' },
  { id: 'comp-off', label: 'Comp-Off', path: '/hrms/attendance/comp-off' },
];

export const TABS_BY_GROUP: Record<AttendanceSectionGroup, AttendanceSectionTab[]> = {
  records: RECORDS_TABS,
  requests: REQUESTS_TABS,
};

export interface AttendanceSectionTabsProps {
  group: AttendanceSectionGroup;
}

/**
 * Tab strip for the "Attendance" (records) and "Requests" grouped nav hubs.
 * The URL is the only tab state — each tab is a link to its existing page
 * route, so bookmarks, notification links and back/forward keep working.
 */
export function AttendanceSectionTabs({ group }: AttendanceSectionTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = TABS_BY_GROUP[group];
  const normalizedPath = location.pathname.replace(/\/+$/, '');
  const activeTab = tabs.find((tab) => tab.path === normalizedPath);

  return (
    <Tabs
      items={tabs}
      activeId={activeTab?.id}
      onChange={(id) => {
        const tab = tabs.find((t) => t.id === id);
        if (tab) navigate(tab.path);
      }}
    />
  );
}

export default AttendanceSectionTabs;
