import type { ReactNode } from 'react';
import { Avatar, Badge, Button, Inline, Stack, Tabs } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeProfile } from '../api/employeesApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
  getAvatarColor,
  getEmployeeAvatarId,
  getInitials,
} from '../model/employeeModel';
import {
  AccountsSection,
  CanonicalPersonalSection,
  ContactSection,
  EmergencyContactsSection,
  EmploymentSection,
  OrganizationSection,
  PayrollSection,
  ProfileOverview,
  DocumentsSection,
  SystemAccountsSection,
  SkillsSection,
  WorkSection,
} from './ProfileSections';
import { MilestonesSection } from './MilestonesSection';

/**
 * 8 Canonical sections organized for the modern enterprise Employee Profile workspace:
 * 1. Personal
 * 2. Employment
 * 3. Organization
 * 4. Contact
 * 5. Payroll
 * 6. Documents
 * 7. Accounts
 * 8. History
 */
export const PROFILE_TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'organization', label: 'Organization' },
  { id: 'contact', label: 'Contact' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'documents', label: 'Documents' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'history', label: 'History' },
] as const;

export type ProfileTabId =
  (typeof PROFILE_TABS)[number]['id'] | 'overview' | 'emergency' | 'skills' | 'work' | 'milestones';

export function isProfileTab(value: string | null): value is ProfileTabId {
  if (!value) return false;
  return (
    PROFILE_TABS.some((tab) => tab.id === value) ||
    ['overview', 'emergency', 'skills', 'work', 'milestones'].includes(value)
  );
}

export interface EmployeeProfileViewProps {
  profile: EmployeeProfile;
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  onBack: () => void;
  onOpenEmployee: (employeeId: string) => void;
  onNavigateWorkflow?: (path: string) => void;
  /** Edit profile action callback (permission checked by caller) */
  onEditProfile?: () => void;
  canEdit?: boolean;
  /** Active or selected avatar ID */
  avatarId?: string;
  /** Optional callback fired when avatar edit/selection is clicked */
  onOpenAvatarPicker?: () => void;
  /** Documents tab state */
  documents?: Array<{
    id: string;
    documentName: string;
    category: string;
    status: string;
    expiryDate: string | null;
    updatedAt: string;
  }>;
  documentsLoading?: boolean;
  documentsError?: string | null;
  onViewDocument?: (id: string) => void;
  onRetryDocuments?: () => void;
  /** Employment history content (loaded separately from Employee Administration). */
  history: ReactNode;
}

/** Canonical Employee Profile View Mode: the employee's current HR record. */
export function EmployeeProfileView({
  profile,
  activeTab,
  onTabChange,
  onBack,
  onOpenEmployee,
  onNavigateWorkflow = () => {},
  onEditProfile,
  canEdit = false,
  avatarId,
  onOpenAvatarPicker,
  documents = [],
  documentsLoading = false,
  documentsError = null,
  onViewDocument = () => {},
  onRetryDocuments = () => {},
  history,
}: EmployeeProfileViewProps) {
  const { employee } = profile;
  const avatarColor = getAvatarColor(employee.id || employee.employeeNumber);
  const resolvedAvatarId = avatarId ?? getEmployeeAvatarId(employee.id || employee.employeeNumber);

  // Normalize legacy tab query parameter mappings
  const effectiveTab: ProfileTabId =
    activeTab === 'overview' ? 'personal' : activeTab === 'emergency' ? 'contact' : activeTab;

  return (
    <Stack gap="lg">
      {/* Top Breadcrumb & Action Toolbar */}
      <Inline justify="between" align="center">
        <Button
          variant="text"
          size="sm"
          leftIcon={<BezentIcon name="arrowLeft" size={14} />}
          onClick={onBack}
        >
          Employees
        </Button>

        <Inline gap="sm" align="center">
          {onOpenAvatarPicker && (
            <Button
              variant="secondary"
              size="md"
              leftIcon={<BezentIcon name="user" size={15} />}
              onClick={onOpenAvatarPicker}
            >
              Change Avatar
            </Button>
          )}

          {canEdit && onEditProfile && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="edit" size={15} />}
              onClick={onEditProfile}
            >
              Edit Profile
            </Button>
          )}
        </Inline>
      </Inline>

      {/* Hero Identity Header Card matching approved Workforce UI */}
      <div className="bezent-profile-header-card">
        <div className="bezent-profile-identity-row">
          <div className="bezent-profile-identity-left">
            {onOpenAvatarPicker ? (
              <button
                type="button"
                className="bezent-table-meta-title"
                onClick={onOpenAvatarPicker}
                aria-label={`Change avatar for ${employee.fullName}`}
                title="Click to change avatar"
              >
                <Avatar
                  avatarId={resolvedAvatarId}
                  initials={getInitials(employee.fullName)}
                  color={avatarColor}
                  size="lg"
                  alt={employee.fullName}
                />
              </button>
            ) : (
              <Avatar
                avatarId={resolvedAvatarId}
                initials={getInitials(employee.fullName)}
                color={avatarColor}
                size="lg"
                alt={employee.fullName}
              />
            )}
            <div className="bezent-profile-identity-titles">
              <h1 className="bezent-profile-name">{employee.fullName}</h1>
              <p className="bezent-profile-meta-line">
                <span>
                  {[employee.employeeNumber, employee.designationName].filter(Boolean).join(' · ')}
                </span>
                {employee.departmentName && <span> · {employee.departmentName}</span>}
              </p>
            </div>
          </div>

          <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="md">
            {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
          </Badge>
        </div>

        {/* Quick Identity KPIs */}
        <div className="bezent-profile-quick-kpis">
          <div className="bezent-profile-kpi-pill">
            <span className="bezent-profile-kpi-label">Date of Joining</span>
            <span className="bezent-profile-kpi-value">{formatDate(employee.joiningDate)}</span>
          </div>

          <div className="bezent-profile-kpi-pill">
            <span className="bezent-profile-kpi-label">Employment Type</span>
            <span className="bezent-profile-kpi-value">
              {employmentTypeLabel(employee.employmentType)}
            </span>
          </div>

          <div className="bezent-profile-kpi-pill">
            <span className="bezent-profile-kpi-label">Reporting Manager</span>
            <span className="bezent-profile-kpi-value">
              {employee.reportingManagerId && employee.reportingManagerName ? (
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => onOpenEmployee(employee.reportingManagerId!)}
                >
                  {employee.reportingManagerName}
                </Button>
              ) : (
                'Not assigned'
              )}
            </span>
          </div>

          <div className="bezent-profile-kpi-pill">
            <span className="bezent-profile-kpi-label">Work Location</span>
            <span className="bezent-profile-kpi-value">
              {employee.locationName || 'Headquarters'}
            </span>
          </div>
        </div>
      </div>

      {/* 8-Section Navigation Tabs */}
      <Tabs
        activeId={effectiveTab}
        onChange={(id) => onTabChange(id as ProfileTabId)}
        items={PROFILE_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
      />

      {/* Section Content Panels */}
      {activeTab === 'overview' && (
        <ProfileOverview employee={employee} onOpenEmployee={onOpenEmployee} />
      )}

      {effectiveTab === 'personal' && activeTab !== 'overview' && (
        <CanonicalPersonalSection profile={profile} />
      )}

      {effectiveTab === 'employment' && (
        <EmploymentSection employee={employee} onNavigateWorkflow={onNavigateWorkflow} />
      )}

      {effectiveTab === 'organization' && (
        <OrganizationSection
          employee={employee}
          onOpenEmployee={onOpenEmployee}
          onNavigateWorkflow={onNavigateWorkflow}
        />
      )}

      {effectiveTab === 'contact' && <ContactSection profile={profile} />}

      {effectiveTab === 'payroll' && <PayrollSection profile={profile} />}

      {effectiveTab === 'documents' && (
        <DocumentsSection
          documents={documents}
          loading={documentsLoading}
          error={documentsError}
          onViewDocument={onViewDocument}
          onRetry={onRetryDocuments}
        />
      )}

      {effectiveTab === 'accounts' && <SystemAccountsSection employee={employee} />}

      {effectiveTab === 'history' && history}

      {/* Deep Link Backward Compatibility Tabs */}
      {activeTab === 'accounts' && <AccountsSection bankAccount={profile.bankAccount} />}
      {activeTab === 'emergency' && (
        <EmergencyContactsSection contacts={profile.emergencyContacts} />
      )}
      {activeTab === 'skills' && (
        <SkillsSection skills={profile.skills} onOpenEmployee={onOpenEmployee} />
      )}
      {activeTab === 'work' && <WorkSection workSchedule={profile.workSchedule} />}
      {activeTab === 'milestones' && <MilestonesSection employeeId={employee.id} />}
    </Stack>
  );
}
