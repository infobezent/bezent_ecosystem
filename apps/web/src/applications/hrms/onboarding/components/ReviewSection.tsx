import { useState } from 'react';
import {
  Card,
  CardTitle,
  Label,
  Button,
  Badge,
  Modal,
  Alert,
  Stack,
  Inline,
  Grid,
  Divider,
} from '../../../../design-system';
import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationSectionId } from './EmployeeRegistration';
import { DocumentItemState } from './DocumentsSection';

export interface PendingFieldItem {
  sectionId: RegistrationSectionId;
  sectionLabel: string;
  fieldName: string;
  reason: string;
}

export interface ReviewSectionData {
  general: {
    employeeId: string;
    employmentType: string;
    employmentStatus: string;
    department: string;
    team: string;
    designation: string;
    gradeLevel: string;
    reportingManager: string | null;
    organisationUnit: string;
    officeLocation: string;
    joiningDate: string;
    confirmedJoiningDate: string;
    endDate: string;
    sourceOfHire: string;
    probationPeriod: string;
    noticePeriod: string;
  };
  personal: {
    fullName: string;
    gender: string;
    dob: string;
    maritalStatus: string;
    nationality: string;
    bloodGroup: string;
    differentlyAbled: string;
    aadhaarNumber: string;
    panNumber: string;
    personalEmail: string;
    mobilePhone: string;
    emergencyPhone: string;
    currentStreet: string;
    currentCity: string;
    currentState: string;
    currentPin: string;
    currentCountry: string;
    permanentStreet: string;
    permanentCity: string;
    permanentState: string;
    permanentPin: string;
    permanentCountry: string;
    familyMembers: Array<{
      id: string;
      name: string;
      relationship: string;
      dob: string;
      dependent: boolean;
    }>;
    nominationDetails: Array<{
      id: string;
      nomineeName: string;
      relationship: string;
      percentage: number;
      isMinor: boolean;
    }>;
  };
  onboarding: {
    tasks: Array<{
      id: string;
      taskDescription: string;
      assignedTo: string;
      dueDate: string;
      status: string;
    }>;
    assets: Array<{
      id: string;
      assetName: string;
      category: string;
      serialNumber: string;
      issueDate: string;
      quantity: number;
    }>;
  };
  skills: Array<{
    id: string;
    skill: string;
    skillType: string;
    levelType: string;
    level: string;
    levelDate: string;
    yearsExperience: number;
    examiner: string;
    verifiedBy: string;
    mentor: string;
  }>;
  emergency: {
    primaryContact: {
      name: string;
      relationship: string;
      phone: string;
      altPhone: string;
      email: string;
      address: string;
    };
    secondaryContact: {
      name: string;
      relationship: string;
      phone: string;
      altPhone: string;
      email: string;
      address: string;
    } | null;
  };
  accounts: {
    ifscCode: string;
    bankName: string;
    branchName: string;
    accountHolderName: string;
    accountNumber: string;
    reEnterAccountNumber: string;
    salaryStructure: string;
    payGrade: string;
    annualCtc: number;
    monthlyBasic: number;
    hra: number;
    specialAllowance: number;
    grossSalary: number;
    employerPf: number;
    gratuity: number;
    payrollGroup: string;
    salaryEffectiveDate: string;
    paymentFrequency: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    ptApplicable: boolean;
    taxRegime: string;
    benefits: Record<string, boolean>;
    medicalDetails: {
      provider: string;
      policyNumber: string;
      coverage: string;
      effectiveDate: string;
      expiryDate: string;
    };
  };
  onlineAccess: {
    username: string;
    officialEmail: string;
    invitationStatus: string;
    invitationSentDate: string;
    mfaRequired: boolean;
    forcePasswordSetup: boolean;
    accountActive: boolean;
    employeeRole: string;
    portalRoleScope: string;
    moduleAccess: Record<string, boolean>;
  };
  workingHours: {
    workSchedule: string;
    workingDays: string[];
    startTime: string;
    endTime: string;
    standardHours: string;
    breakMinutes: number;
    lunchMinutes: number;
    assignedCalendar: string;
    timeZone: string;
    assignedSchedule: string;
    holidays: Array<{ name: string; date: string; type: string }>;
  };
  documents: {
    isExperiencedHire: boolean;
    passportPhoto: {
      fileName: string;
      previewUrl: string;
      status: 'Pending' | 'Verified' | 'Rejected' | 'Not Required';
    };
    items: DocumentItemState[];
  };
}

interface ReviewSectionProps {
  data: ReviewSectionData;
  onEditSection: (sectionId: RegistrationSectionId) => void;
  onDeleteFamilyMember?: (id: string) => void;
  onDeleteNominee?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onDeleteAsset?: (id: string) => void;
  onDeleteSkill?: (id: string) => void;
  onDeleteSecondaryContact?: () => void;
  onDeleteDocument?: (id: string) => void;
  onCreateEmployee?: () => void;
}

export function ReviewSection({
  data,
  onEditSection,
  onDeleteFamilyMember,
  onDeleteNominee,
  onDeleteTask,
  onDeleteAsset,
  onDeleteSkill,
  onDeleteSecondaryContact,
  onDeleteDocument,
  onCreateEmployee,
}: ReviewSectionProps) {
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dynamic calculation of pending work across all sections
  const calculatePendingFields = (): PendingFieldItem[] => {
    const pending: PendingFieldItem[] = [];

    // 1. General
    if (!data.general.employeeId) {
      pending.push({
        sectionId: 'general',
        sectionLabel: 'General',
        fieldName: 'Employee ID',
        reason: 'Required',
      });
    }
    if (!data.general.joiningDate) {
      pending.push({
        sectionId: 'general',
        sectionLabel: 'General',
        fieldName: 'Joining Date',
        reason: 'Required',
      });
    }
    if (!data.general.department) {
      pending.push({
        sectionId: 'general',
        sectionLabel: 'General',
        fieldName: 'Department',
        reason: 'Required',
      });
    }

    // 2. Personal Information
    if (!data.personal.fullName) {
      pending.push({
        sectionId: 'personal',
        sectionLabel: 'Personal Information',
        fieldName: 'Full Name',
        reason: 'Required',
      });
    }
    if (!data.personal.personalEmail) {
      pending.push({
        sectionId: 'personal',
        sectionLabel: 'Personal Information',
        fieldName: 'Personal Email',
        reason: 'Required',
      });
    }
    if (!data.personal.mobilePhone) {
      pending.push({
        sectionId: 'personal',
        sectionLabel: 'Personal Information',
        fieldName: 'Mobile Phone',
        reason: 'Required',
      });
    }

    // 5. Emergency Contact
    if (!data.emergency.primaryContact.name || !data.emergency.primaryContact.phone) {
      pending.push({
        sectionId: 'emergency',
        sectionLabel: 'Emergency Contact',
        fieldName: 'Primary Contact Details',
        reason: 'Required',
      });
    }

    // 6. Accounts
    if (!data.accounts.accountNumber || !data.accounts.ifscCode) {
      pending.push({
        sectionId: 'accounts',
        sectionLabel: 'Accounts',
        fieldName: 'Bank Account / IFSC',
        reason: 'Required',
      });
    }
    if (data.accounts.accountNumber !== data.accounts.reEnterAccountNumber) {
      pending.push({
        sectionId: 'accounts',
        sectionLabel: 'Accounts',
        fieldName: 'Account Number Verification',
        reason: 'Numbers do not match',
      });
    }
    if (
      data.accounts.benefits.Medical &&
      (!data.accounts.medicalDetails.provider || !data.accounts.medicalDetails.policyNumber)
    ) {
      pending.push({
        sectionId: 'accounts',
        sectionLabel: 'Accounts',
        fieldName: 'Medical Insurance Details',
        reason: 'Medical benefit enabled — policy required',
      });
    }

    // 7. Online Access
    if (!data.onlineAccess.username || !data.onlineAccess.officialEmail) {
      pending.push({
        sectionId: 'online_access',
        sectionLabel: 'Online Access',
        fieldName: 'Username / Official Email',
        reason: 'Required',
      });
    }

    // 8. Working Hours
    if (!data.workingHours.workSchedule || !data.workingHours.timeZone) {
      pending.push({
        sectionId: 'working_hours',
        sectionLabel: 'Working Hours',
        fieldName: 'Work Schedule & Timezone',
        reason: 'Required',
      });
    }

    // 9. Documents
    if (!data.documents.passportPhoto.previewUrl && !data.documents.passportPhoto.fileName) {
      pending.push({
        sectionId: 'documents',
        sectionLabel: 'Documents',
        fieldName: 'Passport-size Photograph',
        reason: 'Missing Upload',
      });
    }

    data.documents.items.forEach((doc) => {
      // Ignore professional history docs if fresher
      if (!data.documents.isExperiencedHire && doc.category.includes('Professional History')) {
        return;
      }
      if (doc.isRequired) {
        if (!doc.fileName && !doc.file && !doc.filePreviewUrl && !doc.docNumber) {
          pending.push({
            sectionId: 'documents',
            sectionLabel: 'Documents',
            fieldName: `${doc.name}`,
            reason: 'Missing Upload',
          });
        } else if (doc.status === 'Pending') {
          pending.push({
            sectionId: 'documents',
            sectionLabel: 'Documents',
            fieldName: `${doc.name}`,
            reason: 'Pending Verification',
          });
        } else if (doc.status === 'Rejected') {
          pending.push({
            sectionId: 'documents',
            sectionLabel: 'Documents',
            fieldName: `${doc.name}`,
            reason: 'Verification Rejected',
          });
        }
      }
    });

    return pending;
  };

  const pendingItems = calculatePendingFields();
  const isComplete = pendingItems.length === 0;

  // Group pending items by section
  const sectionPendingMap: Record<string, PendingFieldItem[]> = {};
  pendingItems.forEach((item) => {
    if (!sectionPendingMap[item.sectionLabel]) {
      sectionPendingMap[item.sectionLabel] = [];
    }
    sectionPendingMap[item.sectionLabel]!.push(item);
  });

  const handleFinalCreateClick = () => {
    if (!isComplete) {
      setShowValidationModal(true);
    } else {
      setShowSuccessModal(true);
      if (onCreateEmployee) {
        onCreateEmployee();
      }
    }
  };

  const confirmAndDelete = (itemName: string, deleteCallback?: () => void) => {
    if (
      deleteCallback &&
      window.confirm(`Are you sure you want to delete ${itemName}? This action cannot be undone.`)
    ) {
      deleteCallback();
    }
  };

  const hasSectionPending = (secLabel: string) => Boolean(sectionPendingMap[secLabel]?.length);

  return (
    <Stack gap="xl">
      {/* Prominent REGISTRATION STATUS Alert */}
      <Alert variant={isComplete ? 'success' : 'warning'}>
        <Inline justify="between" align="center">
          <Stack gap="xs">
            <strong>{isComplete ? 'Registration Complete' : 'Pending Action Required'}</strong>
            <span>
              {isComplete
                ? 'All 10 registration sections complete and verified. Ready to create employee record.'
                : `${pendingItems.length} item${pendingItems.length > 1 ? 's' : ''} require attention across ${
                    Object.keys(sectionPendingMap).length
                  } sections.`}
            </span>
          </Stack>
          <Badge variant={isComplete ? 'success' : 'warning'}>
            {isComplete ? 'Verified' : 'Pending Items'}
          </Badge>
        </Inline>
      </Alert>

      {/* SECTION & FIELD PENDING WORK SUMMARY */}
      {!isComplete && (
        <Card variant="flat">
          <Stack gap="md">
            <CardTitle>Pending Work Summary ({pendingItems.length} Items)</CardTitle>

            <Stack gap="sm">
              {Object.entries(sectionPendingMap).map(([sectionLabel, items]) => (
                <Stack key={sectionLabel} gap="xs">
                  <span className="bezent-card__desc">
                    <strong>{sectionLabel}</strong> ({items.length} pending)
                  </span>
                  <Inline gap="xs" wrap>
                    {items.map((item, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditSection(item.sectionId)}
                      >
                        {item.fieldName} — {item.reason} →
                      </Button>
                    ))}
                  </Inline>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* 1. GENERAL INFORMATION */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>1. General Information</CardTitle>
              {hasSectionPending('General') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('general')}
            >
              Edit
            </Button>
          </Inline>

          <Grid columns={3} gap="md">
            <Stack gap="xs">
              <Label size="sm">Employee ID</Label>
              <strong>{data.general.employeeId || '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Employment Type</Label>
              <strong>{data.general.employmentType}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Employment Status</Label>
              <strong>{data.general.employmentStatus}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Department</Label>
              <strong>{data.general.department}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Team</Label>
              <strong>{data.general.team}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Designation</Label>
              <strong>{data.general.designation}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Grade / Level</Label>
              <strong>{data.general.gradeLevel}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Reporting Manager</Label>
              <strong>{data.general.reportingManager || 'Unassigned'}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Organisation Unit</Label>
              <strong>{data.general.organisationUnit}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Office Location</Label>
              <strong>{data.general.officeLocation}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Joining Date</Label>
              <strong>{data.general.joiningDate || '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Confirmed Joining Date</Label>
              <strong>{data.general.confirmedJoiningDate || '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Source of Hire</Label>
              <strong>{data.general.sourceOfHire}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Probation Period</Label>
              <strong>{data.general.probationPeriod}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Notice Period</Label>
              <strong>{data.general.noticePeriod}</strong>
            </Stack>
          </Grid>
        </Stack>
      </Card>

      {/* 2. PERSONAL INFORMATION */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>2. Personal Information</CardTitle>
              {hasSectionPending('Personal Information') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('personal')}
            >
              Edit
            </Button>
          </Inline>

          {/* Photo & Identity Summary */}
          <Inline gap="md" align="center">
            {data.documents.passportPhoto.previewUrl ? (
              <img
                src={data.documents.passportPhoto.previewUrl}
                alt="Passport Photo"
                className="bezent-photo-preview"
              />
            ) : (
              <div className="bezent-photo-placeholder">
                <BezentIcon name="employees" size={32} />
              </div>
            )}
            <Stack gap="xs">
              <CardTitle>{data.personal.fullName || 'Arun Kumar'}</CardTitle>
              <span className="bezent-card__desc">
                {data.personal.gender} • DOB: {data.personal.dob} • Nationality:{' '}
                {data.personal.nationality}
              </span>
              <span className="bezent-card__desc">
                Aadhaar: {data.personal.aadhaarNumber} | PAN: {data.personal.panNumber}
              </span>
            </Stack>
          </Inline>

          <Grid columns={3} gap="md">
            <Stack gap="xs">
              <Label size="sm">Personal Email</Label>
              <strong>{data.personal.personalEmail}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Mobile Phone</Label>
              <strong>{data.personal.mobilePhone}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Marital Status</Label>
              <strong>{data.personal.maritalStatus}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Blood Group</Label>
              <strong>{data.personal.bloodGroup}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Current Address</Label>
              <strong>
                {data.personal.currentStreet}, {data.personal.currentCity},{' '}
                {data.personal.currentState} - {data.personal.currentPin}
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Permanent Address</Label>
              <strong>
                {data.personal.permanentStreet}, {data.personal.permanentCity},{' '}
                {data.personal.permanentState} - {data.personal.permanentPin}
              </strong>
            </Stack>
          </Grid>

          {/* Family Members */}
          {data.personal.familyMembers.length > 0 && (
            <Stack gap="xs">
              <Divider />
              <Label size="md">Family Members ({data.personal.familyMembers.length})</Label>
              <Stack gap="xs">
                {data.personal.familyMembers.map((fam) => (
                  <Inline key={fam.id} justify="between" align="center">
                    <span>
                      <strong>{fam.name}</strong> ({fam.relationship}) — DOB: {fam.dob}{' '}
                      {fam.dependent && <Badge variant="neutral">Dependent</Badge>}
                    </span>
                    {onDeleteFamilyMember && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          confirmAndDelete(fam.name, () => onDeleteFamilyMember(fam.id))
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </Inline>
                ))}
              </Stack>
            </Stack>
          )}

          {/* Nomination Details */}
          {data.personal.nominationDetails.length > 0 && (
            <Stack gap="xs">
              <Divider />
              <Label size="md">Nomination Details ({data.personal.nominationDetails.length})</Label>
              <Stack gap="xs">
                {data.personal.nominationDetails.map((nom) => (
                  <Inline key={nom.id} justify="between" align="center">
                    <span>
                      <strong>{nom.nomineeName}</strong> ({nom.relationship}) — {nom.percentage}%
                      Allocation {nom.isMinor && <Badge variant="warning">Minor</Badge>}
                    </span>
                    {onDeleteNominee && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          confirmAndDelete(nom.nomineeName, () => onDeleteNominee(nom.id))
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </Inline>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* 3. ONBOARDING */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>3. Onboarding Tasks &amp; Assets</CardTitle>
              <Badge variant="success">Complete</Badge>
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('onboarding')}
            >
              Edit
            </Button>
          </Inline>

          {/* Tasks */}
          <Stack gap="xs">
            <Label size="md">Onboarding Tasks ({data.onboarding.tasks.length})</Label>
            <Stack gap="xs">
              {data.onboarding.tasks.map((tsk) => (
                <Inline key={tsk.id} justify="between" align="center">
                  <span>
                    <strong>{tsk.taskDescription}</strong> • Assigned: {tsk.assignedTo} • Due:{' '}
                    {tsk.dueDate} <Badge variant="neutral">{tsk.status}</Badge>
                  </span>
                  {onDeleteTask && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        confirmAndDelete(tsk.taskDescription, () => onDeleteTask(tsk.id))
                      }
                    >
                      Delete
                    </Button>
                  )}
                </Inline>
              ))}
            </Stack>
          </Stack>

          {/* Assets */}
          <Stack gap="xs">
            <Divider />
            <Label size="md">Assigned Assets ({data.onboarding.assets.length})</Label>
            <Stack gap="xs">
              {data.onboarding.assets.map((ast) => (
                <Inline key={ast.id} justify="between" align="center">
                  <span>
                    <strong>{ast.assetName}</strong> ({ast.category}) — S/N: {ast.serialNumber} •
                    Issued: {ast.issueDate} (Qty: {ast.quantity})
                  </span>
                  {onDeleteAsset && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmAndDelete(ast.assetName, () => onDeleteAsset(ast.id))}
                    >
                      Delete
                    </Button>
                  )}
                </Inline>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      {/* 4. SKILLS */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>4. Skills &amp; Qualifications</CardTitle>
              <Badge variant="success">Complete</Badge>
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('skills')}
            >
              Edit
            </Button>
          </Inline>

          <Stack gap="xs">
            {data.skills.map((skl) => (
              <Inline key={skl.id} justify="between" align="center">
                <Stack gap="xs">
                  <span>
                    <strong>{skl.skill}</strong> ({skl.skillType}) — Level: {skl.level} (
                    {skl.levelType}) • {skl.yearsExperience} yrs exp
                  </span>
                  <span className="bezent-card__desc">
                    Examiner: {skl.examiner} | Verified By: {skl.verifiedBy} | Mentor: {skl.mentor}
                  </span>
                </Stack>
                {onDeleteSkill && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmAndDelete(skl.skill, () => onDeleteSkill(skl.id))}
                  >
                    Delete
                  </Button>
                )}
              </Inline>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* 5. EMERGENCY CONTACT */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>5. Emergency Contacts</CardTitle>
              {hasSectionPending('Emergency Contact') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('emergency')}
            >
              Edit
            </Button>
          </Inline>

          <Grid columns={3} gap="md">
            <Stack gap="xs">
              <Label size="sm">Primary Contact</Label>
              <strong>
                {data.emergency.primaryContact.name} ({data.emergency.primaryContact.relationship})
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Primary Phone</Label>
              <strong>{data.emergency.primaryContact.phone}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Primary Email</Label>
              <strong>{data.emergency.primaryContact.email || '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Primary Address</Label>
              <strong>{data.emergency.primaryContact.address || '—'}</strong>
            </Stack>
          </Grid>

          {data.emergency.secondaryContact && (
            <Stack gap="xs">
              <Divider />
              <Inline justify="between" align="center">
                <Label size="md">Secondary Contact</Label>
                {onDeleteSecondaryContact && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmAndDelete('Secondary Contact', onDeleteSecondaryContact)}
                  >
                    Delete Contact
                  </Button>
                )}
              </Inline>
              <Grid columns={2} gap="md">
                <Stack gap="xs">
                  <Label size="sm">Name</Label>
                  <strong>
                    {data.emergency.secondaryContact.name} (
                    {data.emergency.secondaryContact.relationship})
                  </strong>
                </Stack>
                <Stack gap="xs">
                  <Label size="sm">Phone</Label>
                  <strong>{data.emergency.secondaryContact.phone}</strong>
                </Stack>
              </Grid>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* 6. ACCOUNTS */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>6. Accounts &amp; Salary Breakdown</CardTitle>
              {hasSectionPending('Accounts') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('accounts')}
            >
              Edit
            </Button>
          </Inline>

          <Grid columns={3} gap="md">
            <Stack gap="xs">
              <Label size="sm">Bank &amp; Branch</Label>
              <strong>
                {data.accounts.bankName} — {data.accounts.branchName}
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">IFSC Code</Label>
              <strong>{data.accounts.ifscCode}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Account Holder</Label>
              <strong>{data.accounts.accountHolderName}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Account Number</Label>
              <strong>•••• •••• {data.accounts.accountNumber.slice(-4)}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Salary Structure</Label>
              <strong>
                {data.accounts.salaryStructure} ({data.accounts.payGrade})
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Annual CTC</Label>
              <strong>₹{data.accounts.annualCtc.toLocaleString('en-IN')} / yr</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Monthly Basic</Label>
              <strong>₹{data.accounts.monthlyBasic.toLocaleString('en-IN')} / mo</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Monthly Gross</Label>
              <strong>₹{data.accounts.grossSalary.toLocaleString('en-IN')} / mo</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Payroll Group</Label>
              <strong>{data.accounts.payrollGroup}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Tax Regime</Label>
              <strong>{data.accounts.taxRegime}</strong>
            </Stack>
          </Grid>

          {data.accounts.benefits.Medical && (
            <Stack gap="xs">
              <Divider />
              <Label size="md">Medical Insurance Policy</Label>
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <Label size="sm">Provider</Label>
                  <strong>{data.accounts.medicalDetails.provider}</strong>
                </Stack>
                <Stack gap="xs">
                  <Label size="sm">Policy Number</Label>
                  <strong>{data.accounts.medicalDetails.policyNumber}</strong>
                </Stack>
                <Stack gap="xs">
                  <Label size="sm">Coverage</Label>
                  <strong>{data.accounts.medicalDetails.coverage}</strong>
                </Stack>
              </Grid>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* 7. ONLINE ACCESS */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>7. Online Access &amp; Permissions</CardTitle>
              {hasSectionPending('Online Access') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('online_access')}
            >
              Edit
            </Button>
          </Inline>

          <Grid columns={2} gap="md">
            <Stack gap="xs">
              <Label size="sm">Employee Username</Label>
              <strong>{data.onlineAccess.username}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Official Company Email</Label>
              <strong>{data.onlineAccess.officialEmail}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Invitation Status</Label>
              <strong>
                {data.onlineAccess.invitationStatus} (Sent: {data.onlineAccess.invitationSentDate})
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Role &amp; Scope</Label>
              <strong>
                {data.onlineAccess.employeeRole} ({data.onlineAccess.portalRoleScope})
              </strong>
            </Stack>
          </Grid>

          <Stack gap="xs">
            <Divider />
            <Label size="md">Granted Module Permissions</Label>
            <Inline gap="xs" wrap>
              {Object.entries(data.onlineAccess.moduleAccess).map(([mod, granted]) => (
                <Badge key={mod} size="sm" variant={granted ? 'info' : 'neutral'}>
                  {mod}
                </Badge>
              ))}
            </Inline>
          </Stack>
        </Stack>
      </Card>

      {/* 8. WORKING HOURS */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>8. Working Hours &amp; Calendar</CardTitle>
              {hasSectionPending('Working Hours') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('working_hours')}
            >
              Edit
            </Button>
          </Inline>

          <Grid columns={2} gap="md">
            <Stack gap="xs">
              <Label size="sm">Work Schedule</Label>
              <strong>{data.workingHours.workSchedule}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Shift Hours</Label>
              <strong>
                {data.workingHours.startTime} – {data.workingHours.endTime} (
                {data.workingHours.standardHours})
              </strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Working Days</Label>
              <strong>{data.workingHours.workingDays.join(', ')}</strong>
            </Stack>
            <Stack gap="xs">
              <Label size="sm">Calendar &amp; Timezone</Label>
              <strong>
                {data.workingHours.assignedCalendar} ({data.workingHours.timeZone})
              </strong>
            </Stack>
          </Grid>
        </Stack>
      </Card>

      {/* 9. DOCUMENTS */}
      <Card variant="flat">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>9. Documents Vault &amp; Verification</CardTitle>
              {hasSectionPending('Documents') ? (
                <Badge variant="warning">Action Required</Badge>
              ) : (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEditSection('documents')}
            >
              Edit
            </Button>
          </Inline>

          {/* Photo */}
          <Inline gap="md" align="center">
            {data.documents.passportPhoto.previewUrl ? (
              <img
                src={data.documents.passportPhoto.previewUrl}
                alt="Passport Photo"
                className="bezent-photo-preview"
              />
            ) : (
              <div className="bezent-photo-placeholder">
                <BezentIcon name="employees" size={32} />
              </div>
            )}
            <Stack gap="xs">
              <Label size="md">Passport-size Photograph</Label>
              <span className="bezent-card__desc">
                File: {data.documents.passportPhoto.fileName || 'Not Uploaded'}
              </span>
              <Badge size="sm" variant="neutral">
                {data.documents.passportPhoto.status}
              </Badge>
            </Stack>
          </Inline>

          {/* Document Items List */}
          <Stack gap="xs">
            <Divider />
            <Label size="md">Document Vault Records</Label>
            <Stack gap="xs">
              {data.documents.items.map((doc) => {
                if (
                  !data.documents.isExperiencedHire &&
                  doc.category.includes('Professional History')
                ) {
                  return null;
                }
                return (
                  <Inline key={doc.id} justify="between" align="center">
                    <Stack gap="xs">
                      <span>
                        <strong>{doc.name}</strong> ({doc.category})
                      </span>
                      <span className="bezent-card__desc">
                        Doc #: {doc.docNumber || 'N/A'} | File: {doc.fileName || 'No File'}{' '}
                        {doc.fileSizeFormatted ? `(${doc.fileSizeFormatted})` : ''}
                      </span>
                    </Stack>
                    <Inline gap="sm" align="center">
                      <Badge
                        size="sm"
                        variant={
                          doc.status === 'Verified'
                            ? 'success'
                            : doc.status === 'Rejected'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {doc.status}
                      </Badge>
                      {onDeleteDocument && doc.fileName && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmAndDelete(doc.name, () => onDeleteDocument(doc.id))}
                        >
                          Delete
                        </Button>
                      )}
                    </Inline>
                  </Inline>
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      {/* FINAL CREATE EMPLOYEE ACTION CARD */}
      <Card>
        <Inline justify="between" align="center">
          <Stack gap="xs">
            <CardTitle>Registration Review &amp; Completion</CardTitle>
            <span className="bezent-card__desc">
              Ensure all sections are verified before generating the official employee record.
            </span>
          </Stack>
          <Button type="button" variant="primary" size="lg" onClick={handleFinalCreateClick}>
            Create Employee
          </Button>
        </Inline>
      </Card>

      {/* VALIDATION WARNING MODAL */}
      {showValidationModal && (
        <Modal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          title={`Cannot Create Employee — Pending Items (${pendingItems.length})`}
          size="md"
        >
          <Stack gap="md">
            <Alert variant="danger">
              The registration cannot be completed because required information or document
              verification is still pending:
            </Alert>
            <Stack gap="xs">
              {pendingItems.map((item, idx) => (
                <Inline key={idx} justify="between" align="center">
                  <span>
                    <strong>{item.sectionLabel}</strong>: {item.fieldName} ({item.reason})
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowValidationModal(false);
                      onEditSection(item.sectionId);
                    }}
                  >
                    Fix Now →
                  </Button>
                </Inline>
              ))}
            </Stack>
            <Inline justify="end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowValidationModal(false)}
              >
                Close &amp; Review
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && (
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Employee Registration Complete!"
          size="md"
        >
          <Stack gap="md">
            <Alert variant="success">
              Employee <strong>{data.personal.fullName || 'Arun Kumar'}</strong> (ID:{' '}
              <strong>{data.general.employeeId}</strong>) has been successfully created and
              registered in BEZENT HRMS.
            </Alert>
            <Stack gap="xs">
              <span>General employment records created</span>
              <span>Bank account &amp; payroll breakdown configured</span>
              <span>Official email invitation dispatched</span>
              <span>Document vault &amp; verification records sealed</span>
            </Stack>
            <Inline justify="end">
              <Button type="button" variant="primary" onClick={() => setShowSuccessModal(false)}>
                Done
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
