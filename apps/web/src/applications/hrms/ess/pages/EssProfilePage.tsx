import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  FormSection,
  FormGrid,
  Select,
  Input,
  Checkbox,
  ProgressBar,
  Tabs,
  EmployeeCartoonAvatar,
  type TabItem,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  essApi,
  type EssFullProfile,
  type EssPersonalDetails,
  type EssEmergencyContact,
  type EssFamilyMember,
  type EssRequest,
  type EssDocument,
  type EssCareerEvent,
} from '../api/essApi';
import { EssProfessionalTab } from '../components/EssProfessionalTab';
import { EssBankIdTab } from '../components/EssBankIdTab';
import { EssChangeRequestsTab } from '../components/EssChangeRequestsTab';
import { EssPrivacyTab } from '../components/EssPrivacyTab';

const PROFILE_TABS: TabItem[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'professional', label: 'Professional' },
  { id: 'bank_id', label: 'Bank & ID' },
  { id: 'change_requests', label: 'Change Requests' },
  { id: 'privacy', label: 'Privacy' },
];

const CHANGE_SECTIONS = [
  { value: 'personal', label: 'Basic & Identity Details (Name, DOB, Gender, Marital Status)' },
  { value: 'address', label: 'Permanent / Residential Address' },
  { value: 'emergency_contact', label: 'Emergency Contact Hierarchy' },
  { value: 'bank_account', label: 'Salary Bank Account' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Other', label: 'Other' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

interface CompletenessItem {
  key: string;
  label: string;
  completed: boolean;
  weight: number;
  reminder: string;
}

function calculateProfileCompleteness(profile: EssFullProfile): {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingItems: Array<{ label: string; reminder: string }>;
} {
  const { employee, personal, emergencyContacts, familyMembers, bankAccount } = profile;
  const items: CompletenessItem[] = [
    {
      key: 'name',
      label: 'Legal Full Name',
      completed: Boolean(employee.firstName?.trim()),
      weight: 10,
      reminder: 'Ensure official workforce name matches legal identification documents.',
    },
    {
      key: 'dob_gender',
      label: 'Date of Birth & Gender',
      completed: Boolean(personal?.dateOfBirth && personal?.gender),
      weight: 15,
      reminder: 'Provide verified date of birth and gender for statutory compliance.',
    },
    {
      key: 'blood_group',
      label: 'Blood Group',
      completed: Boolean(personal?.bloodGroup?.trim()),
      weight: 5,
      reminder: 'Record blood group for occupational healthcare and safety protocols.',
    },
    {
      key: 'nationality',
      label: 'Nationality',
      completed: Boolean(personal?.nationality?.trim()),
      weight: 5,
      reminder: 'Confirm legal nationality for statutory tax and labor reporting.',
    },
    {
      key: 'personal_email',
      label: 'Personal Email',
      completed: Boolean(personal?.personalEmail?.trim()),
      weight: 15,
      reminder: 'Add a personal email address for non-corporate communications.',
    },
    {
      key: 'phone',
      label: 'Primary / Home Phone',
      completed: Boolean(personal?.homePhone?.trim() || personal?.workPhone?.trim()),
      weight: 15,
      reminder: 'Provide personal telephone number for urgent workplace reachability.',
    },
    {
      key: 'address',
      label: 'Residential Address',
      completed: Boolean(personal?.addressStreet?.trim() && personal?.addressCity?.trim()),
      weight: 15,
      reminder: 'Submit residential street address with district and postal code.',
    },
    {
      key: 'emergency',
      label: 'Primary Emergency Contact',
      completed: emergencyContacts.some(
        (c) => c.priority === 'primary' && Boolean(c.name?.trim()) && Boolean(c.phone?.trim()),
      ),
      weight: 10,
      reminder: 'Designate at least one primary emergency contact with verified phone.',
    },
    {
      key: 'family',
      label: 'Family & Dependents',
      completed: familyMembers.length > 0 && Boolean(familyMembers[0]?.name?.trim()),
      weight: 5,
      reminder: 'Register family dependents for corporate welfare records.',
    },
    {
      key: 'bank',
      label: 'Salary Bank Account',
      completed: Boolean(bankAccount?.maskedAccountNumber),
      weight: 5,
      reminder: 'Verify salary disbursement bank details with payroll administration.',
    },
  ];

  let earned = 0;
  let totalWeight = 0;
  const missingList: Array<{ label: string; reminder: string }> = [];

  for (const it of items) {
    totalWeight += it.weight;
    if (it.completed) {
      earned += it.weight;
    } else {
      missingList.push({ label: it.label, reminder: it.reminder });
    }
  }

  const percentage = Math.min(100, Math.round((earned / totalWeight) * 100));
  const completedCount = items.filter((i) => i.completed).length;

  return {
    percentage,
    completedCount,
    totalCount: items.length,
    missingItems: missingList,
  };
}

export function EssProfilePage() {
  const [profile, setProfile] = useState<EssFullProfile | null>(null);
  const [changeRequests, setChangeRequests] = useState<EssRequest[]>([]);
  const [documents, setDocuments] = useState<EssDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('personal');
  const [showMissingTray, setShowMissingTray] = useState(false);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // ── Contact Details Edit State ──────────────────────────────────────
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<EssPersonalDetails>>({});
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // ── Emergency Contact Modal State ───────────────────────────────────
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [editingEmergencyIndex, setEditingEmergencyIndex] = useState<number | null>(null);
  const [emergencyForm, setEmergencyForm] = useState<EssEmergencyContact>({
    priority: 'primary',
    name: '',
    relationship: 'Spouse',
    phone: '',
    email: '',
    address: '',
    isPrivate: false,
  });
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  // ── Family Member Modal State ───────────────────────────────────────
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
  const [familyForm, setFamilyForm] = useState<EssFamilyMember>({
    name: '',
    relationship: 'Spouse',
    dateOfBirth: '',
    phone: '',
  });
  const [savingFamily, setSavingFamily] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);

  // ── Profile Change Request Modal State ──────────────────────────────
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeSection, setChangeSection] = useState<
    'personal' | 'emergency_contact' | 'bank_account' | 'address'
  >('personal');
  const [changeField, setChangeField] = useState('dateOfBirth');
  const [changeProposedValue, setChangeProposedValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // ── Reporting Manager State ─────────────────────────────────────────
  const [reportingManager, setReportingManager] = useState<{
    name: string;
    designation?: string;
  } | null>(null);

  // ── Career History State ────────────────────────────────────────────
  const [careerHistory, setCareerHistory] = useState<EssCareerEvent[]>([]);
  const [careerHistoryLoading, setCareerHistoryLoading] = useState(false);
  const [careerHistoryError, setCareerHistoryError] = useState<string | null>(null);

  // ── Data Loader ─────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCareerHistoryLoading(true);
    setCareerHistoryError(null);
    try {
      const [profileData, requestsData, dashboardData, docsRes, careerRes] = await Promise.all([
        essApi.getProfile(),
        essApi.getProfileChangeRequests().catch(() => []),
        essApi.getDashboard().catch(() => null),
        essApi.getDocuments().catch(() => ({ documents: [] })),
        essApi.getCareerHistory().catch((err) => {
          setCareerHistoryError(err?.message || 'Failed to load career history');
          return null;
        }),
      ]);
      setProfile(profileData);
      setChangeRequests(requestsData);
      setDocuments(docsRes?.documents || []);

      if (careerRes) {
        setCareerHistory(careerRes);
      } else if (profileData.careerHistory) {
        setCareerHistory(profileData.careerHistory);
      }

      const mgrName =
        profileData.employee.reportingManagerName ||
        dashboardData?.myTeam?.reportingManagerName ||
        null;
      const mgrDesig =
        profileData.employee.reportingManagerDesignation ||
        dashboardData?.myTeam?.reportingManagerDesignation ||
        undefined;
      if (mgrName) {
        setReportingManager({
          name: mgrName,
          designation: mgrDesig,
        });
      }

      // Initialize contact form from profile
      const pd = profileData.personal || {};
      setContactForm({
        personalEmail: pd.personalEmail ?? '',
        homePhone: pd.homePhone ?? '',
        businessPhone: pd.businessPhone ?? '',
        workPhone: pd.workPhone ?? '',
        addressStreet: pd.addressStreet ?? '',
        addressLine2: pd.addressLine2 ?? '',
        addressCity: pd.addressCity ?? '',
        addressDistrict: pd.addressDistrict ?? '',
        addressState: pd.addressState ?? '',
        addressPostalCode: pd.addressPostalCode ?? '',
        addressCountry: pd.addressCountry ?? 'India',
        isPermanentSameAsCurrent: pd.isPermanentSameAsCurrent ?? true,
        permanentAddressStreet: pd.permanentAddressStreet ?? '',
        permanentAddressLine2: pd.permanentAddressLine2 ?? '',
        permanentAddressCity: pd.permanentAddressCity ?? '',
        permanentAddressDistrict: pd.permanentAddressDistrict ?? '',
        permanentAddressState: pd.permanentAddressState ?? '',
        permanentAddressPostalCode: pd.permanentAddressPostalCode ?? '',
        permanentAddressCountry: pd.permanentAddressCountry ?? 'India',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve employee profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Completeness Analysis ───────────────────────────────────────────
  const completeness = useMemo(() => {
    if (!profile) return { percentage: 0, completedCount: 0, totalCount: 0, missingItems: [] };
    return calculateProfileCompleteness(profile);
  }, [profile]);

  // Pending change requests count
  const pendingRequests = useMemo(() => {
    return changeRequests.filter((r) => r.status === 'pending');
  }, [changeRequests]);

  // ── Contact Details Handlers ────────────────────────────────────────
  const handleStartEditContact = () => {
    if (!profile) return;
    const pd = profile.personal || {};
    setContactForm({
      personalEmail: pd.personalEmail ?? '',
      homePhone: pd.homePhone ?? '',
      businessPhone: pd.businessPhone ?? '',
      workPhone: pd.workPhone ?? '',
      addressStreet: pd.addressStreet ?? '',
      addressLine2: pd.addressLine2 ?? '',
      addressCity: pd.addressCity ?? '',
      addressDistrict: pd.addressDistrict ?? '',
      addressState: pd.addressState ?? '',
      addressPostalCode: pd.addressPostalCode ?? '',
      addressCountry: pd.addressCountry ?? 'India',
      isPermanentSameAsCurrent: pd.isPermanentSameAsCurrent ?? true,
      permanentAddressStreet: pd.permanentAddressStreet ?? '',
      permanentAddressLine2: pd.permanentAddressLine2 ?? '',
      permanentAddressCity: pd.permanentAddressCity ?? '',
      permanentAddressDistrict: pd.permanentAddressDistrict ?? '',
      permanentAddressState: pd.permanentAddressState ?? '',
      permanentAddressPostalCode: pd.permanentAddressPostalCode ?? '',
      permanentAddressCountry: pd.permanentAddressCountry ?? 'India',
    });
    setContactError(null);
    setIsEditingContact(true);
  };

  const handleCancelContactEdit = () => {
    setIsEditingContact(false);
    setContactError(null);
  };

  const handleSaveContactDetails = async () => {
    setSavingContact(true);
    setContactError(null);
    try {
      if (
        contactForm.personalEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.personalEmail.trim())
      ) {
        throw new Error('Please enter a valid personal email address format.');
      }

      const updated = await essApi.updateContactDetails(contactForm);
      setProfile(updated);
      setIsEditingContact(false);
      setStatusMessage({
        type: 'success',
        title: 'Contact Details Updated',
        description:
          'Your contact telephone numbers and residential addresses have been saved successfully.',
      });
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Failed to update contact details');
    } finally {
      setSavingContact(false);
    }
  };

  // ── Emergency Contact Handlers ──────────────────────────────────────
  const handleOpenAddEmergency = () => {
    const hasPrimary = profile?.emergencyContacts.some((c) => c.priority === 'primary');
    setEditingEmergencyIndex(null);
    setEmergencyForm({
      priority: hasPrimary ? 'secondary' : 'primary',
      name: '',
      relationship: 'Spouse',
      phone: '',
      email: '',
      address: '',
      isPrivate: false,
    });
    setEmergencyError(null);
    setEmergencyModalOpen(true);
  };

  const handleOpenEditEmergency = (index: number) => {
    if (!profile) return;
    const c = profile.emergencyContacts[index];
    if (!c) return;
    setEditingEmergencyIndex(index);
    setEmergencyForm({
      priority: c.priority,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email ?? '',
      address: c.address ?? '',
      isPrivate: c.isPrivate ?? false,
    });
    setEmergencyError(null);
    setEmergencyModalOpen(true);
  };

  const handleSaveEmergencyContact = async () => {
    if (!profile) return;
    setSavingEmergency(true);
    setEmergencyError(null);
    try {
      if (!emergencyForm.name.trim()) throw new Error('Contact name is required.');
      if (!emergencyForm.relationship.trim()) throw new Error('Relationship is required.');
      if (!emergencyForm.phone.trim()) throw new Error('Primary contact phone number is required.');

      const currentList = [...profile.emergencyContacts];
      let nextList: EssEmergencyContact[];

      if (editingEmergencyIndex !== null) {
        // Editing existing contact
        nextList = currentList.map((item, idx) =>
          idx === editingEmergencyIndex ? { ...emergencyForm } : item,
        );
      } else {
        // Adding new contact
        if (currentList.length >= 2) {
          throw new Error(
            'You may configure at most two emergency contacts (primary and secondary).',
          );
        }
        nextList = [...currentList, { ...emergencyForm }];
      }

      // If this contact is primary, downgrade other contacts to secondary
      if (emergencyForm.priority === 'primary') {
        nextList = nextList.map((item, idx) => {
          if (editingEmergencyIndex !== null && idx === editingEmergencyIndex) return item;
          if (editingEmergencyIndex === null && idx === nextList.length - 1) return item;
          return { ...item, priority: 'secondary' as const };
        });
      }

      // Verify at least one primary
      if (!nextList.some((c) => c.priority === 'primary') && nextList.length > 0) {
        nextList[0] = { ...nextList[0]!, priority: 'primary' };
      }

      const updated = await essApi.updateEmergencyContacts(nextList);
      setProfile(updated);
      setEmergencyModalOpen(false);
      setStatusMessage({
        type: 'success',
        title: 'Emergency Contacts Updated',
        description: 'Emergency contacts hierarchy has been persisted to your employee record.',
      });
    } catch (err: unknown) {
      setEmergencyError(err instanceof Error ? err.message : 'Failed to save emergency contact');
    } finally {
      setSavingEmergency(false);
    }
  };

  const handleSetPrimaryEmergency = async (index: number) => {
    if (!profile) return;
    try {
      const nextList = profile.emergencyContacts.map((c, idx) => ({
        ...c,
        priority: idx === index ? ('primary' as const) : ('secondary' as const),
      }));
      const updated = await essApi.updateEmergencyContacts(nextList);
      setProfile(updated);
      setStatusMessage({
        type: 'success',
        title: 'Primary Emergency Contact Updated',
        description: `${nextList[index]?.name} is now designated as your primary emergency contact.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        title: 'Action Failed',
        description: err instanceof Error ? err.message : 'Failed to set primary emergency contact',
      });
    }
  };

  const handleRemoveEmergencyContact = async (index: number) => {
    if (!profile) return;
    try {
      const nextList = profile.emergencyContacts.filter((_, idx) => idx !== index);
      // If removed was primary and secondary exists, promote secondary to primary
      if (nextList.length > 0 && !nextList.some((c) => c.priority === 'primary')) {
        nextList[0] = { ...nextList[0]!, priority: 'primary' };
      }
      const updated = await essApi.updateEmergencyContacts(nextList);
      setProfile(updated);
      setStatusMessage({
        type: 'info',
        title: 'Emergency Contact Removed',
        description: 'The selected contact has been removed from your profile.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        title: 'Action Failed',
        description: err instanceof Error ? err.message : 'Failed to remove contact',
      });
    }
  };

  // ── Family Member Handlers ──────────────────────────────────────────
  const handleOpenAddFamily = () => {
    setEditingFamilyIndex(null);
    setFamilyForm({
      name: '',
      relationship: 'Spouse',
      dateOfBirth: '',
      phone: '',
    });
    setFamilyError(null);
    setFamilyModalOpen(true);
  };

  const handleOpenEditFamily = (index: number) => {
    if (!profile) return;
    const f = profile.familyMembers[index];
    if (!f) return;
    setEditingFamilyIndex(index);
    setFamilyForm({
      name: f.name,
      relationship: f.relationship,
      dateOfBirth: f.dateOfBirth ?? '',
      phone: f.phone ?? '',
    });
    setFamilyError(null);
    setFamilyModalOpen(true);
  };

  const handleSaveFamilyMember = async () => {
    if (!profile) return;
    setSavingFamily(true);
    setFamilyError(null);
    try {
      if (!familyForm.name.trim()) throw new Error('Family member name is required.');
      if (!familyForm.relationship.trim()) throw new Error('Relationship is required.');
      if (familyForm.dateOfBirth) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(familyForm.dateOfBirth)) {
          throw new Error('Date of birth must follow YYYY-MM-DD format.');
        }
        if (familyForm.dateOfBirth > new Date().toISOString().slice(0, 10)) {
          throw new Error('Date of birth cannot be a future date.');
        }
      }

      const currentList = [...profile.familyMembers];
      let nextList: EssFamilyMember[];

      if (editingFamilyIndex !== null) {
        nextList = currentList.map((item, idx) =>
          idx === editingFamilyIndex ? { ...familyForm } : item,
        );
      } else {
        nextList = [...currentList, { ...familyForm }];
      }

      const updated = await essApi.updateFamilyMembers(nextList);
      setProfile(updated);
      setFamilyModalOpen(false);
      setStatusMessage({
        type: 'success',
        title: 'Family Members Updated',
        description: 'Dependent record has been saved to your workforce file.',
      });
    } catch (err: unknown) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to save family member');
    } finally {
      setSavingFamily(false);
    }
  };

  const handleRemoveFamilyMember = async (index: number) => {
    if (!profile) return;
    try {
      const nextList = profile.familyMembers.filter((_, idx) => idx !== index);
      const updated = await essApi.updateFamilyMembers(nextList);
      setProfile(updated);
      setStatusMessage({
        type: 'info',
        title: 'Family Member Removed',
        description: 'The selected dependent has been removed from your profile.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        title: 'Action Failed',
        description: err instanceof Error ? err.message : 'Failed to remove member',
      });
    }
  };

  // ── Profile Change Request Handlers ─────────────────────────────────
  const handleOpenChangeRequest = (
    prefilledField?: string,
    prefilledSection?: 'personal' | 'emergency_contact' | 'bank_account' | 'address',
  ) => {
    if (prefilledSection) {
      setChangeSection(prefilledSection);
    } else {
      setChangeSection('personal');
    }
    if (prefilledField) {
      setChangeField(prefilledField);
    } else {
      setChangeField('name');
    }
    setChangeProposedValue('');
    setChangeReason('');
    setChangeError(null);
    setChangeModalOpen(true);
  };

  const handleSubmitChangeRequest = async () => {
    setSubmittingChange(true);
    setChangeError(null);
    try {
      if (changeSection === 'bank_account') {
        throw new Error(
          'Bank account modifications cannot be submitted through generic change requests. Please visit the Bank & ID tab to review HR-guided statutory verification procedures.',
        );
      }
      if (!changeProposedValue.trim()) {
        throw new Error('Please specify the proposed new value.');
      }
      if (!changeReason.trim()) {
        throw new Error('Please provide an official justification/reason for HR verification.');
      }

      const fieldLabels: Record<string, string> = {
        name: 'Legal Full Name',
        dateOfBirth: 'Date of Birth',
        gender: 'Gender',
        maritalStatus: 'Marital Status',
        bloodGroup: 'Blood Group',
        nationality: 'Nationality',
        addressStreet: 'Residential Street Address',
        addressCity: 'City / Town',
        addressPostalCode: 'Postal PIN Code',
        addressState: 'State / Province',
        emergencyContactName: 'Primary Contact Name',
        emergencyContactPhone: 'Primary Contact Phone',
        emergencyContactRelationship: 'Relationship to Contact',
      };

      const fieldLabel = fieldLabels[changeField] || changeField;
      const subject = `Correction Request: ${fieldLabel}`;

      const newReq = await essApi.submitProfileChangeRequest({
        subject,
        section: changeSection,
        reason: changeReason.trim(),
        changes: {
          field: changeField,
          fieldLabel,
          proposedValue: changeProposedValue.trim(),
        },
      });

      setChangeRequests((prev) => [newReq, ...prev]);
      setChangeModalOpen(false);
      setStatusMessage({
        type: 'success',
        title: 'Change Request Submitted (#HR-REQ)',
        description: `Your request to update ${fieldLabel} has been logged for HR & Payroll review. Tracking ID: ${newReq.id}.`,
      });
    } catch (err: unknown) {
      setChangeError(err instanceof Error ? err.message : 'Failed to submit change request');
    } finally {
      setSubmittingChange(false);
    }
  };

  // ── Render States ───────────────────────────────────────────────────
  if (loading) return <LoadingState label="Loading employee profile..." />;
  if (error)
    return (
      <Page>
        <Alert variant="error" title="Failed to Load Profile">
          <Stack gap="sm">
            <span>{error}</span>
            <Inline gap="sm">
              <Button variant="secondary" size="sm" onClick={loadProfile}>
                Retry Loading
              </Button>
            </Inline>
          </Stack>
        </Alert>
      </Page>
    );

  if (!profile)
    return (
      <Page>
        <EmptyState
          title="Profile Unavailable"
          description="Your employee master profile record could not be found."
        />
      </Page>
    );

  const { employee: emp, personal: pd, emergencyContacts, familyMembers } = profile;

  return (
    <Page>
      {/* ── Page Header ───────────────────────────────────────────── */}
      <PageHeader
        title="My Profile"
        subtitle="View and manage employee identity, contact information, emergency hierarchy, and statutory records"
        actions={
          <Inline gap="sm">
            <Button
              id="ess-profile-request-change-top-btn"
              variant="secondary"
              leftIcon={<BezentIcon name="edit" size={16} />}
              onClick={() => handleOpenChangeRequest()}
            >
              Request Identity Change
            </Button>
          </Inline>
        }
      />

      {/* ── Status Notification Alert ─────────────────────────────── */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type}
          title={statusMessage.title}
          onDismiss={() => setStatusMessage(null)}
        >
          {statusMessage.description}
        </Alert>
      )}

      {/* ── Pending HR Approval Notice ────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <Card variant="tint-amber" padding="sm">
          <Inline gap="sm" align="center" justify="between" wrap>
            <Inline gap="xs" align="center">
              <BezentIcon name="clock" size={18} />
              <strong>
                You have {pendingRequests.length} profile change request(s) awaiting HR review.
              </strong>
              <span>
                (Approved records will update automatically once verified by human resources).
              </span>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('change_requests')}>
              View Requests
            </Button>
          </Inline>
        </Card>
      )}

      {/* ── Phase 1: Employee Profile Header ──────────────────────── */}
      <div className="ess-profile-header-card">
        <Inline gap="lg" align="center" justify="between" wrap>
          <div className="ess-profile-header-identity">
            <div className="ess-profile-header-avatar">
              <EmployeeCartoonAvatar
                size="lg"
                gender={pd?.gender || emp.gender}
                avatarPreference={emp.avatarPreference}
                employeeName={`${emp.firstName} ${emp.lastName ?? ''}`}
              />
            </div>
            <div className="ess-profile-header-meta">
              <div className="ess-profile-header-name-row">
                <h2 className="ess-profile-header-name">
                  {emp.firstName} {emp.lastName ?? ''}
                </h2>
                <Badge
                  variant={emp.employmentStatus === 'active' ? 'success' : 'neutral'}
                  size="sm"
                >
                  {formatLabel(emp.employmentStatus || 'active')}
                </Badge>
              </div>

              <div className="ess-profile-header-subrow">
                <strong>{emp.designationTitle || 'Designation unassigned'}</strong>
                <span className="ess-profile-dot-separator">•</span>
                <span>{emp.departmentName || 'Department unassigned'}</span>
                {emp.locationName && (
                  <>
                    <span className="ess-profile-dot-separator">•</span>
                    <span>{emp.locationName}</span>
                  </>
                )}
              </div>

              <div className="ess-profile-header-subrow">
                <span>
                  Employee ID: <strong>{emp.employeeNumber}</strong>
                </span>
                <span className="ess-profile-dot-separator">•</span>
                <span>
                  Official Email: <strong>{emp.email}</strong>
                </span>
                <span className="ess-profile-dot-separator">•</span>
                <span>
                  Reporting Manager:{' '}
                  <strong>
                    {reportingManager?.name || emp.reportingManagerName || 'Not assigned'}
                  </strong>
                  {reportingManager?.designation && ` (${reportingManager.designation})`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Employment Tenure Card */}
          <div className="ess-profile-header-quick-card">
            <span className="ess-profile-header-quick-label">
              <BezentIcon name="calendar" size={14} />
              Date of Joining
            </span>
            <span className="ess-profile-header-quick-val">
              {emp.joiningDate
                ? new Date(emp.joiningDate).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </span>
            <span className="ess-profile-header-quick-type">
              Employment: {formatLabel(emp.employmentType || 'full_time')}
            </span>
          </div>
        </Inline>
      </div>

      {/* ── Compact Profile Completeness Strip ─────────────────────── */}
      <div className="ess-profile-completeness-strip">
        <div className="ess-profile-completeness-left">
          <BezentIcon name="check" size={16} />
          <span className="ess-profile-completeness-title">Profile Completeness</span>
          <Badge variant={completeness.percentage >= 80 ? 'success' : 'warning'} size="sm">
            {completeness.percentage}%
          </Badge>
          <div className="ess-profile-completeness-bar-wrap">
            <ProgressBar
              value={completeness.percentage}
              max={100}
              variant={completeness.percentage >= 80 ? 'success' : 'primary'}
              size="sm"
              aria-label="Profile completeness progress"
            />
          </div>
          <span className="ess-profile-completeness-count">
            {completeness.completedCount} of {completeness.totalCount} attributes verified
          </span>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setShowMissingTray(!showMissingTray)}>
          {showMissingTray ? 'Hide Missing Details' : 'Review Missing Details'}
        </Button>
      </div>

      {showMissingTray && completeness.missingItems.length > 0 && (
        <div className="ess-profile-completeness-tray">
          <Card variant="flat" padding="sm">
            <Stack gap="xs">
              <strong>Actionable Steps to Reach 100% Completeness:</strong>
              <Grid columns={2} gap="sm">
                {completeness.missingItems.map((item, idx) => (
                  <Card key={idx} variant="default" padding="sm">
                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <BezentIcon name="warning" size={14} />
                        <strong>{item.label}</strong>
                      </Inline>
                      <span>{item.reminder}</span>
                    </Stack>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </Card>
        </div>
      )}

      {/* ── Horizontal Tab Navigation ─────────────────────────────── */}
      <div className="ess-profile-tabs-wrapper">
        <Tabs
          items={PROFILE_TABS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id)}
          variant="underline"
        />
      </div>

      {/* ── Tab: Personal (Option A — Expanded Sections) ──────────── */}
      {activeTab === 'personal' && (
        <div className="ess-profile-sections-stack">
          {/* ── Section 1: Basic Information ────────────────────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="information" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Basic Information</h3>
                  <p className="ess-profile-section-desc">
                    Official employee identity and organization placement recorded on corporate file
                  </p>
                </div>
              </div>
              <Button
                id="ess-profile-basic-change-btn"
                variant="secondary"
                size="sm"
                leftIcon={<BezentIcon name="edit" size={14} />}
                onClick={() => handleOpenChangeRequest('name')}
              >
                Request Change
              </Button>
            </div>

            <div className="ess-profile-field-grid">
              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Legal Full Name</span>
                </div>
                <span className="ess-profile-field-value">
                  {emp.firstName} {emp.lastName ?? ''}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Employee ID</span>
                  <Badge variant="neutral" size="sm">
                    Read-Only
                  </Badge>
                </div>
                <span className="ess-profile-field-value">{emp.employeeNumber}</span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Official Work Email</span>
                </div>
                <span className="ess-profile-field-value">{emp.email || '—'}</span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Designation</span>
                </div>
                <span className="ess-profile-field-value">
                  {emp.designationTitle || 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Department</span>
                </div>
                <span className="ess-profile-field-value">
                  {emp.departmentName || 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Reporting Manager</span>
                </div>
                <span className="ess-profile-field-value">
                  {reportingManager?.name || emp.reportingManagerName || 'Not assigned'}
                  {reportingManager?.designation && ` (${reportingManager.designation})`}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Work Location</span>
                </div>
                <span className="ess-profile-field-value">
                  {emp.locationName || 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Date of Joining</span>
                </div>
                <span className="ess-profile-field-value">
                  {emp.joiningDate ? formatDate(emp.joiningDate) : 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Employment Type</span>
                </div>
                <span className="ess-profile-field-value">
                  {formatLabel(emp.employmentType || 'full_time')}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Employment Status</span>
                </div>
                <span className="ess-profile-field-value">
                  {formatLabel(emp.employmentStatus || 'active')}
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 2: Personal Details ─────────────────────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="personal" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Personal Details</h3>
                  <p className="ess-profile-section-desc">
                    Demographic and statutory attributes used for statutory compliance and records
                  </p>
                </div>
              </div>
              <Button
                id="ess-profile-personal-change-btn"
                variant="secondary"
                size="sm"
                leftIcon={<BezentIcon name="edit" size={14} />}
                onClick={() => handleOpenChangeRequest('dateOfBirth')}
              >
                Request Change
              </Button>
            </div>

            <div className="ess-profile-field-grid">
              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Date of Birth</span>
                </div>
                <span className={`ess-profile-field-value ${!pd?.dateOfBirth ? 'is-empty' : ''}`}>
                  {pd?.dateOfBirth ? formatDate(pd.dateOfBirth) : 'Not specified'}
                </span>
                <span className="ess-profile-field-helper">
                  Used for statutory retirement, benefits, and welfare calculation.
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Gender</span>
                </div>
                <span className={`ess-profile-field-value ${!pd?.gender ? 'is-empty' : ''}`}>
                  {pd?.gender ? formatLabel(pd.gender) : 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Marital Status</span>
                </div>
                <span className={`ess-profile-field-value ${!pd?.maritalStatus ? 'is-empty' : ''}`}>
                  {pd?.maritalStatus ? formatLabel(pd.maritalStatus) : 'Not specified'}
                </span>
                <span className="ess-profile-field-helper">
                  Required for dependent insurance and family benefit entitlements.
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Blood Group</span>
                </div>
                <span className={`ess-profile-field-value ${!pd?.bloodGroup ? 'is-empty' : ''}`}>
                  {pd?.bloodGroup || 'Not specified'}
                </span>
                <span className="ess-profile-field-helper">
                  Important for medical response during onsite health incidents.
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Nationality</span>
                </div>
                <span className={`ess-profile-field-value ${!pd?.nationality ? 'is-empty' : ''}`}>
                  {pd?.nationality || 'Not specified'}
                </span>
                <span className="ess-profile-field-helper">
                  Workplace compliance and taxation jurisdiction.
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">Native Language</span>
                </div>
                <span
                  className={`ess-profile-field-value ${!pd?.nativeLanguage ? 'is-empty' : ''}`}
                >
                  {pd?.nativeLanguage || 'Not specified'}
                </span>
              </div>

              <div className="ess-profile-field-item">
                <div className="ess-profile-field-label-row">
                  <span className="ess-profile-field-label">{"Father's / Guardian's Name"}</span>
                </div>
                <span
                  className={`ess-profile-field-value ${!pd?.fatherName && !pd?.guardianName ? 'is-empty' : ''}`}
                >
                  {pd?.fatherName || pd?.guardianName || 'Not specified'}
                </span>
                <span className="ess-profile-field-helper">
                  Statutory parentage or legal guardianship record.
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Contact Information ──────────────────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="mail" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Contact Information</h3>
                  <p className="ess-profile-section-desc">
                    Workplace communication channels and personal telecommunication lines
                  </p>
                </div>
              </div>
              {!isEditingContact && (
                <Button
                  id="ess-profile-contact-edit-btn"
                  variant="secondary"
                  size="sm"
                  leftIcon={<BezentIcon name="edit" size={14} />}
                  onClick={handleStartEditContact}
                >
                  Edit Contact Details
                </Button>
              )}
            </div>

            {contactError && (
              <Alert variant="error" title="Validation Error">
                {contactError}
              </Alert>
            )}

            {!isEditingContact ? (
              <div className="ess-profile-field-grid">
                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Work Email</span>
                    <Badge variant="neutral" size="sm">
                      Company Managed
                    </Badge>
                  </div>
                  <span className="ess-profile-field-value">{emp.email}</span>
                </div>

                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Personal Email</span>
                  </div>
                  <span
                    className={`ess-profile-field-value ${!pd?.personalEmail ? 'is-empty' : ''}`}
                  >
                    {pd?.personalEmail || 'Not provided'}
                  </span>
                </div>

                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Primary / Home Phone</span>
                  </div>
                  <span className={`ess-profile-field-value ${!pd?.homePhone ? 'is-empty' : ''}`}>
                    {pd?.homePhone || 'Not provided'}
                  </span>
                </div>

                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Alternate / Business Phone</span>
                  </div>
                  <span
                    className={`ess-profile-field-value ${!pd?.businessPhone && !pd?.workPhone ? 'is-empty' : ''}`}
                  >
                    {pd?.businessPhone || pd?.workPhone || 'Not provided'}
                  </span>
                </div>
              </div>
            ) : (
              /* Contact Edit Mode */
              <Stack gap="md">
                <FormSection title="Telecommunications & Email">
                  <FormGrid columns={2}>
                    <Input
                      label="Work Email"
                      value={emp.email}
                      disabled
                      helperText="Company email address is managed by corporate IT."
                    />

                    <Input
                      label="Personal Email"
                      placeholder="e.g. yourname@gmail.com"
                      value={contactForm.personalEmail ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, personalEmail: e.target.value })
                      }
                      helperText="For communications outside company infrastructure."
                    />

                    <Input
                      label="Primary / Home Phone"
                      placeholder="e.g. +91 98765 43210"
                      value={contactForm.homePhone ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, homePhone: e.target.value })
                      }
                      helperText="Primary mobile number for direct contact."
                    />

                    <Input
                      label="Alternate Phone"
                      placeholder="e.g. +91 98765 43211"
                      value={contactForm.businessPhone ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, businessPhone: e.target.value })
                      }
                      helperText="Secondary contact number."
                    />
                  </FormGrid>
                </FormSection>

                <Inline gap="sm" justify="end">
                  <Button
                    id="ess-contact-cancel-btn"
                    variant="secondary"
                    onClick={handleCancelContactEdit}
                    disabled={savingContact}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="ess-contact-save-btn"
                    variant="primary"
                    onClick={handleSaveContactDetails}
                    loading={savingContact}
                  >
                    Save Contact Details
                  </Button>
                </Inline>
              </Stack>
            )}
          </div>

          {/* ── Section 4: Address Information ──────────────────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="location" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Address Information</h3>
                  <p className="ess-profile-section-desc">
                    Current residential domicile and permanent records on workforce file
                  </p>
                </div>
              </div>
              {!isEditingContact && (
                <Button
                  id="ess-profile-address-edit-btn"
                  variant="secondary"
                  size="sm"
                  leftIcon={<BezentIcon name="edit" size={14} />}
                  onClick={handleStartEditContact}
                >
                  Edit Addresses
                </Button>
              )}
            </div>

            {!isEditingContact ? (
              <div className="ess-profile-field-grid">
                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Current Residential Address</span>
                  </div>
                  {pd?.addressStreet ? (
                    <div className="ess-profile-address-block">
                      <div>{pd.addressStreet}</div>
                      {pd.addressLine2 && <div>{pd.addressLine2}</div>}
                      <div>{[pd.addressCity, pd.addressDistrict].filter(Boolean).join(', ')}</div>
                      <div>
                        {[pd.addressState, pd.addressPostalCode].filter(Boolean).join(' - ')}
                      </div>
                      <div>{pd.addressCountry || 'India'}</div>
                    </div>
                  ) : (
                    <span className="ess-profile-field-value is-empty">
                      No residential address specified.
                    </span>
                  )}
                </div>

                <div className="ess-profile-field-item">
                  <div className="ess-profile-field-label-row">
                    <span className="ess-profile-field-label">Permanent Address</span>
                    {pd?.isPermanentSameAsCurrent && (
                      <Badge variant="info" size="sm">
                        Same as Current
                      </Badge>
                    )}
                  </div>
                  {pd?.isPermanentSameAsCurrent ? (
                    <span className="ess-profile-field-value">
                      Identical to current residential address.
                    </span>
                  ) : pd?.permanentAddressStreet ? (
                    <div className="ess-profile-address-block">
                      <div>{pd.permanentAddressStreet}</div>
                      {pd.permanentAddressLine2 && <div>{pd.permanentAddressLine2}</div>}
                      <div>
                        {[pd.permanentAddressCity, pd.permanentAddressDistrict]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      <div>
                        {[pd.permanentAddressState, pd.permanentAddressPostalCode]
                          .filter(Boolean)
                          .join(' - ')}
                      </div>
                      <div>{pd.permanentAddressCountry || 'India'}</div>
                    </div>
                  ) : (
                    <span className="ess-profile-field-value is-empty">
                      No permanent address specified.
                    </span>
                  )}
                  <span className="ess-profile-field-helper">
                    Legal permanent domicile verified on identification proofs.
                  </span>
                </div>
              </div>
            ) : (
              /* Address Edit Mode */
              <Stack gap="md">
                <FormSection title="Current Residential Address">
                  <FormGrid columns={2}>
                    <Input
                      label="Street Address Line 1"
                      placeholder="House / Flat No., Building, Street Name"
                      value={contactForm.addressStreet ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressStreet: e.target.value })
                      }
                    />

                    <Input
                      label="Street Address Line 2"
                      placeholder="Apartment, Suite, Landmark"
                      value={contactForm.addressLine2 ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressLine2: e.target.value })
                      }
                    />

                    <Input
                      label="City / Town"
                      placeholder="e.g. Chennai"
                      value={contactForm.addressCity ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressCity: e.target.value })
                      }
                    />

                    <Input
                      label="District"
                      placeholder="e.g. Chennai"
                      value={contactForm.addressDistrict ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressDistrict: e.target.value })
                      }
                    />

                    <Input
                      label="State / Province"
                      placeholder="e.g. Tamil Nadu"
                      value={contactForm.addressState ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressState: e.target.value })
                      }
                    />

                    <Input
                      label="Postal Code (PIN)"
                      placeholder="e.g. 600001"
                      value={contactForm.addressPostalCode ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressPostalCode: e.target.value })
                      }
                    />

                    <Input
                      label="Country"
                      placeholder="e.g. India"
                      value={contactForm.addressCountry ?? ''}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, addressCountry: e.target.value })
                      }
                    />
                  </FormGrid>
                </FormSection>

                <FormSection title="Permanent Address">
                  <Stack gap="sm">
                    <Checkbox
                      id="ess-perm-same-curr"
                      label="Permanent Address is identical to Current Residential Address"
                      checked={contactForm.isPermanentSameAsCurrent ?? true}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          isPermanentSameAsCurrent: e.target.checked,
                        })
                      }
                    />

                    {!contactForm.isPermanentSameAsCurrent && (
                      <FormGrid columns={2}>
                        <Input
                          label="Permanent Street Address"
                          placeholder="Permanent house number and street"
                          value={contactForm.permanentAddressStreet ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressStreet: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent Address Line 2"
                          placeholder="Apartment, Landmark"
                          value={contactForm.permanentAddressLine2 ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressLine2: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent City"
                          placeholder="City"
                          value={contactForm.permanentAddressCity ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressCity: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent District"
                          placeholder="District"
                          value={contactForm.permanentAddressDistrict ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressDistrict: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent State"
                          placeholder="State"
                          value={contactForm.permanentAddressState ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressState: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent Postal Code"
                          placeholder="PIN Code"
                          value={contactForm.permanentAddressPostalCode ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressPostalCode: e.target.value,
                            })
                          }
                        />

                        <Input
                          label="Permanent Country"
                          placeholder="Country"
                          value={contactForm.permanentAddressCountry ?? ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanentAddressCountry: e.target.value,
                            })
                          }
                        />
                      </FormGrid>
                    )}
                  </Stack>
                </FormSection>

                <Inline gap="sm" justify="end">
                  <Button
                    id="ess-address-cancel-btn"
                    variant="secondary"
                    onClick={handleCancelContactEdit}
                    disabled={savingContact}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="ess-address-save-btn"
                    variant="primary"
                    onClick={handleSaveContactDetails}
                    loading={savingContact}
                  >
                    Save Address Details
                  </Button>
                </Inline>
              </Stack>
            )}
          </div>

          {/* ── Section 5: Emergency Contacts ───────────────────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="employees" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Emergency Contacts</h3>
                  <p className="ess-profile-section-desc">
                    Designated primary and secondary contacts notified in medical or workplace
                    exigencies
                  </p>
                </div>
              </div>
              {emergencyContacts.length < 2 && (
                <Button
                  id="ess-add-emergency-btn"
                  variant="secondary"
                  size="sm"
                  leftIcon={<BezentIcon name="add" size={14} />}
                  onClick={handleOpenAddEmergency}
                >
                  Add Emergency Contact
                </Button>
              )}
            </div>

            {emergencyContacts.length > 0 ? (
              <div className="ess-profile-emergency-grid">
                {emergencyContacts.map((contact, idx) => (
                  <div key={idx} className="ess-profile-emergency-card">
                    <div className="ess-profile-emergency-card-header">
                      <Inline gap="xs" align="center">
                        <BezentIcon name="employees" size={16} />
                        <strong>{contact.name}</strong>
                      </Inline>
                      <Badge
                        variant={contact.priority === 'primary' ? 'info' : 'neutral'}
                        size="sm"
                      >
                        {contact.priority === 'primary' ? 'Primary Contact' : 'Secondary Contact'}
                      </Badge>
                    </div>

                    <Stack gap="xs">
                      <div>
                        Relationship: <strong>{contact.relationship}</strong>
                      </div>
                      <div>
                        Phone: <strong>{contact.phone}</strong>
                      </div>
                      {contact.email && <div>Email: {contact.email}</div>}
                      {contact.address && <div>Address: {contact.address}</div>}
                    </Stack>

                    <div className="ess-profile-emergency-actions">
                      {contact.priority === 'secondary' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimaryEmergency(idx)}
                        >
                          Set as Primary
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditEmergency(idx)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmergencyContact(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                size="compact"
                title="No Emergency Contacts Configured"
                description="Designate a primary contact for urgent medical or workplace reachability."
                primaryAction={{
                  label: 'Add Emergency Contact',
                  onClick: handleOpenAddEmergency,
                }}
              />
            )}
          </div>

          {/* ── Supplementary Section: Family & Dependents ──────────── */}
          <div className="ess-profile-section-panel">
            <div className="ess-profile-section-header">
              <div className="ess-profile-section-title-wrap">
                <div className="ess-profile-section-icon-badge">
                  <BezentIcon name="employees" size={16} />
                </div>
                <div>
                  <h3 className="ess-profile-section-heading">Family & Dependents</h3>
                  <p className="ess-profile-section-desc">
                    Registered family members and eligible welfare beneficiaries
                  </p>
                </div>
              </div>
              <Button
                id="ess-add-family-btn"
                variant="secondary"
                size="sm"
                leftIcon={<BezentIcon name="add" size={14} />}
                onClick={handleOpenAddFamily}
              >
                Add Family Member
              </Button>
            </div>

            {familyMembers.length > 0 ? (
              <div className="ess-profile-emergency-grid">
                {familyMembers.map((member, idx) => (
                  <div key={idx} className="ess-profile-emergency-card">
                    <div className="ess-profile-emergency-card-header">
                      <Inline gap="xs" align="center">
                        <BezentIcon name="employees" size={16} />
                        <strong>{member.name}</strong>
                      </Inline>
                      <Badge variant="info" size="sm">
                        {member.relationship}
                      </Badge>
                    </div>

                    <Stack gap="xs">
                      <div>
                        Date of Birth:{' '}
                        <strong>
                          {member.dateOfBirth ? formatDate(member.dateOfBirth) : 'Not specified'}
                        </strong>
                      </div>
                      {member.phone && (
                        <div>
                          Phone: <strong>{member.phone}</strong>
                        </div>
                      )}
                    </Stack>

                    <div className="ess-profile-emergency-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditFamily(idx)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFamilyMember(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                size="compact"
                title="No Family Members Registered"
                description="Register dependents and beneficiaries for corporate healthcare and welfare records."
                primaryAction={{
                  label: 'Add Family Member',
                  onClick: handleOpenAddFamily,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Professional (Seven Finalized Sections) ─────────── */}
      {activeTab === 'professional' && profile && (
        <EssProfessionalTab
          profile={profile}
          documents={documents}
          reportingManagerDesignation={reportingManager?.designation}
          careerHistory={careerHistory}
          careerHistoryLoading={careerHistoryLoading}
          careerHistoryError={careerHistoryError}
        />
      )}

      {/* ── Tab: Bank & ID (Four Finalized Sections) ─────────────── */}
      {activeTab === 'bank_id' && profile && (
        <EssBankIdTab profile={profile} documents={documents} />
      )}

      {/* ── Tab: Change Requests (V1 Production Tab) ─────────────── */}
      {activeTab === 'change_requests' && (
        <EssChangeRequestsTab
          changeRequests={changeRequests}
          loading={loading}
          onRefresh={loadProfile}
          onRequestNewChange={() => handleOpenChangeRequest()}
        />
      )}

      {/* ── Tab: Privacy (V1 Production Tab) ────────────────────── */}
      {activeTab === 'privacy' && profile && (
        <EssPrivacyTab
          profile={profile}
          onNavigateToChangeRequests={() => setActiveTab('change_requests')}
          onRequestCorrection={() => handleOpenChangeRequest()}
        />
      )}

      {/* ── Emergency Contact Modal ───────────────────────────────── */}
      <Modal
        isOpen={emergencyModalOpen}
        title={editingEmergencyIndex !== null ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        description="Configure trusted contact information for urgent workplace emergencies"
        onClose={() => setEmergencyModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setEmergencyModalOpen(false)}
              disabled={savingEmergency}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEmergencyContact}
              loading={savingEmergency}
            >
              Save Contact
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {emergencyError && (
            <Alert variant="error" title="Validation Error">
              {emergencyError}
            </Alert>
          )}

          <FormSection title="Contact Credentials">
            <FormGrid columns={1}>
              <Input
                label="Contact Full Name"
                placeholder="Full name of emergency contact person"
                value={emergencyForm.name}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                required
              />

              <Select
                label="Relationship to Employee"
                value={emergencyForm.relationship}
                onChange={(e) =>
                  setEmergencyForm({ ...emergencyForm, relationship: e.target.value })
                }
                options={RELATIONSHIP_OPTIONS}
              />

              <Input
                label="Primary Phone Number"
                placeholder="e.g. +91 98765 43210"
                value={emergencyForm.phone}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                required
              />

              <Input
                label="Email Address (Optional)"
                placeholder="e.g. contact@example.com"
                value={emergencyForm.email ?? ''}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, email: e.target.value })}
              />

              <Input
                label="Residential Address (Optional)"
                placeholder="Street address or city"
                value={emergencyForm.address ?? ''}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, address: e.target.value })}
              />

              <Select
                label="Priority Hierarchy"
                value={emergencyForm.priority}
                onChange={(e) =>
                  setEmergencyForm({
                    ...emergencyForm,
                    priority: e.target.value as 'primary' | 'secondary',
                  })
                }
                options={[
                  { value: 'primary', label: 'Primary (First point of contact)' },
                  { value: 'secondary', label: 'Secondary (Fallback contact)' },
                ]}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Family Member Modal ───────────────────────────────────── */}
      <Modal
        isOpen={familyModalOpen}
        title={editingFamilyIndex !== null ? 'Edit Family Member' : 'Add Family Member'}
        description="Register dependents and family members on corporate record"
        onClose={() => setFamilyModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setFamilyModalOpen(false)}
              disabled={savingFamily}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveFamilyMember} loading={savingFamily}>
              Save Member
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {familyError && (
            <Alert variant="error" title="Validation Error">
              {familyError}
            </Alert>
          )}

          <FormSection title="Dependent Information">
            <FormGrid columns={1}>
              <Input
                label="Full Name"
                placeholder="Legal name of family member"
                value={familyForm.name}
                onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                required
              />

              <Select
                label="Relationship"
                value={familyForm.relationship}
                onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                options={RELATIONSHIP_OPTIONS}
              />

              <Input
                type="date"
                label="Date of Birth"
                value={familyForm.dateOfBirth ?? ''}
                onChange={(e) => setFamilyForm({ ...familyForm, dateOfBirth: e.target.value })}
                helperText="Format: YYYY-MM-DD. Cannot be in the future."
              />

              <Input
                label="Contact Phone (Optional)"
                placeholder="e.g. +91 98765 43210"
                value={familyForm.phone ?? ''}
                onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Phase 4 / Phase 9: Profile Change Request Modal ──────── */}
      <Modal
        isOpen={changeModalOpen}
        title="Request Identity & Profile Change"
        description="Verified statutory details require HR validation before updating your permanent file"
        onClose={() => setChangeModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setChangeModalOpen(false)}
              disabled={submittingChange}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitChangeRequest}
              loading={submittingChange}
              disabled={submittingChange || changeSection === 'bank_account'}
            >
              Submit for HR Review
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {changeError && (
            <Alert variant="error" title="Submission Error">
              {changeError}
            </Alert>
          )}

          <span>
            To preserve organizational compliance and data integrity, core employment and statutory
            fields must be verified by HR Administration before changes are applied.
          </span>

          <FormSection title="Requested Correction Details">
            <FormGrid columns={1}>
              <Select
                label="Category Section"
                value={changeSection}
                onChange={(e) => {
                  const s = e.target.value as typeof changeSection;
                  setChangeSection(s);
                  setChangeProposedValue('');
                  if (s === 'personal') setChangeField('name');
                  else if (s === 'address') setChangeField('addressStreet');
                  else if (s === 'emergency_contact') setChangeField('emergencyContactName');
                  else setChangeField('');
                }}
                options={CHANGE_SECTIONS}
              />

              {changeSection === 'bank_account' ? (
                <Alert variant="warning" title="Controlled Statutory Verification Protocol">
                  Salary bank account modifications cannot be submitted through generic change
                  requests. To safeguard employee payroll funds, please refer to the Bank &amp; ID
                  tab for instructions and submit verified cancelled cheque documentation directly
                  to HR Administration.
                </Alert>
              ) : (
                <>
                  {changeSection === 'personal' && (
                    <Select
                      label="Specific Field to Correct"
                      value={changeField}
                      onChange={(e) => {
                        setChangeField(e.target.value);
                        setChangeProposedValue('');
                      }}
                      options={[
                        { value: 'name', label: 'Legal Full Name' },
                        { value: 'dateOfBirth', label: 'Date of Birth' },
                        { value: 'gender', label: 'Gender' },
                        { value: 'maritalStatus', label: 'Marital Status' },
                        { value: 'bloodGroup', label: 'Blood Group' },
                        { value: 'nationality', label: 'Nationality' },
                      ]}
                    />
                  )}

                  {changeSection === 'address' && (
                    <Select
                      label="Specific Field to Correct"
                      value={changeField}
                      onChange={(e) => {
                        setChangeField(e.target.value);
                        setChangeProposedValue('');
                      }}
                      options={[
                        { value: 'addressStreet', label: 'Residential Street Address' },
                        { value: 'addressCity', label: 'City / Town' },
                        { value: 'addressPostalCode', label: 'Postal PIN Code' },
                        { value: 'addressState', label: 'State / Province' },
                      ]}
                    />
                  )}

                  {changeSection === 'emergency_contact' && (
                    <Select
                      label="Specific Field to Correct"
                      value={changeField}
                      onChange={(e) => {
                        setChangeField(e.target.value);
                        setChangeProposedValue('');
                      }}
                      options={[
                        { value: 'emergencyContactName', label: 'Primary Contact Name' },
                        { value: 'emergencyContactPhone', label: 'Primary Contact Phone' },
                        {
                          value: 'emergencyContactRelationship',
                          label: 'Relationship to Contact',
                        },
                      ]}
                    />
                  )}

                  {changeField === 'gender' ? (
                    <Select
                      label="Proposed Value"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                      options={GENDER_OPTIONS}
                    />
                  ) : changeField === 'maritalStatus' ? (
                    <Select
                      label="Proposed Value"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                      options={MARITAL_STATUS_OPTIONS}
                    />
                  ) : changeField === 'bloodGroup' ? (
                    <Select
                      label="Proposed Value"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                      options={BLOOD_GROUP_OPTIONS}
                    />
                  ) : changeField === 'emergencyContactRelationship' ? (
                    <Select
                      label="Proposed Relationship"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                      options={RELATIONSHIP_OPTIONS}
                    />
                  ) : changeField === 'dateOfBirth' ? (
                    <Input
                      type="date"
                      label="Proposed Date of Birth"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                    />
                  ) : (
                    <Input
                      label="Proposed New Value"
                      placeholder="Enter exact new legal value"
                      value={changeProposedValue}
                      onChange={(e) => setChangeProposedValue(e.target.value)}
                      required
                    />
                  )}

                  <Input
                    label="Official Reason / Justification"
                    placeholder="e.g. Legal name update after marriage, corrected birth certificate record"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    required
                    helperText="Provide context for HR verification."
                  />
                </>
              )}
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default EssProfilePage;
