import { useState } from 'react';
import {
  Button,
  Card,
  CardTitle,
  CardDescription,
  Input,
  Select,
  Tabs,
  Toolbar,
  Actions,
  Stack,
  Inline,
  FormGrid,
  FormField,
  FormSection,
  Modal,
  Alert,
  Page,
  PageHeader,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { PersonalInformation } from './PersonalInformation';
import { OnboardingSection } from './OnboardingSection';
import { SkillsSection } from './SkillsSection';
import { EmergencyContactSection } from './EmergencyContactSection';
import { AccountsSection } from './AccountsSection';
import { OnlineAccessSection } from './OnlineAccessSection';
import { WorkingHoursSection } from './WorkingHoursSection';
import {
  DocumentsSection,
  INITIAL_DOCUMENTS,
  DocumentItemState,
  PassportPhotoState,
} from './DocumentsSection';
import { ReviewSection, ReviewSectionData } from './ReviewSection';
import { DraftsModal, EmployeeRegistrationDraft } from './DraftsModal';

export type RegistrationSectionId = string;

export interface RegistrationSection {
  id: RegistrationSectionId;
  label: string;
}

export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [
  { id: 'general', label: 'General' },
  { id: 'personal', label: 'Personal Information' },
  { id: 'onboarding', label: 'Administration' },
  { id: 'skills', label: 'Skills' },
  { id: 'emergency', label: 'Emergency Contact' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'online_access', label: 'Online Access' },
  { id: 'working_hours', label: 'Working Hours' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
];

interface EmployeeRegistrationProps {
  isOpen?: boolean;
  onCancel: () => void;
  onSave?: (data: Record<string, unknown>) => void;
  initialDraft?: EmployeeRegistrationDraft | null;
}

import { useCustomFields } from '../../settings/context/CustomFieldsContext';
import type { OnboardingCardConfig } from '../../settings/types/settingsCenter';

export function EmployeeRegistration({
  isOpen = true,
  onCancel,
  onSave,
  initialDraft,
}: EmployeeRegistrationProps) {
  let allSections: Array<{ id: string; label: string }> = [...REGISTRATION_SECTIONS];
  let customFields: Array<{
    id: string;
    sectionId: string;
    cardId: string;
    label: string;
    fieldType: string;
    required?: boolean;
    readOnly?: boolean;
    defaultValue?: string;
    options?: string[];
  }> = [];
  let customCards: OnboardingCardConfig[] = [];
  try {
    const customCtx = useCustomFields();
    customFields = customCtx.fields;
    customCards = customCtx.cards;
    if (customCtx.sections && customCtx.sections.length > 0) {
      allSections = customCtx.sections
        .filter((s) => !s.hidden)
        .map((s) => ({ id: s.id, label: s.title }));
    }
  } catch {
    // fallback if outside context
  }
  const [activeSection, setActiveSection] = useState<RegistrationSectionId>(
    initialDraft ? initialDraft.activeSection : 'general',
  );

  // General Form State
  const [employeeId, setEmployeeId] = useState(initialDraft?.employeeId || 'EMP2026001');

  // Employment Type
  const [employmentType, setEmploymentType] = useState('full_time');

  // Employment Status
  const [employmentStatus, setEmploymentStatus] = useState('pending_activation');

  // Department
  const [department, setDepartment] = useState('Engineering');

  // Team
  const [team, setTeam] = useState('Product Development');

  // Designation
  const [designation, setDesignation] = useState('Software Engineer');

  // Grade / Level
  const [gradeLevel, setGradeLevel] = useState('L2 - Mid Level');

  // Reporting Manager
  const [reportingManager] = useState<string | null>('Rakesh Kumar');

  // Organisation Unit
  const [organisationUnit, setOrganisationUnit] = useState('Technology');

  // Office Location
  const [officeLocation, setOfficeLocation] = useState('Chennai - Main Office');

  // Dates
  const [joiningDate, setJoiningDate] = useState('2026-04-01');
  const [confirmedJoiningDate, setConfirmedJoiningDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('');

  // Source of Hire
  const [sourceOfHire, setSourceOfHire] = useState('direct_applicant');

  // Probation Period
  const [probationPeriod, setProbationPeriod] = useState('6_months');

  // Notice Period
  const [noticePeriod, setNoticePeriod] = useState('30_days');

  // Document Section State
  const [documentsList, setDocumentsList] = useState<DocumentItemState[]>(
    initialDraft?.reviewData?.documents?.items || INITIAL_DOCUMENTS,
  );
  const [isExperiencedHire, setIsExperiencedHire] = useState(
    initialDraft?.reviewData?.documents?.isExperiencedHire !== undefined
      ? initialDraft.reviewData.documents.isExperiencedHire
      : true,
  );
  const [passportPhoto, setPassportPhoto] = useState<PassportPhotoState>(
    initialDraft?.reviewData?.documents?.passportPhoto
      ? { file: null, ...initialDraft.reviewData.documents.passportPhoto }
      : {
          file: null,
          fileName: 'Passport_Photo.png',
          previewUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          status: 'Verified',
        },
  );

  // Repeatable lists state for Personal, Onboarding, Skills, Emergency
  const [familyMembers, setFamilyMembers] = useState([
    {
      id: 'fam-1',
      name: 'Sunita Kumar',
      relationship: 'Spouse',
      dob: '1996-08-14',
      dependent: true,
    },
    { id: 'fam-2', name: 'Aarav Kumar', relationship: 'Child', dob: '2023-01-10', dependent: true },
  ]);

  const [nominationDetails, setNominationDetails] = useState([
    {
      id: 'nom-1',
      nomineeName: 'Sunita Kumar',
      relationship: 'Spouse',
      percentage: 100,
      isMinor: false,
    },
  ]);

  const [onboardingTasks, setOnboardingTasks] = useState([
    {
      id: 'tsk-1',
      taskDescription: 'Submit signed NDA & Confidentiality Agreement',
      assignedTo: 'Arun Kumar',
      dueDate: '2026-04-02',
      status: 'Completed',
    },
    {
      id: 'tsk-2',
      taskDescription: 'Complete IT & Security Orientation Module',
      assignedTo: 'Arun Kumar',
      dueDate: '2026-04-05',
      status: 'Pending',
    },
    {
      id: 'tsk-3',
      taskDescription: 'Collect Work Laptop & Security Keycard',
      assignedTo: 'IT Admin (Ramesh P)',
      dueDate: '2026-04-01',
      status: 'In Progress',
    },
  ]);

  const [assignedAssets, setAssignedAssets] = useState([
    {
      id: 'ast-1',
      assetName: 'MacBook Pro 16" M3 Max',
      category: 'Laptop',
      serialNumber: 'MBP-2026-9901',
      issueDate: '2026-04-01',
      quantity: 1,
    },
    {
      id: 'ast-2',
      assetName: 'YubiKey 5C NFC Security Key',
      category: 'Security Token',
      serialNumber: 'YK-88912',
      issueDate: '2026-04-01',
      quantity: 1,
    },
  ]);

  const [skillsList, setSkillsList] = useState([
    {
      id: 'skl-1',
      skill: 'TypeScript / React Framework',
      skillType: 'Technical',
      levelType: 'Advanced',
      level: 'Level 4',
      levelDate: '2025-11-20',
      yearsExperience: 4,
      examiner: 'Karthik V (Tech Lead)',
      verifiedBy: 'Priya S (HR)',
      mentor: 'Rakesh Kumar',
    },
    {
      id: 'skl-2',
      skill: 'Node.js & Microservices Architecture',
      skillType: 'Backend',
      levelType: 'Intermediate',
      level: 'Level 3',
      levelDate: '2025-09-15',
      yearsExperience: 3,
      examiner: 'Karthik V (Tech Lead)',
      verifiedBy: 'Priya S (HR)',
      mentor: 'Rakesh Kumar',
    },
  ]);

  const [secondaryContact, setSecondaryContact] = useState<{
    name: string;
    relationship: string;
    phone: string;
    altPhone: string;
    email: string;
    address: string;
  } | null>({
    name: 'Rajesh Kumar',
    relationship: 'Brother',
    phone: '+91 98765 43211',
    altPhone: '',
    email: 'rajesh.k@gmail.com',
    address: 'Block B, Green Acres, Chennai',
  });

  // Deletion Handlers for Repeatable Items
  const handleDeleteFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteNominee = (id: string) => {
    setNominationDetails((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteTask = (id: string) => {
    setOnboardingTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteAsset = (id: string) => {
    setAssignedAssets((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteSkill = (id: string) => {
    setSkillsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteSecondaryContact = () => {
    setSecondaryContact(null);
  };

  const handleDeleteDocument = (id: string) => {
    setDocumentsList((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              file: null,
              fileName: '',
              filePreviewUrl: '',
              docNumber: '',
              status: 'Pending' as const,
            }
          : doc,
      ),
    );
  };

  // Consolidated Data Object for Review Section
  const reviewData: ReviewSectionData = {
    general: {
      employeeId,
      employmentType: employmentType.replace('_', ' ').toUpperCase(),
      employmentStatus: employmentStatus.replace('_', ' ').toUpperCase(),
      department,
      team,
      designation,
      gradeLevel,
      reportingManager,
      organisationUnit,
      officeLocation,
      joiningDate,
      confirmedJoiningDate,
      endDate,
      sourceOfHire: sourceOfHire.replace('_', ' ').toUpperCase(),
      probationPeriod: probationPeriod.replace('_', ' '),
      noticePeriod: noticePeriod.replace('_', ' '),
    },
    personal: {
      fullName: 'Arun Kumar',
      gender: 'Male',
      dob: '1995-05-18',
      maritalStatus: 'Married',
      nationality: 'Indian',
      bloodGroup: 'O+ Positive',
      differentlyAbled: 'No',
      aadhaarNumber: '5482 9102 3341',
      panNumber: 'ABCDE1234F',
      personalEmail: 'arun.kumar@gmail.com',
      mobilePhone: '+91 98765 43210',
      emergencyPhone: '+91 98765 43211',
      currentStreet: '123 Anna Salai, T. Nagar',
      currentCity: 'Chennai',
      currentState: 'Tamil Nadu',
      currentPin: '600017',
      currentCountry: 'India',
      permanentStreet: '123 Anna Salai, T. Nagar',
      permanentCity: 'Chennai',
      permanentState: 'Tamil Nadu',
      permanentPin: '600017',
      permanentCountry: 'India',
      familyMembers,
      nominationDetails,
    },
    onboarding: {
      tasks: onboardingTasks,
      assets: assignedAssets,
    },
    skills: skillsList,
    emergency: {
      primaryContact: {
        name: 'Sunita Kumar',
        relationship: 'Spouse',
        phone: '+91 98765 43210',
        altPhone: '+91 98765 43212',
        email: 'sunita.k@gmail.com',
        address: '123 Anna Salai, T. Nagar, Chennai',
      },
      secondaryContact,
    },
    accounts: {
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd',
      branchName: 'T. Nagar Branch',
      accountHolderName: 'Arun Kumar',
      accountNumber: '50100012345678',
      reEnterAccountNumber: '50100012345678',
      salaryStructure: 'Executive Tech Band (Grade L2)',
      payGrade: 'L2 - Senior Software Engineer',
      annualCtc: 1800000,
      monthlyBasic: 75000,
      hra: 30000,
      specialAllowance: 45000,
      grossSalary: 150000,
      employerPf: 9000,
      gratuity: 3608,
      payrollGroup: 'Executive India Payroll',
      salaryEffectiveDate: '2026-04-01',
      paymentFrequency: 'Monthly',
      pfApplicable: true,
      esiApplicable: false,
      ptApplicable: true,
      taxRegime: 'New Tax Regime',
      benefits: {
        Medical: true,
        Life: true,
        Accident: true,
        Gratuity: true,
        Bonus: true,
        Incentive: true,
        Travel: false,
        Mobile: true,
        Internet: true,
        Meal: true,
        WFH: true,
        CompanyVehicle: false,
      },
      medicalDetails: {
        provider: 'Star Health & Allied Insurance',
        policyNumber: 'SH-POL-2026-88912',
        coverage: '₹500,000 Family Floater',
        effectiveDate: '2026-04-01',
        expiryDate: '2027-03-31',
      },
    },
    onlineAccess: {
      username: 'arun.kumar',
      officialEmail: 'arun.kumar@bezent.com',
      invitationStatus: 'Sent',
      invitationSentDate: '2026-03-22',
      mfaRequired: true,
      forcePasswordSetup: true,
      accountActive: true,
      employeeRole: 'Software Engineer',
      portalRoleScope: 'Employee',
      moduleAccess: {
        Dashboard: true,
        Attendance: true,
        Leave: true,
        Calendar: true,
        Tasks: true,
        Meetings: true,
        Projects: true,
        Performance: true,
        Documents: true,
      },
    },
    workingHours: {
      workSchedule: 'Standard General Shift (9:00 AM – 6:00 PM)',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: '09:00',
      endTime: '18:00',
      standardHours: '8 hours / day (40 hours / week)',
      breakMinutes: 15,
      lunchMinutes: 45,
      assignedCalendar: 'India Corporate Calendar 2026',
      timeZone: 'Asia/Kolkata (IST, UTC+5:30)',
      assignedSchedule: 'Standard General Shift',
      holidays: [
        { name: "New Year's Day", date: '2026-01-01', type: 'Public' },
        { name: 'Republic Day', date: '2026-01-26', type: 'National' },
        { name: 'Independence Day', date: '2026-08-15', type: 'National' },
        { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'National' },
        { name: 'Diwali', date: '2026-11-08', type: 'Festival' },
      ],
    },
    documents: {
      isExperiencedHire,
      passportPhoto,
      items: documentsList,
    },
  };

  // Drafts & Unsaved Changes State
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    initialDraft ? initialDraft.id : null,
  );
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [draftsList, setDraftsList] = useState<EmployeeRegistrationDraft[]>(() => {
    try {
      const saved = localStorage.getItem('bezent_hrms_registration_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAutoGenerateId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setEmployeeId(`EMP${randomNum}`);
  };

  const handleBack = () => {
    const currentIndex = allSections.findIndex((s) => s.id === activeSection);
    if (currentIndex > 0) {
      setActiveSection(allSections[currentIndex - 1]!.id);
    }
  };

  const handleNext = () => {
    const currentIndex = allSections.findIndex((s) => s.id === activeSection);
    if (currentIndex < allSections.length - 1) {
      setActiveSection(allSections[currentIndex + 1]!.id);
    }
  };

  const handleSaveDraft = (overrideExit = false) => {
    const draftId = currentDraftId || `draft-${Date.now()}`;
    if (!currentDraftId) {
      setCurrentDraftId(draftId);
    }

    const empName = reviewData.personal.fullName || 'Arun Kumar';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const lastUpdated = `Today at ${timeStr}`;

    const newDraft: EmployeeRegistrationDraft = {
      id: draftId,
      employeeId,
      employeeName: empName,
      activeSection,
      completedSectionsCount: 8,
      pendingSectionLabels: ['Personal Information', 'Documents'],
      lastUpdated,
      reviewData,
    };

    setDraftsList((prev) => {
      const exists = prev.some((d) => d.id === draftId);
      const nextList = exists
        ? prev.map((d) => (d.id === draftId ? newDraft : d))
        : [newDraft, ...prev];
      try {
        localStorage.setItem('bezent_hrms_registration_drafts', JSON.stringify(nextList));
      } catch {
        // fallback
      }
      return nextList;
    });

    showToast('Draft saved successfully.');

    if (overrideExit) {
      setShowUnsavedModal(false);
      onCancel();
    }
  };

  const handleContinueDraft = (draft: EmployeeRegistrationDraft) => {
    setCurrentDraftId(draft.id);
    setActiveSection(draft.activeSection);

    if (draft.reviewData?.general?.employeeId) {
      setEmployeeId(draft.reviewData.general.employeeId);
    }
    if (draft.reviewData?.documents?.items) {
      setDocumentsList(draft.reviewData.documents.items);
    }
    if (draft.reviewData?.documents?.passportPhoto) {
      setPassportPhoto({ file: null, ...draft.reviewData.documents.passportPhoto });
    }
    if (draft.reviewData?.documents?.isExperiencedHire !== undefined) {
      setIsExperiencedHire(draft.reviewData.documents.isExperiencedHire);
    }

    setIsDraftsModalOpen(false);
    showToast(`Draft restored for ${draft.employeeName || draft.employeeId}.`);
  };

  const handleDeleteDraft = (draftId: string) => {
    setDraftsList((prev) => {
      const updated = prev.filter((d) => d.id !== draftId);
      try {
        localStorage.setItem('bezent_hrms_registration_drafts', JSON.stringify(updated));
      } catch {
        // fallback
      }
      return updated;
    });
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }
    showToast('Draft deleted.');
  };

  if (isOpen === false) return null;

  return (
    <>
      <Page className="employee-registration-page" maxWidth="full" gap="lg">
        {/* Page Header */}
        <PageHeader
          title="Employee Registration"
          subtitle="Add and manage new employee information"
          breadcrumbs={
            <div className="bezent-breadcrumb" role="navigation" aria-label="Breadcrumb">
              <span>Administration</span>
              <span className="bezent-breadcrumb-separator">/</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  setShowUnsavedModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowUnsavedModal(true);
                  }
                }}
              >
                Employee Administration
              </span>
              <span className="bezent-breadcrumb-separator">/</span>
              <span className="bezent-breadcrumb-item--active">Employee Registration</span>
            </div>
          }
          actions={
            <Inline gap="md" align="center">
              <button
                type="button"
                className="bezent-btn-draft"
                onClick={() => setIsDraftsModalOpen(true)}
              >
                <BezentIcon name="documents" size={16} />
                <span>View Drafts ({draftsList.length})</span>
              </button>
            </Inline>
          }
        />

        {/* Persistent Tab Navigation */}
        <Tabs
          items={allSections.map((s) => ({ id: s.id, label: s.label }))}
          activeId={activeSection}
          onChange={(id) => setActiveSection(id)}
          variant="underline"
        />

        <Stack gap="xl">
          {/* Toast Alert Banner */}
          {toastMsg && (
            <Alert variant="info" onDismiss={() => setToastMsg(null)}>
              {toastMsg}
            </Alert>
          )}

          {activeSection === 'general' ? (
            <Stack gap="xl">
              {/* Section 1: General Information */}
              <FormSection
                title="General Information"
                description="Core identity and classification details"
              >
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* Dynamically rendered custom fields from Administration Customization Builder */}
                  {customFields
                    .filter((f) => f.sectionId === 'general')
                    .map((f) => (
                      <FormField
                        key={f.id}
                        label={f.label}
                        htmlFor={`custom-${f.id}`}
                        required={f.required}
                        disabled={f.readOnly}
                      >
                        {f.fieldType === 'select' ? (
                          <Select
                            id={`custom-${f.id}`}
                            disabled={f.readOnly}
                            options={[
                              { value: '', label: `Select ${f.label}` },
                              ...(f.options?.map((opt: string) => ({ value: opt, label: opt })) ||
                                []),
                            ]}
                          />
                        ) : (
                          <Input
                            id={`custom-${f.id}`}
                            type={f.fieldType === 'date' ? 'date' : 'text'}
                            placeholder={f.defaultValue || `Enter ${f.label}`}
                            disabled={f.readOnly}
                          />
                        )}
                      </FormField>
                    ))}

                  {/* 1. Employee ID */}
                  <FormField label="Employee ID" htmlFor="reg-employee-id" required>
                    <Input
                      id="reg-employee-id"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP2026001"
                      rightIcon={
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={handleAutoGenerateId}
                        >
                          Auto
                        </Button>
                      }
                    />
                  </FormField>

                  {/* 2. Employment Type */}
                  <FormField label="Employment Type" htmlFor="reg-employment-type" required>
                    <Select
                      id="reg-employment-type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      options={[
                        { value: 'full_time', label: 'Full Time' },
                        { value: 'part_time', label: 'Part Time' },
                        { value: 'contract', label: 'Contract' },
                        { value: 'intern', label: 'Intern' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 3. Employment Status */}
                  <FormField label="Employment Status" htmlFor="reg-employment-status" required>
                    <Select
                      id="reg-employment-status"
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      options={[
                        { value: 'pending_activation', label: 'Pending Activation' },
                        { value: 'active', label: 'Active' },
                        { value: 'probation', label: 'Probation' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              {/* Section 2: Employment Details */}
              <FormSection
                title="Employment Details"
                description="Role, structure, placement, and reporting hierarchy"
              >
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* 4. Department */}
                  <FormField label="Department" htmlFor="reg-department" required>
                    <Select
                      id="reg-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      options={[
                        { value: 'Engineering', label: 'Engineering' },
                        { value: 'Human Resources', label: 'Human Resources' },
                        { value: 'Finance', label: 'Finance' },
                        { value: 'Operations', label: 'Operations' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 5. Team */}
                  <FormField label="Team" htmlFor="reg-team" required>
                    <Select
                      id="reg-team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      options={[
                        { value: 'Product Development', label: 'Product Development' },
                        { value: 'Frontend', label: 'Frontend Engineering' },
                        { value: 'Backend', label: 'Backend Engineering' },
                        { value: 'QA', label: 'Quality Assurance' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 6. Designation */}
                  <FormField label="Designation" htmlFor="reg-designation" required>
                    <Select
                      id="reg-designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      options={[
                        { value: 'Software Engineer', label: 'Software Engineer' },
                        { value: 'Financial Analyst', label: 'Financial Analyst' },
                        { value: 'Senior HR Specialist', label: 'Senior HR Specialist' },
                        { value: 'Product Manager', label: 'Product Manager' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 7. Grade / Level */}
                  <FormField label="Grade / Level" htmlFor="reg-grade-level" required>
                    <Select
                      id="reg-grade-level"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      options={[
                        { value: 'L1 - Entry Level', label: 'L1 - Entry Level' },
                        { value: 'L2 - Mid Level', label: 'L2 - Mid Level' },
                        { value: 'L3 - Senior Level', label: 'L3 - Senior Level' },
                        { value: 'L4 - Lead', label: 'L4 - Lead' },
                        { value: 'L5 - Executive', label: 'L5 - Executive' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 8. Reporting Manager */}
                  <FormField
                    label="Reporting Manager"
                    htmlFor="reg-reporting-manager"
                    required
                    disabled
                  >
                    <Input
                      id="reg-reporting-manager"
                      value={reportingManager || ''}
                      placeholder="Select Manager..."
                      disabled
                    />
                  </FormField>

                  {/* 9. Organisation Unit */}
                  <FormField label="Organisation Unit" htmlFor="reg-org-unit" required>
                    <Select
                      id="reg-org-unit"
                      value={organisationUnit}
                      onChange={(e) => setOrganisationUnit(e.target.value)}
                      options={[
                        { value: 'Technology', label: 'Technology' },
                        { value: 'Operations', label: 'Operations' },
                        { value: 'Corporate', label: 'Corporate' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 10. Office Location */}
                  <FormField label="Office Location" htmlFor="reg-office-location" required>
                    <Select
                      id="reg-office-location"
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      options={[
                        { value: 'Chennai - Main Office', label: 'Chennai - Main Office' },
                        { value: 'Bengaluru', label: 'Bengaluru' },
                        { value: 'Hyderabad', label: 'Hyderabad' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 11. Joining Date */}
                  <FormField label="Joining Date" htmlFor="reg-joining-date" required>
                    <Input
                      id="reg-joining-date"
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              {/* Section 3: Additional Information */}
              <FormSection
                title="Additional Information"
                description="Timeline, recruitment source, and employment terms"
              >
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* 12. Confirmed Date of Joining */}
                  <FormField label="Confirmed Date of Joining" htmlFor="reg-confirmed-joining-date">
                    <Input
                      id="reg-confirmed-joining-date"
                      type="date"
                      value={confirmedJoiningDate}
                      onChange={(e) => setConfirmedJoiningDate(e.target.value)}
                    />
                  </FormField>

                  {/* 13. End Date */}
                  <FormField label="End Date" htmlFor="reg-end-date">
                    <Input
                      id="reg-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </FormField>

                  {/* 14. Source of Hire */}
                  <FormField label="Source of Hire" htmlFor="reg-source-of-hire" required>
                    <Select
                      id="reg-source-of-hire"
                      value={sourceOfHire}
                      onChange={(e) => setSourceOfHire(e.target.value)}
                      options={[
                        { value: 'direct_applicant', label: 'Direct Applicant' },
                        { value: 'referral', label: 'Referral' },
                        { value: 'agency', label: 'Agency' },
                        { value: 'campus', label: 'Campus' },
                        { value: 'linkedin', label: 'LinkedIn' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 15. Probation Period */}
                  <FormField label="Probation Period" htmlFor="reg-probation-period" required>
                    <Select
                      id="reg-probation-period"
                      value={probationPeriod}
                      onChange={(e) => setProbationPeriod(e.target.value)}
                      options={[
                        { value: '3_months', label: '3 Months' },
                        { value: '6_months', label: '6 Months' },
                        { value: '12_months', label: '12 Months' },
                        { value: 'no_probation', label: 'No Probation' },
                        { value: 'custom', label: 'Custom' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>

                  {/* 16. Notice Period */}
                  <FormField label="Notice Period" htmlFor="reg-notice-period" required>
                    <Select
                      id="reg-notice-period"
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                      options={[
                        { value: '15_days', label: '15 Days' },
                        { value: '30_days', label: '30 Days' },
                        { value: '60_days', label: '60 Days' },
                        { value: '90_days', label: '90 Days' },
                        { value: 'no_notice', label: 'No Notice Period' },
                        { value: 'custom', label: 'Custom' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>
            </Stack>
          ) : activeSection === 'personal' ? (
            <PersonalInformation employeeId={employeeId} />
          ) : activeSection === 'onboarding' ? (
            <OnboardingSection />
          ) : activeSection === 'skills' ? (
            <SkillsSection />
          ) : activeSection === 'emergency' ? (
            <EmergencyContactSection />
          ) : activeSection === 'accounts' ? (
            <AccountsSection />
          ) : activeSection === 'online_access' ? (
            <OnlineAccessSection />
          ) : activeSection === 'working_hours' ? (
            <WorkingHoursSection />
          ) : activeSection === 'documents' ? (
            <DocumentsSection
              documents={documentsList}
              isExperiencedHire={isExperiencedHire}
              passportPhoto={passportPhoto}
              onDocumentsChange={setDocumentsList}
              onClassificationChange={setIsExperiencedHire}
              onPassportPhotoChange={setPassportPhoto}
            />
          ) : activeSection === 'review' ? (
            <ReviewSection
              data={reviewData}
              onEditSection={(sectionId) => setActiveSection(sectionId)}
              onDeleteFamilyMember={handleDeleteFamilyMember}
              onDeleteNominee={handleDeleteNominee}
              onDeleteTask={handleDeleteTask}
              onDeleteAsset={handleDeleteAsset}
              onDeleteSkill={handleDeleteSkill}
              onDeleteSecondaryContact={handleDeleteSecondaryContact}
              onDeleteDocument={handleDeleteDocument}
              onCreateEmployee={() => onSave?.(reviewData as unknown as Record<string, unknown>)}
            />
          ) : (
            <Stack gap="lg">
              <Toolbar
                left={
                  <Inline gap="md" align="center">
                    <BezentIcon name="documents" size={22} />
                    <div>
                      <CardTitle>
                        {allSections.find((s) => s.id === activeSection)?.label || 'Custom Section'}
                      </CardTitle>
                      <CardDescription>
                        Configured custom fields and section details.
                      </CardDescription>
                    </div>
                  </Inline>
                }
              />

              <Stack gap="md">
                {customCards
                  .filter((c) => c.sectionId === activeSection)
                  .map((c) => {
                    const cardFields = customFields.filter((f) => f.cardId === c.id);
                    return (
                      <Card key={c.id} padding="md">
                        <Stack gap="sm">
                          <CardTitle>{c.title}</CardTitle>
                          <FormGrid columns={2} layout="horizontal" labelWidth="md">
                            {cardFields.map((f) => (
                              <FormField key={f.id} label={f.label} required={f.required}>
                                {f.fieldType === 'select' ? (
                                  <Select
                                    disabled={f.readOnly}
                                    options={[
                                      { value: '', label: `Select ${f.label}` },
                                      ...(f.options?.map((opt: string) => ({
                                        value: opt,
                                        label: opt,
                                      })) || []),
                                    ]}
                                  />
                                ) : (
                                  <Input
                                    type={
                                      f.fieldType === 'date'
                                        ? 'date'
                                        : f.fieldType === 'number'
                                          ? 'number'
                                          : 'text'
                                    }
                                    placeholder={f.defaultValue || `Enter ${f.label}`}
                                    disabled={f.readOnly}
                                  />
                                )}
                              </FormField>
                            ))}
                          </FormGrid>
                        </Stack>
                      </Card>
                    );
                  })}
              </Stack>
            </Stack>
          )}
        </Stack>

        {/* Persistent Bottom Action Bar */}
        <Toolbar
          className="bezent-form-actions"
          left={
            <Actions gap="sm">
              <Button
                variant="secondary"
                type="button"
                disabled={activeSection === 'general'}
                onClick={handleBack}
              >
                ← Back
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleSaveDraft(false)}>
                💾 Save Draft
              </Button>
              <Button variant="secondary" type="button" onClick={() => setShowUnsavedModal(true)}>
                Cancel
              </Button>
            </Actions>
          }
          right={
            activeSection !== 'review' ? (
              <Button variant="primary" type="button" onClick={handleNext}>
                Save &amp; Next →
              </Button>
            ) : undefined
          }
        />
      </Page>

      {/* Drafts Modal */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        drafts={draftsList}
        onClose={() => setIsDraftsModalOpen(false)}
        onContinueDraft={handleContinueDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <Modal
          isOpen={showUnsavedModal}
          onClose={() => setShowUnsavedModal(false)}
          title="Unsaved Changes"
          size="sm"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" type="button" onClick={() => setShowUnsavedModal(false)}>
                Cancel
              </Button>
              <Button variant="secondary" type="button" onClick={onCancel}>
                Leave Without Saving
              </Button>
              <Button variant="primary" type="button" onClick={() => handleSaveDraft(true)}>
                Save Draft
              </Button>
            </Actions>
          }
        >
          <p>You have unsaved changes. Save as draft before leaving?</p>
        </Modal>
      )}
    </>
  );
}
