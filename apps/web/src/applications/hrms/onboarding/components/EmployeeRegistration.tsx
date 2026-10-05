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
  Modal,
  Alert,
  PageHeader,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { GeneralInformation } from './GeneralInformation';
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
import {
  type RegistrationFormData,
  INITIAL_REGISTRATION_DATA,
  toReviewSectionData,
  type Chapter01GeneralState,
  type Chapter02PersonalState,
  type Chapter03OnboardingState,
  type Chapter04SkillsState,
  type Chapter05EmergencyState,
  type Chapter06AccountsState,
  type Chapter07OnlineAccessState,
  type Chapter08WorkingHoursState,
  type Chapter09DocumentsState,
} from '../types/registration.types';

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

export interface EmployeeRegistrationProps {
  isOpen?: boolean;
  onCancel: () => void;
  onSave?: (data: Record<string, unknown>) => void;
  onSubmit?: (formData: RegistrationFormData) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  createdEmployee?: { id: string; employeeNumber?: string | null; name?: string } | null;
  initialDraft?: EmployeeRegistrationDraft | null;
}

import { useCustomFieldsOptional } from '../../settings/context/CustomFieldsContext';
import { authorizedFetch } from '../../../../platform/auth';

export function EmployeeRegistration({
  isOpen = true,
  onCancel,
  onSave,
  onSubmit,
  isSubmitting = false,
  submitError = null,
  createdEmployee = null,
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
        contentContainerRef.current.scrollTop = 0;
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
        contentContainerRef.current.scrollTop = 0;
      }
    }
  }, [searchParams, allSections, activeSection]);

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  // Authoritative centralized registration form state
  const [formData, setFormData] = useState<RegistrationFormData>(() => {
    if (initialDraft?.formData) {
      return initialDraft.formData;
    }
    const base: RegistrationFormData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));
    if (initialDraft?.employeeId) {
      base.general.employeeId = initialDraft.employeeId;
    }
    if (initialDraft?.reviewData?.general) {
      base.general.employeeId = initialDraft.reviewData.general.employeeId || base.general.employeeId;
      base.general.department = initialDraft.reviewData.general.department || base.general.department;
      base.general.designation = initialDraft.reviewData.general.designation || base.general.designation;
      base.general.joiningDate = initialDraft.reviewData.general.joiningDate || base.general.joiningDate;
    }
    return base;
  });

  const updateGeneral = (fields: Partial<Chapter01GeneralState>) => {
    if (fields.employeeId) {
      setEmployeeId(fields.employeeId);
    }
    setFormData((prev) => ({
      ...prev,
      general: { ...prev.general, ...fields },
    }));
  };

  const updatePersonal = (fields: Partial<Chapter02PersonalState>) => {
    setFormData((prev) => ({
      ...prev,
      personal: { ...prev.personal, ...fields },
    }));
  };

  const updateOnboarding = (val: Chapter03OnboardingState) => {
    setFormData((prev) => ({ ...prev, onboarding: val }));
  };

  const updateSkills = (val: Chapter04SkillsState) => {
    setFormData((prev) => ({ ...prev, skills: val }));
  };

  const updateEmergency = (val: Chapter05EmergencyState) => {
    setFormData((prev) => ({ ...prev, emergency: val }));
  };

  const updateAccounts = (val: Chapter06AccountsState) => {
    setFormData((prev) => ({ ...prev, accounts: val }));
  };

  const updateOnlineAccess = (val: Chapter07OnlineAccessState) => {
    setFormData((prev) => ({ ...prev, onlineAccess: val }));
  };

  const updateWorkingHours = (val: Chapter08WorkingHoursState) => {
    setFormData((prev) => ({ ...prev, workingHours: val }));
  };

  const updateDocuments = (val: Chapter09DocumentsState) => {
    setFormData((prev) => ({ ...prev, documents: val }));
  };

  // General Form State
  const [employeeId, setEmployeeId] = useState(initialDraft?.employeeId || '');

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
            setFormData((prev) => ({
              ...prev,
              general: { ...prev.general, employeeId: body.data.employeeNumber },
            }));
          }
        })
        .catch(() => {
          // Fallback if backend dev server is temporarily uncontactable
          setEmployeeId('EMP2026001');
          setFormData((prev) => ({
            ...prev,
            general: { ...prev.general, employeeId: 'EMP2026001' },
          }));
        });
    }
  }, [initialDraft?.employeeId]);

  // Document Section State
  const [documentsList, setDocumentsList] = useState<DocumentItemState[]>(
    initialDraft?.reviewData?.documents?.items
      ? (initialDraft.reviewData.documents.items as unknown as DocumentItemState[])
      : INITIAL_DOCUMENTS,
  );
  const [isExperiencedHire, setIsExperiencedHire] = useState(
    initialDraft?.reviewData?.documents?.isExperiencedHire !== undefined
      ? initialDraft.reviewData.documents.isExperiencedHire
      : true,
  );
  const [passportPhoto, setPassportPhoto] = useState<PassportPhotoState>(
    initialDraft?.reviewData?.documents?.passportPhoto
      ? ({ file: null, previewUrl: '', ...initialDraft.reviewData.documents.passportPhoto } as PassportPhotoState)
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
  const reviewData: ReviewSectionData = useMemo(() => {
    return toReviewSectionData(formData);
  }, [formData]);

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

    const empName =
      [formData.personal.firstName, formData.personal.lastName].filter(Boolean).join(' ') ||
      formData.personal.preferredName ||
      reviewData.personal.fullName ||
      'Draft Employee';
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
      formData,
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

    if (draft.formData) {
      setFormData(draft.formData);
      if (draft.formData.general.employeeId) {
        setEmployeeId(draft.formData.general.employeeId);
      }
    } else if (draft.reviewData?.general?.employeeId) {
      setEmployeeId(draft.reviewData.general.employeeId);
    }
    if (draft.reviewData?.documents?.items) {
      setDocumentsList(draft.reviewData.documents.items as unknown as DocumentItemState[]);
    }
    if (draft.reviewData?.documents?.passportPhoto) {
      setPassportPhoto({ file: null, previewUrl: '', ...draft.reviewData.documents.passportPhoto } as PassportPhotoState);
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
      title: s.label,
      description: s.description ?? meta?.description ?? '',
    };
  });

  return (
    <>
      {/* Region A: Workspace Header */}
      <div className="bezent-modal__header bezent-modal__header--brand">
        <PageHeader
          title="Employee Registration"
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
              <h1 className="bezent-chapter-header__title">{currentChapter.title}</h1>
              {currentChapter.description && (
                <p className="bezent-chapter-header__desc">{currentChapter.description}</p>
              )}
            </div>

          {activeSection === 'general' ? (
            <GeneralInformation
              employeeId={employeeId}
              data={formData.general}
              onChange={updateGeneral}
            />
          ) : activeSection === 'personal' ? (
            <PersonalInformation
              employeeId={employeeId}
              data={formData.personal}
              onChange={updatePersonal}
            />
          ) : activeSection === 'onboarding' ? (
            <OnboardingSection value={formData.onboarding} onChange={updateOnboarding} />
          ) : activeSection === 'skills' ? (
            <SkillsSection value={formData.skills} onChange={updateSkills} />
          ) : activeSection === 'emergency' ? (
            <EmergencyContactSection value={formData.emergency} onChange={updateEmergency} />
          ) : activeSection === 'accounts' ? (
            <AccountsSection value={formData.accounts} onChange={updateAccounts} />
          ) : activeSection === 'online_access' ? (
            <OnlineAccessSection value={formData.onlineAccess} onChange={updateOnlineAccess} />
          ) : activeSection === 'working_hours' ? (
            <WorkingHoursSection value={formData.workingHours} onChange={updateWorkingHours} />
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
              onCreateEmployee={() => {
                if (onSubmit) {
                  void onSubmit(formData);
                } else if (onSave) {
                  onSave(reviewData as unknown as Record<string, unknown>);
                }
              }}
              isSubmitting={isSubmitting}
              submitError={submitError}
              createdEmployee={createdEmployee}
              onDone={onCancel}
            />
          ) : (
              <Stack gap="lg">
                <Toolbar
                  left={
                    <Inline gap="md" align="center">
                      <BezentIcon name="documents" size={22} />
                      <div>
                        <CardTitle>
                          {allSections.find((s) => s.id === activeSection)?.label ||
                            'Custom Section'}
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
