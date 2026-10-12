import { useState } from 'react';
import { Stack, Tabs, type TabItem } from '../../../../design-system/components';
import { GeneralTab } from './tabs/GeneralTab';
import { PoliciesTab } from './tabs/PoliciesTab';
import { RegularizationTab } from './tabs/RegularizationTab';
import { CaptureDevicesTab } from './tabs/CaptureDevicesTab';
import { LocationSecurityTab } from './tabs/LocationSecurityTab';
import { PayrollLockingTab } from './tabs/PayrollLockingTab';
import { AuditHistoryTab } from './tabs/AuditHistoryTab';

const SETTINGS_TABS: TabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'policies', label: 'Attendance Policies' },
  { id: 'regularization', label: 'Regularization' },
  { id: 'capture_devices', label: 'Capture & Devices' },
  { id: 'location_security', label: 'Location & Security' },
  { id: 'payroll_locking', label: 'Payroll & Locking' },
  { id: 'audit_history', label: 'Audit & History' },
];

export function AttendanceSettingsSection() {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <Stack gap="lg">
      <Tabs
        items={SETTINGS_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'policies' && <PoliciesTab />}
      {activeTab === 'regularization' && <RegularizationTab />}
      {activeTab === 'capture_devices' && <CaptureDevicesTab />}
      {activeTab === 'location_security' && <LocationSecurityTab />}
      {activeTab === 'payroll_locking' && <PayrollLockingTab />}
      {activeTab === 'audit_history' && <AuditHistoryTab />}
    </Stack>
  );
}
