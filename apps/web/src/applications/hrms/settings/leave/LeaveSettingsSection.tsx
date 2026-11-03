import { useState } from 'react';
import { Stack, Tabs, type TabItem } from '../../../../design-system/components';
import { useAuthorization } from '../../../../platform/auth';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { LeaveTypesTab } from './LeaveTypesTab';
import { LeavePoliciesTab } from './LeavePoliciesTab';
import { AccrualTab } from './AccrualTab';
import { RestrictionsTab } from './RestrictionsTab';
import { HolidaysTab } from './HolidaysTab';
import { ApprovalWorkflowTab } from './ApprovalWorkflowTab';

export type LeaveSettingsTabId =
  | 'general'
  | 'leave_types'
  | 'leave_policies'
  | 'accrual'
  | 'restrictions'
  | 'holidays'
  | 'approval_workflow';

const LEAVE_SETTINGS_TABS: Array<TabItem & { id: LeaveSettingsTabId }> = [
  { id: 'general', label: 'General Settings' },
  { id: 'leave_types', label: 'Leave Types' },
  { id: 'leave_policies', label: 'Leave Policies' },
  { id: 'accrual', label: 'Accrual & Carry Forward' },
  { id: 'restrictions', label: 'Restrictions' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'approval_workflow', label: 'Approval Workflow' },
];

const TAB_IDS = new Set<string>(LEAVE_SETTINGS_TABS.map((t) => t.id));

// The active tab lives in `?tab=` so a refresh or a shared link reopens it.
function readTabFromUrl(): LeaveSettingsTabId | null {
  if (typeof window === 'undefined') return null;
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab && TAB_IDS.has(tab) ? (tab as LeaveSettingsTabId) : null;
}

function writeTabToUrl(tab: LeaveSettingsTabId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(window.history.state, '', url);
}

export interface LeaveSettingsSectionProps {
  initialTab?: LeaveSettingsTabId;
}

export function LeaveSettingsSection({ initialTab = 'leave_policies' }: LeaveSettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<LeaveSettingsTabId>(
    () => readTabFromUrl() ?? initialTab,
  );
  // Tabs stay mounted once visited, so switching back is instant and keeps filters.
  const [visited, setVisited] = useState<Set<LeaveSettingsTabId>>(() => new Set([activeTab]));
  const { canAny } = useAuthorization();

  // Mirrors the API write guard on every /hrms/leave settings route.
  const canManage = canAny(['hrms.leave.settings_manage', 'hrms.leave.settings.manage']);

  const openTab = (id: string) => {
    if (!TAB_IDS.has(id)) return;
    const tab = id as LeaveSettingsTabId;
    setActiveTab(tab);
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    writeTabToUrl(tab);
  };

  const content: Record<LeaveSettingsTabId, JSX.Element> = {
    general: <GeneralSettingsTab canManage={canManage} />,
    leave_types: <LeaveTypesTab canManage={canManage} />,
    leave_policies: <LeavePoliciesTab canManage={canManage} />,
    accrual: <AccrualTab canManage={canManage} />,
    restrictions: <RestrictionsTab canManage={canManage} />,
    holidays: <HolidaysTab canManage={canManage} />,
    approval_workflow: <ApprovalWorkflowTab canManage={canManage} />,
  };

  return (
    <Stack gap="lg">
      <Tabs
        items={LEAVE_SETTINGS_TABS}
        activeId={activeTab}
        onChange={openTab}
        variant="underline"
      />
      {LEAVE_SETTINGS_TABS.filter((t) => visited.has(t.id)).map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== activeTab}>
          {content[t.id]}
        </div>
      ))}
    </Stack>
  );
}

export default LeaveSettingsSection;
