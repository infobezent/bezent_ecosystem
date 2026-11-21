import type { ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Inline,
  Section,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeProfile } from '../api/employeesApi';
import type { EditableSectionType } from './ProfileSectionInlineForms';
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
  onEditSection?: (section: EditableSectionType) => void;
  onReload?: () => void;
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
  onEditSection,
  onReload,
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

  return (
    <Stack gap="lg">
      {/* Hero Identity Header Card matching approved Workforce UI */}
      <div className="bezent-profile-header-card">
        <div className="bezent-profile-identity-row">
          <div className="bezent-profile-identity-left">
            <IconButton
              label="Back to Employees"
              variant="ghost"
              onClick={onBack}
              aria-label="Back to Employees"
            >
              <BezentIcon name="arrowLeft" size={20} />
            </IconButton>

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

      {activeTab === 'overview' ? (
        <ProfileOverview employee={employee} onOpenEmployee={onOpenEmployee} />
      ) : (
        <>
          {/* 1. Personal Details */}
          <div id="sec-personal">
            <CanonicalPersonalSection
              profile={profile}
              canEdit={canEdit}
              onEditSection={onEditSection}
              includeContact={false}
              onReload={onReload}
            />
          </div>

          {/* 2. Contact & Addresses */}
          <div id="sec-contact">
            <ContactSection
              profile={profile}
              canEdit={canEdit}
              onEditSection={onEditSection}
              includeEmergency={false}
              onReload={onReload}
            />
          </div>

          {/* 3. Employment Status & Terms */}
          <div id="sec-employment">
            <EmploymentSection employee={employee} onNavigateWorkflow={onNavigateWorkflow} />
          </div>

          {/* 4. Position & Placement */}
          <div id="sec-organization">
            <OrganizationSection
              employee={employee}
              onOpenEmployee={onOpenEmployee}
              onNavigateWorkflow={onNavigateWorkflow}
            />
          </div>

          {/* 5. Emergency Contacts */}
          <div id="sec-emergency">
            <EmergencyContactsSection
              contacts={profile.emergencyContacts}
              canEdit={canEdit}
              onEditSection={onEditSection}
              profile={profile}
              onReload={onReload}
            />
          </div>

          {/* 6. Salary & Bank Details */}
          <div id="sec-payroll">
            <PayrollSection
              profile={profile}
              canEdit={canEdit}
              onEditSection={onEditSection}
              onReload={onReload}
            />
          </div>

          {/* 7. Documents */}
          <div id="sec-documents">
            <DocumentsSection
              documents={documents}
              loading={documentsLoading}
              error={documentsError}
              onViewDocument={onViewDocument}
              onRetry={onRetryDocuments}
            />
          </div>

          {/* 8. Employment History */}
          <div id="sec-history">{history}</div>

          {/* 9. Accounts & System Access */}
          <div id="sec-accounts">
            <SystemAccountsSection employee={employee} />
          </div>

          {/* 10. Skills & Competencies */}
          <div id="sec-skills">
            <Section title="Skills & Competencies">
              <SkillsSection skills={profile.skills} onOpenEmployee={onOpenEmployee} />
            </Section>
          </div>

          {/* 11. Working Hours & Schedule */}
          <div id="sec-work">
            <WorkSection workSchedule={profile.workSchedule} />
          </div>
        </>
      )}
    </Stack>
  );
}
