import { useState } from 'react';
import { Stack, Tabs, type TabItem } from '../../../../design-system/components';
import { useAuthorization } from '../../../../platform/auth';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { LeaveTypesTab } from './LeaveTypesTab';
import { LeavePoliciesTab } from './LeavePoliciesTab';

const LEAVE_SETTINGS_TABS: TabItem[] = [
  { id: 'general', label: 'General Settings' },
  { id: 'leave_types', label: 'Leave Types' },
  { id: 'leave_policies', label: 'Leave Policies' },
];

export interface LeaveSettingsSectionProps {
  initialTab?: 'general' | 'leave_types' | 'leave_policies';
}

export function LeaveSettingsSection({ initialTab = 'leave_policies' }: LeaveSettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const { canAny } = useAuthorization();

  // Mirrors the API write guard on /hrms/leave/{settings,types,policies}.
  const canManage = canAny(['hrms.leave.settings_manage', 'hrms.leave.settings.manage']);

  return (
    <Stack gap="lg">
      <Tabs
        items={LEAVE_SETTINGS_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {activeTab === 'general' ? (
        <GeneralSettingsTab canManage={canManage} />
      ) : activeTab === 'leave_types' ? (
        <LeaveTypesTab canManage={canManage} />
      ) : (
        <LeavePoliciesTab canManage={canManage} />
      )}
    </Stack>
  );
}

export default LeaveSettingsSection;
