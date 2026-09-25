import type { ReactNode } from 'react';
import { Badge, Button, PageHeader, Stack, Tabs } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeProfile } from '../api/employeesApi';
import { EMPLOYMENT_STATUS_LABELS, employmentStatusVariant } from '../model/employeeModel';
import {
  AccountsSection,
  EmergencyContactsSection,
  PersonalSection,
  ProfileOverview,
  SkillsSection,
  WorkSection,
} from './ProfileSections';

/**
 * Profile tabs — one per implemented employee-record domain. Onboarding tasks
 * and the registration Review step are deliberately not profile sections.
 */
export const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'personal', label: 'Personal' },
  { id: 'emergency', label: 'Emergency Contacts' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Work' },
  { id: 'history', label: 'History' },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

export function isProfileTab(value: string | null): value is ProfileTabId {
  return PROFILE_TABS.some((tab) => tab.id === value);
}

export interface EmployeeProfileViewProps {
  profile: EmployeeProfile;
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  onBack: () => void;
  onOpenEmployee: (employeeId: string) => void;
  /** Employment history content (loaded separately from Employee Administration). */
  history: ReactNode;
}

/** Canonical, read-only Employee Profile: the employee's current HR record. */
export function EmployeeProfileView({
  profile,
  activeTab,
  onTabChange,
  onBack,
  onOpenEmployee,
  history,
}: EmployeeProfileViewProps) {
  const { employee } = profile;
  const subtitle = [employee.employeeNumber, employee.designationName].filter(Boolean).join(' · ');

  return (
    <Stack gap="lg">
      <PageHeader
        breadcrumbs={
          <Button
            variant="text"
            size="sm"
            leftIcon={<BezentIcon name="arrowLeft" size={14} />}
            onClick={onBack}
          >
            Employees
          </Button>
        }
        title={employee.fullName}
        subtitle={subtitle}
        badge={
          <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
            {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
          </Badge>
        }
      />

      <Tabs
        activeId={activeTab}
        onChange={(id) => onTabChange(id as ProfileTabId)}
        items={PROFILE_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
      />

      {activeTab === 'overview' && (
        <ProfileOverview employee={employee} onOpenEmployee={onOpenEmployee} />
      )}
      {activeTab === 'personal' && <PersonalSection profile={profile} />}
      {activeTab === 'emergency' && (
        <EmergencyContactsSection contacts={profile.emergencyContacts} />
      )}
      {activeTab === 'accounts' && <AccountsSection bankAccount={profile.bankAccount} />}
      {activeTab === 'skills' && (
        <SkillsSection skills={profile.skills} onOpenEmployee={onOpenEmployee} />
      )}
      {activeTab === 'work' && <WorkSection workSchedule={profile.workSchedule} />}
      {activeTab === 'history' && history}
    </Stack>
  );
}
