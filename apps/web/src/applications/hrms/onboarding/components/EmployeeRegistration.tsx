import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
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
  onCancel: () => void;
  onSave?: (data: Record<string, unknown>) => void;
  initialDraft?: EmployeeRegistrationDraft | null;
}

import { useCustomFields } from '../../settings/context/CustomFieldsContext';
import type { OnboardingCardConfig } from '../../settings/types/settingsCenter';

export function EmployeeRegistration({
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
  const [otherEmploymentType, setOtherEmploymentType] = useState('');

  // Employment Status
  const [employmentStatus, setEmploymentStatus] = useState('pending_activation');
  const [otherEmploymentStatus, setOtherEmploymentStatus] = useState('');

  // Department
  const [department, setDepartment] = useState('Engineering');
  const [otherDepartment, setOtherDepartment] = useState('');

  // Team
  const [team, setTeam] = useState('Product Development');
  const [otherTeam, setOtherTeam] = useState('');

  // Designation
  const [designation, setDesignation] = useState('Software Engineer');
  const [otherDesignation, setOtherDesignation] = useState('');

  // Grade / Level
  const [gradeLevel, setGradeLevel] = useState('L2 - Mid Level');
  const [otherGradeLevel, setOtherGradeLevel] = useState('');

  // Reporting Manager
  const [reportingManager, setReportingManager] = useState<string | null>('Rakesh Kumar');

  // Organisation Unit
  const [organisationUnit, setOrganisationUnit] = useState('Technology');
  const [otherOrganisationUnit, setOtherOrganisationUnit] = useState('');

  // Office Location
  const [officeLocation, setOfficeLocation] = useState('Chennai - Main Office');
  const [otherOfficeLocation, setOtherOfficeLocation] = useState('');

  // Dates
  const [joiningDate, setJoiningDate] = useState('2026-04-01');
  const [confirmedJoiningDate, setConfirmedJoiningDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('');

  // Source of Hire
  const [sourceOfHire, setSourceOfHire] = useState('direct_applicant');
  const [otherSourceOfHire, setOtherSourceOfHire] = useState('');

  // Probation Period
  const [probationPeriod, setProbationPeriod] = useState('6_months');
  const [customProbationNumber, setCustomProbationNumber] = useState('');
  const [customProbationUnit, setCustomProbationUnit] = useState<'days' | 'months'>('months');
  const [otherProbationPeriod, setOtherProbationPeriod] = useState('');

  // Notice Period
  const [noticePeriod, setNoticePeriod] = useState('30_days');
  const [customNoticeNumber, setCustomNoticeNumber] = useState('');
  const [customNoticeUnit, setCustomNoticeUnit] = useState<'days' | 'months'>('days');
  const [otherNoticePeriod, setOtherNoticePeriod] = useState('');

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
      employmentType:
        employmentType === 'other'
          ? otherEmploymentType || 'Custom'
          : employmentType.replace('_', ' ').toUpperCase(),
      employmentStatus:
        employmentStatus === 'other'
          ? otherEmploymentStatus || 'Custom'
          : employmentStatus.replace('_', ' ').toUpperCase(),
      department: department === 'other' ? otherDepartment : department,
      team: team === 'other' ? otherTeam : team,
      designation: designation === 'other' ? otherDesignation : designation,
      gradeLevel: gradeLevel === 'other' ? otherGradeLevel : gradeLevel,
      reportingManager,
      organisationUnit: organisationUnit === 'other' ? otherOrganisationUnit : organisationUnit,
      officeLocation: officeLocation === 'other' ? otherOfficeLocation : officeLocation,
      joiningDate,
      confirmedJoiningDate,
      endDate,
      sourceOfHire:
        sourceOfHire === 'other' ? otherSourceOfHire : sourceOfHire.replace('_', ' ').toUpperCase(),
      probationPeriod:
        probationPeriod === 'custom'
          ? `${customProbationNumber} ${customProbationUnit}`
          : probationPeriod.replace('_', ' '),
      noticePeriod:
        noticePeriod === 'custom'
          ? `${customNoticeNumber} ${customNoticeUnit}`
          : noticePeriod.replace('_', ' '),
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

  return (
    <div className="employee-registration--full-screen">
      <div className="employee-registration">
        {/* Breadcrumb Navigation */}
        <nav className="employee-registration__breadcrumb" aria-label="Breadcrumb">
          <span>HRMS</span>
          <span className="employee-registration__breadcrumb-separator">&gt;</span>
          <span className="employee-registration__breadcrumb-item--active">
            Employee Registration
          </span>
        </nav>

        {/* Page Header */}
        <header className="employee-registration__header">
          <h1 className="employee-registration__title">Employee Registration</h1>
          <p className="employee-registration__subtitle">Add and manage new employee information</p>
        </header>

        {/* Dynamic Section Horizontal Navigation */}
        <div className="employee-registration__nav-bar" role="tablist">
          {allSections.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeSection === section.id}
              className={`employee-registration__nav-tab ${
                activeSection === section.id ? 'employee-registration__nav-tab--active' : ''
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Workspace Card Content */}
        <div className="employee-registration__card">
          {activeSection === 'general' ? (
            <>
              {/* General Section Banner */}
              <div className="employee-registration__section-header">
                <div className="employee-registration__section-icon-badge">
                  <BezentIcon name="documents" size={22} />
                </div>
                <div className="employee-registration__section-title-group">
                  <h2 className="employee-registration__section-title">General Information</h2>
                  <p className="employee-registration__section-subtitle">
                    Basic employment details for the employee.
                  </p>
                </div>
              </div>

              {/* 16 General Section Fields Grid */}
              <form
                className="employee-registration__form-grid"
                onSubmit={(e) => e.preventDefault()}
              >
                {/* Dynamically rendered custom fields from Administration Customization Builder */}
                {customFields
                  .filter((f) => f.sectionId === 'general')
                  .map((f) => (
                    <div key={f.id} className="employee-registration__field">
                      <label className="employee-registration__label">
                        {f.label}{' '}
                        {f.required && <span className="employee-registration__required">*</span>}
                      </label>
                      {f.fieldType === 'select' ? (
                        <div className="employee-registration__select-wrapper">
                          <select className="employee-registration__select" disabled={f.readOnly}>
                            <option value="">Select {f.label}</option>
                            {f.options?.map((opt: string, idx: number) => (
                              <option key={idx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <span className="employee-registration__select-icon">▼</span>
                        </div>
                      ) : (
                        <input
                          type={f.fieldType === 'date' ? 'date' : 'text'}
                          className="employee-registration__input"
                          placeholder={f.defaultValue || `Enter ${f.label}`}
                          disabled={f.readOnly}
                        />
                      )}
                    </div>
                  ))}
                {/* 1. Employee ID */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Employee ID <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__input-row">
                    <input
                      type="text"
                      className="employee-registration__input"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP2026001"
                    />
                    <button
                      type="button"
                      className="employee-registration__auto-btn"
                      onClick={handleAutoGenerateId}
                    >
                      <BezentIcon name="clock" size={14} />
                      Auto Generate
                    </button>
                  </div>
                </div>

                {/* 2. Employment Type */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Employment Type <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {employmentType === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Employment Type..."
                        value={otherEmploymentType}
                        onChange={(e) => setOtherEmploymentType(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Employment Status */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Employment Status <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                    >
                      <option value="pending_activation">Pending Activation</option>
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {employmentStatus === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Employment Status..."
                        value={otherEmploymentStatus}
                        onChange={(e) => setOtherEmploymentStatus(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 4. Department */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Department <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <span className="employee-registration__search-prefix">🔍</span>
                    <select
                      className="employee-registration__select employee-registration__select--with-search"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {department === 'other' ? (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Department Name..."
                        value={otherDepartment}
                        onChange={(e) => setOtherDepartment(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="employee-registration__add-link"
                      onClick={() => setDepartment('other')}
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* 5. Team */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Team <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <span className="employee-registration__search-prefix">🔍</span>
                    <select
                      className="employee-registration__select employee-registration__select--with-search"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                    >
                      <option value="Product Development">Product Development</option>
                      <option value="Frontend">Frontend Engineering</option>
                      <option value="Backend">Backend Engineering</option>
                      <option value="QA">Quality Assurance</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {team === 'other' ? (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Team Name..."
                        value={otherTeam}
                        onChange={(e) => setOtherTeam(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="employee-registration__add-link"
                      onClick={() => setTeam('other')}
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* 6. Designation */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Designation <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <span className="employee-registration__search-prefix">🔍</span>
                    <select
                      className="employee-registration__select employee-registration__select--with-search"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    >
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Financial Analyst">Financial Analyst</option>
                      <option value="Senior HR Specialist">Senior HR Specialist</option>
                      <option value="Product Manager">Product Manager</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {designation === 'other' ? (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Designation Name..."
                        value={otherDesignation}
                        onChange={(e) => setOtherDesignation(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="employee-registration__add-link"
                      onClick={() => setDesignation('other')}
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* 7. Grade / Level */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Grade / Level <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                    >
                      <option value="L1 - Entry Level">L1 - Entry Level</option>
                      <option value="L2 - Mid Level">L2 - Mid Level</option>
                      <option value="L3 - Senior Level">L3 - Senior Level</option>
                      <option value="L4 - Lead">L4 - Lead</option>
                      <option value="L5 - Executive">L5 - Executive</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {gradeLevel === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Grade / Level..."
                        value={otherGradeLevel}
                        onChange={(e) => setOtherGradeLevel(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 8. Reporting Manager */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Reporting Manager <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__pill-select">
                    {reportingManager ? (
                      <div className="employee-registration__pill-tag">
                        <span className="employee-registration__pill-avatar">RK</span>
                        <span>{reportingManager}</span>
                        <button
                          type="button"
                          className="employee-registration__pill-close"
                          onClick={() => setReportingManager(null)}
                          aria-label="Remove manager"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="employee-registration__placeholder-text">
                        Select Manager...
                      </span>
                    )}
                    <button
                      type="button"
                      className="employee-registration__pill-search-btn"
                      aria-label="Search manager"
                    >
                      🔍
                    </button>
                  </div>
                </div>

                {/* 9. Organisation Unit */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Organisation Unit <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={organisationUnit}
                      onChange={(e) => setOrganisationUnit(e.target.value)}
                    >
                      <option value="Technology">Technology</option>
                      <option value="Operations">Operations</option>
                      <option value="Corporate">Corporate</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {organisationUnit === 'other' ? (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Organisation Unit..."
                        value={otherOrganisationUnit}
                        onChange={(e) => setOtherOrganisationUnit(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="employee-registration__add-link"
                      onClick={() => setOrganisationUnit('other')}
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* 10. Office Location */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Office Location <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                    >
                      <option value="Chennai - Main Office">Chennai - Main Office</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {officeLocation === 'other' ? (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Office Location..."
                        value={otherOfficeLocation}
                        onChange={(e) => setOtherOfficeLocation(e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="employee-registration__add-link"
                      onClick={() => setOfficeLocation('other')}
                    >
                      + Add New
                    </button>
                  )}
                </div>

                {/* 11. Joining Date */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Joining Date <span className="employee-registration__required">*</span>
                  </label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>

                {/* 12. Confirmed Date of Joining */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Confirmed Date of Joining</label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={confirmedJoiningDate}
                    onChange={(e) => setConfirmedJoiningDate(e.target.value)}
                  />
                </div>

                {/* 13. End Date */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">End Date</label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                {/* 14. Source of Hire */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Source of Hire <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={sourceOfHire}
                      onChange={(e) => setSourceOfHire(e.target.value)}
                    >
                      <option value="direct_applicant">Direct Applicant</option>
                      <option value="referral">Referral</option>
                      <option value="agency">Agency</option>
                      <option value="campus">Campus</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {sourceOfHire === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Source of Hire..."
                        value={otherSourceOfHire}
                        onChange={(e) => setOtherSourceOfHire(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 15. Probation Period */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Probation Period <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={probationPeriod}
                      onChange={(e) => setProbationPeriod(e.target.value)}
                    >
                      <option value="3_months">3 Months</option>
                      <option value="6_months">6 Months</option>
                      <option value="12_months">12 Months</option>
                      <option value="no_probation">No Probation</option>
                      <option value="custom">Custom</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {probationPeriod === 'custom' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="number"
                        className="employee-registration__input employee-registration__input--narrow"
                        placeholder="Number..."
                        value={customProbationNumber}
                        onChange={(e) => setCustomProbationNumber(e.target.value)}
                      />
                      <select
                        className="employee-registration__custom-unit-select"
                        value={customProbationUnit}
                        onChange={(e) =>
                          setCustomProbationUnit(e.target.value as 'days' | 'months')
                        }
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  )}
                  {probationPeriod === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Other Probation Period..."
                        value={otherProbationPeriod}
                        onChange={(e) => setOtherProbationPeriod(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 16. Notice Period */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Notice Period <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                    >
                      <option value="15_days">15 Days</option>
                      <option value="30_days">30 Days</option>
                      <option value="60_days">60 Days</option>
                      <option value="90_days">90 Days</option>
                      <option value="no_notice">No Notice Period</option>
                      <option value="custom">Custom</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {noticePeriod === 'custom' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="number"
                        className="employee-registration__input employee-registration__input--narrow"
                        placeholder="Number..."
                        value={customNoticeNumber}
                        onChange={(e) => setCustomNoticeNumber(e.target.value)}
                      />
                      <select
                        className="employee-registration__custom-unit-select"
                        value={customNoticeUnit}
                        onChange={(e) => setCustomNoticeUnit(e.target.value as 'days' | 'months')}
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  )}
                  {noticePeriod === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Other Notice Period..."
                        value={otherNoticePeriod}
                        onChange={(e) => setOtherNoticePeriod(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </form>
            </>
          ) : activeSection === 'personal' ? (
            <>
              {/* Personal Information Section Banner */}
              <div className="employee-registration__section-header">
                <div className="employee-registration__section-icon-badge">
                  <BezentIcon name="employees" size={22} />
                </div>
                <div className="employee-registration__section-title-group">
                  <h2 className="employee-registration__section-title">Personal Information</h2>
                  <p className="employee-registration__section-subtitle">
                    Basic personal information about the employee.
                  </p>
                </div>
              </div>

              {/* All 27 Personal Information Fields */}
              <PersonalInformation employeeId={employeeId} />
            </>
          ) : activeSection === 'onboarding' ? (
            <>
              {/* Onboarding Section Banner */}
              <div className="employee-registration__section-header">
                <div className="employee-registration__section-icon-badge">
                  <BezentIcon name="tasks" size={22} />
                </div>
                <div className="employee-registration__section-title-group">
                  <h2 className="employee-registration__section-title">Onboarding</h2>
                  <p className="employee-registration__section-subtitle">
                    Onboarding tasks and assigned assets for the employee.
                  </p>
                </div>
              </div>

              {/* Form-Based Onboarding Tasks & Assets */}
              <OnboardingSection />
            </>
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
            <>
              {/* Dynamic Custom Section View */}
              <div className="employee-registration__section-header">
                <div className="employee-registration__section-icon-badge">
                  <BezentIcon name="documents" size={22} />
                </div>
                <div className="employee-registration__section-title-group">
                  <h2 className="employee-registration__section-title">
                    {allSections.find((s) => s.id === activeSection)?.label || 'Custom Section'}
                  </h2>
                  <p className="employee-registration__section-subtitle">
                    Configured custom fields and section details.
                  </p>
                </div>
              </div>

              <div className="employee-registration__custom-section-body">
                {customCards
                  .filter((c) => c.sectionId === activeSection)
                  .map((c) => {
                    const cardFields = customFields.filter((f) => f.cardId === c.id);
                    return (
                      <div key={c.id} className="employee-registration__card-group">
                        <h3 className="employee-registration__card-group-title">{c.title}</h3>
                        <div className="employee-registration__form-grid">
                          {cardFields.map((f) => (
                            <div key={f.id} className="employee-registration__field">
                              <label className="employee-registration__label">
                                {f.label}{' '}
                                {f.required && (
                                  <span className="employee-registration__required">*</span>
                                )}
                              </label>
                              {f.fieldType === 'select' ? (
                                <div className="employee-registration__select-wrapper">
                                  <select
                                    className="employee-registration__select"
                                    disabled={f.readOnly}
                                  >
                                    <option value="">Select {f.label}</option>
                                    {f.options?.map((opt: string, idx: number) => (
                                      <option key={idx} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="employee-registration__select-icon">▼</span>
                                </div>
                              ) : f.fieldType === 'file' ? (
                                <input
                                  type="file"
                                  className="employee-registration__input"
                                  disabled={f.readOnly}
                                />
                              ) : (
                                <input
                                  type={
                                    f.fieldType === 'date'
                                      ? 'date'
                                      : f.fieldType === 'number'
                                        ? 'number'
                                        : 'text'
                                  }
                                  className="employee-registration__input"
                                  placeholder={f.defaultValue || `Enter ${f.label}`}
                                  disabled={f.readOnly}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}

          {/* Bottom Actions Bar */}
          <div className="employee-registration__actions">
            <button
              type="button"
              className="employee-registration__back-btn"
              disabled={activeSection === 'general'}
              onClick={handleBack}
            >
              ← Back
            </button>
            <button
              type="button"
              className="employee-registration__save-draft-btn"
              onClick={() => handleSaveDraft(false)}
            >
              💾 Save Draft
            </button>
            <button
              type="button"
              className="employee-registration__cancel-btn"
              onClick={() => setShowUnsavedModal(true)}
            >
              Cancel
            </button>
            {activeSection !== 'review' && (
              <Button variant="primary" onClick={handleNext}>
                Save &amp; Next →
              </Button>
            )}
          </div>
        </div>

        {/* Toast Banner */}
        {toastMsg && (
          <div className="employee-registration__toast">
            <span>✓</span>
            <span>{toastMsg}</span>
          </div>
        )}

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
          <div className="employee-registration__unsaved-overlay">
            <div className="employee-registration__unsaved-card">
              <h3 className="employee-registration__unsaved-title">Unsaved Changes</h3>
              <p className="employee-registration__unsaved-desc">
                You have unsaved changes. Save as draft before leaving?
              </p>
              <div className="employee-registration__unsaved-actions">
                <button
                  type="button"
                  className="employee-registration__cancel-btn"
                  onClick={() => setShowUnsavedModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="employee-registration__leave-btn"
                  onClick={onCancel}
                >
                  Leave Without Saving
                </button>
                <Button variant="primary" onClick={() => handleSaveDraft(true)}>
                  Save Draft
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
