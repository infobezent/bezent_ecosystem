import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardTitle,
  CardDescription,
  Input,
  Select,
  ChapterFocusCarousel,
  Toolbar,
  Actions,
  Stack,
  Inline,
  FormGrid,
  FormField,
  FormSection,
  Modal,
  Alert,
  PageHeader,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { PersonalInformation } from './PersonalInformation';
import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
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

export interface RegistrationChapterMeta {
  id: RegistrationSectionId;
  stepNumber: string;
  label: string;
  title: string;
  description: string;
  kicker: string;
}

export const REGISTRATION_CHAPTERS: readonly RegistrationChapterMeta[] = [
  {
    id: 'general',
    stepNumber: '01',
    label: 'General',
    title: 'GENERAL INFORMATION',
    description: 'Core identity, organizational placement, and employment classification details',
    kicker: 'CHAPTER // 01',
  },
  {
    id: 'personal',
    stepNumber: '02',
    label: 'Personal Information',
    title: 'PERSONAL INFORMATION',
    description:
      'Legal identity, demographics, contact details, permanent residence, and family profile',
    kicker: 'CHAPTER // 02',
  },
  {
    id: 'onboarding',
    stepNumber: '03',
    label: 'Administration',
    title: 'ADMINISTRATION & WORKFLOW',
    description: 'Pre-boarding setup, compliance checklist items, and hardware/asset provisioning',
    kicker: 'CHAPTER // 03',
  },
  {
    id: 'skills',
    stepNumber: '04',
    label: 'Skills',
    title: 'SKILLS & COMPETENCY PROFILE',
    description:
      'Technical proficiencies, competency evaluations, certifications, and assigned mentors',
    kicker: 'CHAPTER // 04',
  },
  {
    id: 'emergency',
    stepNumber: '05',
    label: 'Emergency Contact',
    title: 'EMERGENCY CONTACT DETAILS',
    description: 'Primary and secondary emergency contacts, relationships, and emergency protocols',
    kicker: 'CHAPTER // 05',
  },
  {
    id: 'accounts',
    stepNumber: '06',
    label: 'Accounts',
    title: 'STATUTORY & BANK ACCOUNTS',
    description:
      'Disbursement bank accounts, PF/ESI numbers, tax classification, and payroll setup',
    kicker: 'CHAPTER // 06',
  },
  {
    id: 'online_access',
    stepNumber: '07',
    label: 'Online Access',
    title: 'ONLINE ACCESS & CREDENTIALS',
    description:
      'Single sign-on authorization, enterprise email allocation, and portal permissions',
    kicker: 'CHAPTER // 07',
  },
  {
    id: 'working_hours',
    stepNumber: '08',
    label: 'Working Hours',
    title: 'WORKING HOURS & SCHEDULE',
    description:
      'Assigned shift schedule, weekly calendar, holiday calendar, and time tracking policy',
    kicker: 'CHAPTER // 08',
  },
  {
    id: 'documents',
    stepNumber: '09',
    label: 'Documents',
    title: 'DOCUMENT REPOSITORY & VERIFICATION',
    description:
      'Mandatory identification proof, experience letters, certificates, and photo upload',
    kicker: 'CHAPTER // 09',
  },
  {
    id: 'review',
    stepNumber: '10',
    label: 'Review',
    title: 'REGISTRATION REVIEW & SUBMISSION',
    description:
      'Comprehensive overview of all registration chapters prior to employee profile activation',
    kicker: 'CHAPTER // 10',
  },
];

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

import { useCustomFieldsOptional } from '../../settings/context/CustomFieldsContext';
import { authorizedFetch } from '../../../../platform/auth';

export function EmployeeRegistration({
  isOpen = true,
  onCancel,
  onSave,
  initialDraft,
}: EmployeeRegistrationProps) {
  // Optional: custom-fields context is only present inside the settings builder;
  // the registration form renders without it in production. Call the hook
  // unconditionally (Rules of Hooks) and branch on the returned value.
  const customCtx = useCustomFieldsOptional();
  // Resolved company Registration configuration (field visibility / required).
  const registrationConfig = useRegistrationConfig();

  const customFields = customCtx?.fields ?? [];
  const customCards = customCtx?.cards ?? [];

  const allSections: Array<{ id: string; label: string; description?: string | null }> =
    useMemo(() => {
      if (registrationConfig?.sections && registrationConfig.sections.length > 0) {
        return registrationConfig.sections
          .filter((s: { visible?: boolean }) => s.visible !== false)
          .map((s: { id: string; label: string; description?: string | null }) => ({
            id: s.id,
            label: s.label,
            description: s.description,
          }));
      }
      if (customCtx && customCtx.sections && customCtx.sections.length > 0) {
        return customCtx.sections
          .filter((s) => !s.hidden)
          .map((s) => ({ id: s.id, label: s.title, description: null }));
      }
      return [...REGISTRATION_SECTIONS];
    }, [registrationConfig, customCtx]);

  const [searchParams, setSearchParams] = useSearchParams();
  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  const urlChapter = searchParams.get('chapter') || searchParams.get('section');
  const initialSection = (
    urlChapter && allSections.some((s) => s.id === urlChapter)
      ? urlChapter
      : initialDraft
        ? initialDraft.activeSection
        : 'general'
  ) as RegistrationSectionId;

  const [activeSection, setActiveSection] = useState<RegistrationSectionId>(initialSection);

  const handleSelectChapter = useCallback(
    (id: string) => {
      setActiveSection(id as RegistrationSectionId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('chapter', id);
          return next;
        },
        { replace: true },
      );
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setSearchParams],
  );

  // Sync when searchParams change externally or via browser back/forward
  useEffect(() => {
    const currentParam = searchParams.get('chapter') || searchParams.get('section');
    if (
      currentParam &&
      allSections.some((s) => s.id === currentParam) &&
      currentParam !== activeSection
    ) {
      setActiveSection(currentParam as RegistrationSectionId);
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [searchParams, allSections, activeSection]);

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  // General Form State
  const [employeeId, setEmployeeId] = useState(initialDraft?.employeeId || '');

  // Employment Type
  const [employmentType, setEmploymentType] = useState('full_time');

  // Employment Status (System-controlled, default pending_activation)
  const [employmentStatus] = useState('pending_activation');

  // Department & Team (Filtered hierarchy)
  const [department, setDepartment] = useState('Engineering');
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

  // Source of Hire & Referral
  const [sourceOfHire, setSourceOfHire] = useState('direct_applicant');
  const [referralId, setReferralId] = useState('');
  const [resolvedReferrer, setResolvedReferrer] = useState<{
    id: string;
    name: string;
    designation?: string | null;
    department?: string | null;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [, setReferredByEmployeeId] = useState<string | null>(null);

  // Probation Period
  const [probationPeriod, setProbationPeriod] = useState('6_months');

  // Notice Period
  const [noticePeriod, setNoticePeriod] = useState('30_days');

  // Department-to-Team hierarchy
  const DEPARTMENT_TEAMS: Record<string, string[]> = {
    Engineering: ['Product Development', 'Frontend', 'Backend', 'QA'],
    'Human Resources': ['Talent Acquisition', 'HR Operations', 'Employee Relations'],
    Finance: ['Accounting', 'Payroll & Compliance', 'Financial Planning'],
    Operations: ['Facilities', 'IT Systems', 'Procurement'],
  };

  // Fixed-term type check
  const isFixedTerm = employmentType === 'contract' || employmentType === 'intern';

  const handleEmploymentTypeChange = (newType: string) => {
    setEmploymentType(newType);
    if (newType !== 'contract' && newType !== 'intern') {
      setEndDate('');
    }
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    const availableTeams = DEPARTMENT_TEAMS[newDept] || ['General'];
    if (!availableTeams.includes(team)) {
      setTeam(availableTeams[0] || 'General');
    }
  };

  // Auto-fetch next unique Employee ID from backend on mount
  useEffect(() => {
    if (!initialDraft?.employeeId) {
      authorizedFetch('/api/v1/hrms/employees/next-number')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch next number');
          return res.json();
        })
        .then((body) => {
          if (body?.data?.employeeNumber) {
            setEmployeeId(body.data.employeeNumber);
          }
        })
        .catch(() => {
          // Fallback if backend dev server is temporarily uncontactable
          setEmployeeId('EMP2026001');
        });
    }
  }, [initialDraft?.employeeId]);

  // Referral ID resolution
  useEffect(() => {
    const code = referralId.trim();
    if (sourceOfHire === 'referral' && code.length >= 3) {
      setReferralLoading(true);
      setReferralError(null);
      const timer = setTimeout(() => {
        authorizedFetch(`/api/v1/hrms/employees/resolve-referral/${encodeURIComponent(code)}`)
          .then((res) => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
          })
          .then((body) => {
            if (body?.data?.name) {
              setResolvedReferrer({
                id: body.data.id,
                name: body.data.name,
                designation: body.data.designationName,
                department: body.data.departmentName,
              });
              setReferredByEmployeeId(body.data.id);
              setReferralError(null);
            } else {
              setResolvedReferrer(null);
              setReferredByEmployeeId(null);
              setReferralError('Referral ID not found');
            }
          })
          .catch(() => {
            setResolvedReferrer(null);
            setReferredByEmployeeId(null);
            setReferralError('Invalid or unrecognised Referral ID');
          })
          .finally(() => {
            setReferralLoading(false);
          });
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setResolvedReferrer(null);
      setReferredByEmployeeId(null);
      setReferralError(null);
      setReferralLoading(false);
    }
  }, [referralId, sourceOfHire]);

  // System-calculated probation end date based on joiningDate & probationPeriod
  const calculatedProbationEndDate = useMemo(() => {
    if (!joiningDate || probationPeriod === 'no_probation') return null;
    const d = new Date(joiningDate);
    if (isNaN(d.getTime())) return null;
    if (probationPeriod === '3_months') d.setMonth(d.getMonth() + 3);
    else if (probationPeriod === '6_months') d.setMonth(d.getMonth() + 6);
    else if (probationPeriod === '12_months') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, [joiningDate, probationPeriod]);

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

  const refreshDrafts = () => {
    try {
      const saved = localStorage.getItem('bezent_hrms_registration_drafts');
      setDraftsList(saved ? JSON.parse(saved) : []);
    } catch {
      setDraftsList([]);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleBack = () => {
    const currentIndex = allSections.findIndex((s) => s.id === activeSection);
    if (currentIndex > 0) {
      handleSelectChapter(allSections[currentIndex - 1]!.id);
    }
  };

  const handleNext = () => {
    // Company-configured required fields of this section must be filled first.
    const missing = registrationConfig.validateSection(activeSection);
    if (missing.length > 0) {
      showToast('Complete the required fields before continuing.');
      return;
    }
    const currentIndex = allSections.findIndex((s) => s.id === activeSection);
    if (currentIndex < allSections.length - 1) {
      handleSelectChapter(allSections[currentIndex + 1]!.id);
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

  const currentChapterIndex = allSections.findIndex((s) => s.id === activeSection);
  const chapterMatch = REGISTRATION_CHAPTERS.find((c) => c.id === activeSection);
  const activeSectionMeta = allSections.find((s) => s.id === activeSection);
  const currentChapter: RegistrationChapterMeta = {
    id: activeSection,
    stepNumber: String(currentChapterIndex >= 0 ? currentChapterIndex + 1 : 1).padStart(2, '0'),
    label: activeSectionMeta?.label || chapterMatch?.label || 'Custom Section',
    title: (activeSectionMeta?.label || chapterMatch?.title || 'CUSTOM SECTION').toUpperCase(),
    description:
      activeSectionMeta?.description ??
      chapterMatch?.description ??
      'Configured custom fields and section details.',
    kicker: `CHAPTER // ${String(currentChapterIndex >= 0 ? currentChapterIndex + 1 : 1).padStart(2, '0')}`,
  };

  const chapterSteps = allSections.map((s, idx) => {
    const meta = REGISTRATION_CHAPTERS.find((c) => c.id === s.id);
    return {
      id: s.id,
      stepNumber: String(idx + 1).padStart(2, '0'),
      label: s.label,
      title: s.label.toUpperCase(),
      description: s.description ?? meta?.description ?? '',
    };
  });

  return (
    <>
      {/* Region A: Workspace Header */}
      <div className="bezent-modal__header bezent-modal__header--brand">
        <PageHeader
          align="center"
          title="Employee Registration"
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
                className="onboarding-page__drafts-btn bezent-btn-draft"
                onClick={() => {
                  refreshDrafts();
                  setIsDraftsModalOpen(true);
                }}
              >
                <BezentIcon name="documents" size={16} />
                <span>View Drafts ({draftsList.length})</span>
              </button>
            </Inline>
          }
        />
      </div>

      {/* Region B: Edge-to-Edge Chapter Focus Carousel */}
      <ChapterFocusCarousel
        chapters={chapterSteps}
        activeId={activeSection}
        onSelectChapter={handleSelectChapter}
      />

      {/* Region C: Scrollable Active Tab Content */}
      <div
        ref={contentContainerRef}
        className="bezent-modal__body employee-registration-workspace-content"
      >
        <Stack gap="xl">
          {/* Toast Alert Banner */}
          {toastMsg && (
            <Alert variant="info" onDismiss={() => setToastMsg(null)}>
              {toastMsg}
            </Alert>
          )}

          {/* Animated Chapter Page Container */}
          <div key={activeSection} className="bezent-chapter-page-transition">
            {/* Integrated Chapter Section Header (Number integrated into heading) */}
          <div className="bezent-chapter-header">
            <div className="bezent-chapter-header__top">
              <span className="bezent-chapter-header__position-badge">
                {currentChapter.stepNumber} / {String(chapterSteps.length).padStart(2, '0')}
              </span>
            </div>
            <h1 className="bezent-chapter-header__title">{currentChapter.title}</h1>
            {currentChapter.description && (
              <p className="bezent-chapter-header__desc">{currentChapter.description}</p>
            )}
          </div>

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

                  {/* Form Engine company custom fields */}
                  {registrationConfig.customFields('general').map((f) => (
                    <FormField
                      key={f.key}
                      label={f.label}
                      htmlFor={`form-engine-${f.key}`}
                      required={f.required}
                      span={f.width === 'full' ? 'full' : undefined}
                      helperText={f.description ?? undefined}
                    >
                      {f.type === 'dropdown' || f.type === 'select' || f.type === 'radio' ? (
                        <Select
                          id={`form-engine-${f.key}`}
                          options={[
                            { value: '', label: `Select ${f.label}` },
                            ...(Array.isArray(f.config?.options)
                              ? (f.config.options as Array<{ value: string; label: string }>).map(
                                  (opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                  }),
                                )
                              : []),
                          ]}
                        />
                      ) : (
                        <Input
                          id={`form-engine-${f.key}`}
                          type={
                            f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'
                          }
                          placeholder={`Enter ${f.label}`}
                        />
                      )}
                    </FormField>
                  ))}

                  {/* 1. Employee ID */}
                  <RegistrationField
                    fieldKey="general.employeeId"
                    value={employeeId}
                    htmlFor="reg-employee-id"
                    helperText="System-assigned unique ID (auto-generated by backend)"
                  >
                    <Input
                      id="reg-employee-id"
                      value={employeeId}
                      readOnly
                      disabled
                      placeholder="Generating..."
                    />
                  </RegistrationField>

                  {/* 2. Employment Type */}
                  <RegistrationField
                    fieldKey="general.employmentType"
                    value={employmentType}
                    htmlFor="reg-employment-type"
                  >
                    <Select
                      id="reg-employment-type"
                      value={employmentType}
                      onChange={(e) => handleEmploymentTypeChange(e.target.value)}
                      options={[
                        { value: 'full_time', label: 'Full Time' },
                        { value: 'part_time', label: 'Part Time' },
                        { value: 'contract', label: 'Contract (Fixed Term)' },
                        { value: 'intern', label: 'Intern (Fixed Term)' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </RegistrationField>

                  {/* 3. Employment Status */}
                  <RegistrationField
                    fieldKey="general.employmentStatus"
                    value={employmentStatus}
                    htmlFor="reg-employment-status"
                    helperText="System-controlled: Pending Activation"
                  >
                    <Input
                      id="reg-employment-status"
                      value="Pending Activation"
                      readOnly
                      disabled
                    />
                  </RegistrationField>
                </FormGrid>
              </FormSection>

              {/* Section 2: Employment Details */}
              <FormSection
                title="Employment Details"
                description="Role, structure, placement, and reporting hierarchy"
              >
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* 4. Department */}
                  <RegistrationField
                    fieldKey="general.department"
                    value={department}
                    htmlFor="reg-department"
                  >
                    <Select
                      id="reg-department"
                      value={department}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      options={[
                        { value: 'Engineering', label: 'Engineering' },
                        { value: 'Human Resources', label: 'Human Resources' },
                        { value: 'Finance', label: 'Finance' },
                        { value: 'Operations', label: 'Operations' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </RegistrationField>

                  {/* 5. Team (Filtered based on selected Department) */}
                  <RegistrationField fieldKey="general.team" value={team} htmlFor="reg-team">
                    <Select
                      id="reg-team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      options={(DEPARTMENT_TEAMS[department] || ['General', 'other']).map((t) => ({
                        value: t,
                        label: t,
                      }))}
                    />
                  </RegistrationField>

                  {/* 6. Designation */}
                  <RegistrationField
                    fieldKey="general.designation"
                    value={designation}
                    htmlFor="reg-designation"
                  >
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
                  </RegistrationField>

                  {/* 7. Grade / Level */}
                  <RegistrationField
                    fieldKey="general.gradeLevel"
                    value={gradeLevel}
                    htmlFor="reg-grade-level"
                  >
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
                  </RegistrationField>

                  {/* 8. Reporting Manager */}
                  <RegistrationField
                    fieldKey="general.reportingManager"
                    value={reportingManager}
                    htmlFor="reg-reporting-manager"
                    disabled
                  >
                    <Input
                      id="reg-reporting-manager"
                      value={reportingManager || ''}
                      placeholder="Select Manager..."
                      disabled
                    />
                  </RegistrationField>

                  {/* 9. Organisation Unit */}
                  <RegistrationField
                    fieldKey="general.organisationUnit"
                    value={organisationUnit}
                    htmlFor="reg-org-unit"
                  >
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
                  </RegistrationField>

                  {/* 10. Office Location */}
                  <RegistrationField
                    fieldKey="general.officeLocation"
                    value={officeLocation}
                    htmlFor="reg-office-location"
                  >
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
                  </RegistrationField>

                  {/* 11. Joining Date */}
                  <RegistrationField
                    fieldKey="general.joiningDate"
                    value={joiningDate}
                    htmlFor="reg-joining-date"
                  >
                    <Input
                      id="reg-joining-date"
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                    />
                  </RegistrationField>
                </FormGrid>
              </FormSection>

              {/* Section 3: Additional Information */}
              <FormSection
                title="Additional Information"
                description="Timeline, recruitment source, and employment terms"
              >
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* 12. Confirmed Date of Joining */}
                  <RegistrationField
                    fieldKey="general.confirmedJoiningDate"
                    value={confirmedJoiningDate}
                    htmlFor="reg-confirmed-joining-date"
                    helperText="Agreed candidate joining date (distinct from probation confirmation)"
                  >
                    <Input
                      id="reg-confirmed-joining-date"
                      type="date"
                      value={confirmedJoiningDate}
                      onChange={(e) => setConfirmedJoiningDate(e.target.value)}
                    />
                  </RegistrationField>

                  {/* 13. End Date (Conditional for fixed-term) */}
                  {isFixedTerm && (
                    <RegistrationField
                      fieldKey="general.endDate"
                      value={endDate}
                      htmlFor="reg-end-date"
                      helperText="Contract or internship termination date"
                    >
                      <Input
                        id="reg-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </RegistrationField>
                  )}

                  {/* 14. Source of Hire */}
                  <RegistrationField
                    fieldKey="general.sourceOfHire"
                    value={sourceOfHire}
                    htmlFor="reg-source-of-hire"
                  >
                    <Select
                      id="reg-source-of-hire"
                      value={sourceOfHire}
                      onChange={(e) => setSourceOfHire(e.target.value)}
                      options={[
                        { value: 'direct_applicant', label: 'Direct Applicant' },
                        { value: 'referral', label: 'Employee Referral' },
                        { value: 'agency', label: 'Agency' },
                        { value: 'campus', label: 'Campus' },
                        { value: 'linkedin', label: 'LinkedIn' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </RegistrationField>

                  {/* 14b. Referral ID Input (Shown only when Source of Hire = Employee Referral) */}
                  {sourceOfHire === 'referral' && (
                    <RegistrationField
                      fieldKey="general.referralId"
                      value={referralId}
                      htmlFor="reg-referral-id"
                      helperText={
                        referralLoading
                          ? 'Resolving referral code...'
                          : resolvedReferrer
                            ? `✓ Referred by: ${resolvedReferrer.name}${resolvedReferrer.designation ? ` (${resolvedReferrer.designation})` : ''}`
                            : referralError || "Enter the referring employee's unique Referral ID"
                      }
                      error={referralError || undefined}
                    >
                      <Input
                        id="reg-referral-id"
                        type="text"
                        placeholder="e.g. REF-EMP0001"
                        value={referralId}
                        onChange={(e) => setReferralId(e.target.value)}
                        error={referralError || undefined}
                      />
                    </RegistrationField>
                  )}

                  {/* 15. Probation Period */}
                  <RegistrationField
                    fieldKey="general.probationPeriod"
                    value={probationPeriod}
                    htmlFor="reg-probation-period"
                    helperText={
                      calculatedProbationEndDate
                        ? `Probation ends on: ${calculatedProbationEndDate}`
                        : probationPeriod === 'no_probation'
                          ? 'No probation period applicable'
                          : undefined
                    }
                  >
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
                  </RegistrationField>

                  {/* 16. Notice Period */}
                  <RegistrationField
                    fieldKey="general.noticePeriod"
                    value={noticePeriod}
                    htmlFor="reg-notice-period"
                  >
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
                  </RegistrationField>
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
              onEditSection={handleSelectChapter}
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

                {/* Form Engine Custom Fields for this section */}
                {(() => {
                  const engineFields = registrationConfig.customFields(activeSection);
                  if (engineFields.length === 0) return null;
                  return (
                    <Card padding="md">
                      <Stack gap="sm">
                        <CardTitle>
                          {allSections.find((s) => s.id === activeSection)?.label ||
                            'Custom Fields'}
                        </CardTitle>
                        <FormGrid columns={2} layout="horizontal" labelWidth="md">
                          {engineFields.map((f) => (
                            <RegistrationField
                              key={f.key}
                              fieldKey={f.key}
                              value={customFieldValues[f.key] ?? ''}
                              span={f.width === 'full' ? 'full' : undefined}
                            >
                              {f.type === 'dropdown' || f.type === 'select' ? (
                                <Select
                                  value={(customFieldValues[f.key] as string) || ''}
                                  onChange={(e) =>
                                    setCustomFieldValues((prev) => ({
                                      ...prev,
                                      [f.key]: e.target.value,
                                    }))
                                  }
                                  options={[
                                    { value: '', label: `Select ${f.label}` },
                                    ...(
                                      (f.config?.options as Array<{
                                        value: string;
                                        label: string;
                                      }>) ?? []
                                    ).map((opt) => ({
                                      value: opt.value,
                                      label: opt.label,
                                    })),
                                  ]}
                                />
                              ) : (
                                <Input
                                  value={(customFieldValues[f.key] as string) || ''}
                                  onChange={(e) =>
                                    setCustomFieldValues((prev) => ({
                                      ...prev,
                                      [f.key]: e.target.value,
                                    }))
                                  }
                                  type={
                                    f.type === 'date'
                                      ? 'date'
                                      : f.type === 'number'
                                        ? 'number'
                                        : 'text'
                                  }
                                  placeholder={f.description || `Enter ${f.label}`}
                                />
                              )}
                            </RegistrationField>
                          ))}
                        </FormGrid>
                      </Stack>
                    </Card>
                  );
                })()}
              </Stack>
            </Stack>
          )}
          </div>
        </Stack>
      </div>

      {/* Region D: Persistent Bottom Action Bar (Non-scrolling) */}
      <div className="bezent-modal__footer employee-registration-workspace-actions">
        <Toolbar
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
      </div>

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
