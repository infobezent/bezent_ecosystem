import { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationSectionId } from './EmployeeRegistration';
import { DocumentItemState } from './DocumentsSection';
import './ReviewSection.css';

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

  return (
    <div className="review-section">
      {/* Header Banner */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="documents" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">Employee Registration Review</h2>
          <p className="employee-registration__section-subtitle">
            Consolidated single-page view of all registration sections. Review details, fix pending
            items, and finalize employee creation.
          </p>
        </div>
      </div>

      {/* Prominent REGISTRATION STATUS Banner */}
      <div
        className={`review-section__status-banner ${
          isComplete
            ? 'review-section__status-banner--complete'
            : 'review-section__status-banner--pending'
        }`}
      >
        <div className="review-section__status-info">
          <div className="review-section__status-badge-row">
            <span
              className={`review-section__status-pill ${
                isComplete
                  ? 'review-section__status-pill--complete'
                  : 'review-section__status-pill--pending'
              }`}
            >
              {isComplete ? '✓ Registration Complete' : '⚠ Pending — Action Required'}
            </span>
            <span className="review-section__status-count">
              {isComplete
                ? 'All 10 registration sections complete and verified.'
                : `${pendingItems.length} item${pendingItems.length > 1 ? 's' : ''} require attention across ${
                    Object.keys(sectionPendingMap).length
                  } section${Object.keys(sectionPendingMap).length > 1 ? 's' : ''}.`}
            </span>
          </div>
          <p className="review-section__status-desc">
            {isComplete
              ? 'All required employee information, statutory details, bank setup, and document verifications are complete. Ready to generate employee record.'
              : 'Review the section indicators below and click any pending item to navigate directly to the field.'}
          </p>
        </div>
      </div>

      {/* SECTION & FIELD PENDING WORK SUMMARY */}
      {!isComplete && (
        <div className="review-section__pending-summary-card">
          <div className="review-section__pending-summary-header">
            <BezentIcon name="clock" size={18} />
            <h3 className="review-section__pending-summary-title">
              Pending Work Summary ({pendingItems.length} Items)
            </h3>
          </div>

          <div className="review-section__pending-list">
            {Object.entries(sectionPendingMap).map(([sectionLabel, items]) => {
              return (
                <div key={sectionLabel} className="review-section__pending-group">
                  <div className="review-section__pending-group-title">
                    <span className="review-section__pending-warning-icon">⚠</span>
                    <strong>{sectionLabel}</strong> ({items.length} pending)
                  </div>
                  <div className="review-section__pending-items-flex">
                    {items.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="review-section__pending-item-chip"
                        onClick={() => onEditSection(item.sectionId)}
                      >
                        <span className="review-section__chip-field">{item.fieldName}</span>
                        <span className="review-section__chip-reason">— {item.reason}</span>
                        <span className="review-section__chip-action">Fix →</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONSOLIDATED 10-SECTION CARDS WITH EASY EDIT & DELETE */}
      <div className="review-section__cards-grid">
        {/* 1. GENERAL INFORMATION */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">📋</span>
              <h3 className="review-section__card-title">1. General Information</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('general')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Employee ID</span>
              <span className="review-section__value">{data.general.employeeId || '—'}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Employment Type</span>
              <span className="review-section__value">{data.general.employmentType}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Employment Status</span>
              <span className="review-section__value">{data.general.employmentStatus}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Department</span>
              <span className="review-section__value">{data.general.department}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Team</span>
              <span className="review-section__value">{data.general.team}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Designation</span>
              <span className="review-section__value">{data.general.designation}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Grade / Level</span>
              <span className="review-section__value">{data.general.gradeLevel}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Reporting Manager</span>
              <span className="review-section__value">
                {data.general.reportingManager || 'Unassigned'}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Organisation Unit</span>
              <span className="review-section__value">{data.general.organisationUnit}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Office Location</span>
              <span className="review-section__value">{data.general.officeLocation}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Joining Date</span>
              <span className="review-section__value">{data.general.joiningDate || '—'}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Confirmed Date of Joining</span>
              <span className="review-section__value">
                {data.general.confirmedJoiningDate || '—'}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Source of Hire</span>
              <span className="review-section__value">{data.general.sourceOfHire}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Probation Period</span>
              <span className="review-section__value">{data.general.probationPeriod}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Notice Period</span>
              <span className="review-section__value">{data.general.noticePeriod}</span>
            </div>
          </div>
        </div>

        {/* 2. PERSONAL INFORMATION */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">👤</span>
              <h3 className="review-section__card-title">2. Personal Information</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('personal')}
            >
              ✎ Edit
            </button>
          </div>

          {/* Photo Preview & Key Personal Info */}
          <div className="review-section__photo-review-row">
            <div className="review-section__photo-box">
              {data.documents.passportPhoto.previewUrl ? (
                <img
                  src={data.documents.passportPhoto.previewUrl}
                  alt="Passport Photograph"
                  className="review-section__photo-img"
                />
              ) : (
                <div className="review-section__photo-placeholder">
                  <BezentIcon name="employees" size={32} />
                  <span>No Photo</span>
                </div>
              )}
            </div>
            <div className="review-section__photo-meta">
              <h4 className="review-section__person-name">
                {data.personal.fullName || 'Arun Kumar'}
              </h4>
              <span className="review-section__person-sub">
                {data.personal.gender} • DOB: {data.personal.dob} • Nationality:{' '}
                {data.personal.nationality}
              </span>
              <span className="review-section__person-sub">
                Aadhaar: {data.personal.aadhaarNumber} | PAN: {data.personal.panNumber}
              </span>
            </div>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Personal Email</span>
              <span className="review-section__value">{data.personal.personalEmail}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Mobile Phone</span>
              <span className="review-section__value">{data.personal.mobilePhone}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Marital Status</span>
              <span className="review-section__value">{data.personal.maritalStatus}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Blood Group</span>
              <span className="review-section__value">{data.personal.bloodGroup}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Current Address</span>
              <span className="review-section__value">
                {data.personal.currentStreet}, {data.personal.currentCity},{' '}
                {data.personal.currentState} - {data.personal.currentPin}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Permanent Address</span>
              <span className="review-section__value">
                {data.personal.permanentStreet}, {data.personal.permanentCity},{' '}
                {data.personal.permanentState} - {data.personal.permanentPin}
              </span>
            </div>
          </div>

          {/* Repeatable: Family Members */}
          <div className="review-section__sub-block">
            <h4 className="review-section__sub-heading">
              Family Members ({data.personal.familyMembers.length})
            </h4>
            <div className="review-section__repeatable-list">
              {data.personal.familyMembers.map((fam) => (
                <div key={fam.id} className="review-section__repeatable-item">
                  <div className="review-section__repeatable-info">
                    <strong>{fam.name}</strong> ({fam.relationship}) — DOB: {fam.dob}
                    {fam.dependent && <span className="review-section__mini-tag">Dependent</span>}
                  </div>
                  {onDeleteFamilyMember && (
                    <button
                      type="button"
                      className="review-section__delete-item-btn"
                      onClick={() => confirmAndDelete(fam.name, () => onDeleteFamilyMember(fam.id))}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Repeatable: Nomination Details */}
          <div className="review-section__sub-block">
            <h4 className="review-section__sub-heading">
              Nomination Details ({data.personal.nominationDetails.length})
            </h4>
            <div className="review-section__repeatable-list">
              {data.personal.nominationDetails.map((nom) => (
                <div key={nom.id} className="review-section__repeatable-item">
                  <div className="review-section__repeatable-info">
                    <strong>{nom.nomineeName}</strong> ({nom.relationship}) — {nom.percentage}%
                    Allocation
                    {nom.isMinor && <span className="review-section__mini-tag">Minor</span>}
                  </div>
                  {onDeleteNominee && (
                    <button
                      type="button"
                      className="review-section__delete-item-btn"
                      onClick={() =>
                        confirmAndDelete(nom.nomineeName, () => onDeleteNominee(nom.id))
                      }
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. ONBOARDING */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">🚀</span>
              <h3 className="review-section__card-title">3. Administration Tasks &amp; Assets</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('onboarding')}
            >
              ✎ Edit
            </button>
          </div>

          {/* Onboarding Tasks */}
          <div className="review-section__sub-block">
            <h4 className="review-section__sub-heading">
              Administration Tasks ({data.onboarding.tasks.length})
            </h4>
            <div className="review-section__repeatable-list">
              {data.onboarding.tasks.map((tsk) => (
                <div key={tsk.id} className="review-section__repeatable-item">
                  <div className="review-section__repeatable-info">
                    <strong>{tsk.taskDescription}</strong> • Assigned: {tsk.assignedTo} • Due:{' '}
                    {tsk.dueDate}
                    <span className="review-section__mini-tag">{tsk.status}</span>
                  </div>
                  {onDeleteTask && (
                    <button
                      type="button"
                      className="review-section__delete-item-btn"
                      onClick={() =>
                        confirmAndDelete(tsk.taskDescription, () => onDeleteTask(tsk.id))
                      }
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Assets */}
          <div className="review-section__sub-block">
            <h4 className="review-section__sub-heading">
              Assigned Assets ({data.onboarding.assets.length})
            </h4>
            <div className="review-section__repeatable-list">
              {data.onboarding.assets.map((ast) => (
                <div key={ast.id} className="review-section__repeatable-item">
                  <div className="review-section__repeatable-info">
                    <strong>{ast.assetName}</strong> ({ast.category}) — S/N: {ast.serialNumber} •
                    Issued: {ast.issueDate} (Qty: {ast.quantity})
                  </div>
                  {onDeleteAsset && (
                    <button
                      type="button"
                      className="review-section__delete-item-btn"
                      onClick={() => confirmAndDelete(ast.assetName, () => onDeleteAsset(ast.id))}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. SKILLS */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">⚡</span>
              <h3 className="review-section__card-title">4. Skills &amp; Qualifications</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('skills')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__repeatable-list">
            {data.skills.map((skl) => (
              <div key={skl.id} className="review-section__repeatable-item">
                <div className="review-section__repeatable-info">
                  <strong>{skl.skill}</strong> ({skl.skillType}) — Level: {skl.level} (
                  {skl.levelType}) • {skl.yearsExperience} yrs exp
                  <br />
                  <span className="review-section__small-muted">
                    Examiner: {skl.examiner} | Verified By: {skl.verifiedBy} | Mentor: {skl.mentor}
                  </span>
                </div>
                {onDeleteSkill && (
                  <button
                    type="button"
                    className="review-section__delete-item-btn"
                    onClick={() => confirmAndDelete(skl.skill, () => onDeleteSkill(skl.id))}
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. EMERGENCY CONTACT */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">📞</span>
              <h3 className="review-section__card-title">5. Emergency Contacts</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('emergency')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Primary Contact Name</span>
              <span className="review-section__value">
                {data.emergency.primaryContact.name} ({data.emergency.primaryContact.relationship})
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Primary Phone</span>
              <span className="review-section__value">{data.emergency.primaryContact.phone}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Primary Email</span>
              <span className="review-section__value">
                {data.emergency.primaryContact.email || '—'}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Primary Address</span>
              <span className="review-section__value">
                {data.emergency.primaryContact.address || '—'}
              </span>
            </div>
          </div>

          {data.emergency.secondaryContact && (
            <div className="review-section__sub-block">
              <div className="review-section__sub-header-row">
                <h4 className="review-section__sub-heading">Secondary Emergency Contact</h4>
                {onDeleteSecondaryContact && (
                  <button
                    type="button"
                    className="review-section__delete-item-btn"
                    onClick={() => confirmAndDelete('Secondary Contact', onDeleteSecondaryContact)}
                  >
                    🗑 Delete Contact
                  </button>
                )}
              </div>
              <div className="review-section__data-grid">
                <div className="review-section__data-item">
                  <span className="review-section__label">Name</span>
                  <span className="review-section__value">
                    {data.emergency.secondaryContact.name} (
                    {data.emergency.secondaryContact.relationship})
                  </span>
                </div>
                <div className="review-section__data-item">
                  <span className="review-section__label">Phone</span>
                  <span className="review-section__value">
                    {data.emergency.secondaryContact.phone}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. ACCOUNTS */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">🏦</span>
              <h3 className="review-section__card-title">6. Accounts &amp; Salary Breakdown</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('accounts')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Bank Name &amp; Branch</span>
              <span className="review-section__value">
                {data.accounts.bankName} — {data.accounts.branchName}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">IFSC Code</span>
              <span className="review-section__value">{data.accounts.ifscCode}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Account Holder</span>
              <span className="review-section__value">{data.accounts.accountHolderName}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Account Number</span>
              <span className="review-section__value">
                •••• •••• {data.accounts.accountNumber.slice(-4)}
              </span>
            </div>

            <div className="review-section__data-item">
              <span className="review-section__label">Salary Structure</span>
              <span className="review-section__value">
                {data.accounts.salaryStructure} ({data.accounts.payGrade})
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Annual CTC</span>
              <span className="review-section__value">
                ₹{data.accounts.annualCtc.toLocaleString('en-IN')} / year
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Monthly Basic</span>
              <span className="review-section__value">
                ₹{data.accounts.monthlyBasic.toLocaleString('en-IN')} / mo
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Monthly Gross</span>
              <span className="review-section__value">
                ₹{data.accounts.grossSalary.toLocaleString('en-IN')} / mo
              </span>
            </div>

            <div className="review-section__data-item">
              <span className="review-section__label">Payroll Group</span>
              <span className="review-section__value">{data.accounts.payrollGroup}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Tax Regime</span>
              <span className="review-section__value">{data.accounts.taxRegime}</span>
            </div>
          </div>

          {/* Conditional Medical Insurance Details */}
          {data.accounts.benefits.Medical && (
            <div className="review-section__sub-block">
              <h4 className="review-section__sub-heading">Medical Insurance Policy</h4>
              <div className="review-section__data-grid">
                <div className="review-section__data-item">
                  <span className="review-section__label">Provider</span>
                  <span className="review-section__value">
                    {data.accounts.medicalDetails.provider}
                  </span>
                </div>
                <div className="review-section__data-item">
                  <span className="review-section__label">Policy Number</span>
                  <span className="review-section__value">
                    {data.accounts.medicalDetails.policyNumber}
                  </span>
                </div>
                <div className="review-section__data-item">
                  <span className="review-section__label">Coverage</span>
                  <span className="review-section__value">
                    {data.accounts.medicalDetails.coverage}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. ONLINE ACCESS */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">🔑</span>
              <h3 className="review-section__card-title">7. Online Access &amp; Permissions</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('online_access')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Employee Username</span>
              <span className="review-section__value">{data.onlineAccess.username}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Official Company Email</span>
              <span className="review-section__value">{data.onlineAccess.officialEmail}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Invitation Status</span>
              <span className="review-section__value">
                {data.onlineAccess.invitationStatus} (Sent: {data.onlineAccess.invitationSentDate})
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Employee Role &amp; Scope</span>
              <span className="review-section__value">
                {data.onlineAccess.employeeRole} ({data.onlineAccess.portalRoleScope})
              </span>
            </div>
          </div>

          <div className="review-section__sub-block">
            <h4 className="review-section__sub-heading">Granted Module Permissions</h4>
            <div className="review-section__modules-grid">
              {Object.entries(data.onlineAccess.moduleAccess).map(([mod, granted]) => (
                <span
                  key={mod}
                  className={`review-section__module-chip ${
                    granted
                      ? 'review-section__module-chip--granted'
                      : 'review-section__module-chip--denied'
                  }`}
                >
                  {granted ? '✓' : '✕'} {mod}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 8. WORKING HOURS */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">⏰</span>
              <h3 className="review-section__card-title">8. Working Hours &amp; Calendar</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('working_hours')}
            >
              ✎ Edit
            </button>
          </div>

          <div className="review-section__data-grid">
            <div className="review-section__data-item">
              <span className="review-section__label">Work Schedule</span>
              <span className="review-section__value">{data.workingHours.workSchedule}</span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Shift Hours</span>
              <span className="review-section__value">
                {data.workingHours.startTime} – {data.workingHours.endTime} (
                {data.workingHours.standardHours})
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Working Days</span>
              <span className="review-section__value">
                {data.workingHours.workingDays.join(', ')}
              </span>
            </div>
            <div className="review-section__data-item">
              <span className="review-section__label">Assigned Calendar &amp; Timezone</span>
              <span className="review-section__value">
                {data.workingHours.assignedCalendar} ({data.workingHours.timeZone})
              </span>
            </div>
          </div>
        </div>

        {/* 9. DOCUMENTS */}
        <div className="review-section__card">
          <div className="review-section__card-header">
            <div className="review-section__card-title-group">
              <span className="review-section__card-icon">📁</span>
              <h3 className="review-section__card-title">9. Documents Vault &amp; Verification</h3>
              <span className="review-section__section-status-badge review-section__section-status-badge--complete">
                ✓ Complete
              </span>
            </div>
            <button
              type="button"
              className="review-section__edit-btn"
              onClick={() => onEditSection('documents')}
            >
              ✎ Edit
            </button>
          </div>

          {/* Passport Photo Row */}
          <div className="review-section__photo-review-row">
            <div className="review-section__photo-box">
              {data.documents.passportPhoto.previewUrl ? (
                <img
                  src={data.documents.passportPhoto.previewUrl}
                  alt="Passport Photograph"
                  className="review-section__photo-img"
                />
              ) : (
                <div className="review-section__photo-placeholder">
                  <BezentIcon name="employees" size={32} />
                  <span>No Photo</span>
                </div>
              )}
            </div>
            <div className="review-section__photo-meta">
              <h4 className="review-section__person-name">Passport-size Photograph</h4>
              <span className="review-section__person-sub">
                File: {data.documents.passportPhoto.fileName || 'Not Uploaded'}
              </span>
              <span className="review-section__mini-tag">
                {data.documents.passportPhoto.status}
              </span>
            </div>
          </div>

          {/* Document Items List */}
          <div className="review-section__repeatable-list">
            {data.documents.items.map((doc) => {
              if (
                !data.documents.isExperiencedHire &&
                doc.category.includes('Professional History')
              ) {
                return null;
              }
              return (
                <div key={doc.id} className="review-section__repeatable-item">
                  <div className="review-section__repeatable-info">
                    <strong>{doc.name}</strong> ({doc.category})
                    <br />
                    <span className="review-section__small-muted">
                      Doc #: {doc.docNumber || 'N/A'} | File: {doc.fileName || 'No File'}{' '}
                      {doc.fileSizeFormatted ? `(${doc.fileSizeFormatted})` : ''}
                    </span>
                  </div>
                  <div className="review-section__doc-right">
                    <span
                      className={`documents-section__status-badge documents-section__status-badge--${doc.status.toLowerCase().replace(' ', '-')}`}
                    >
                      ● {doc.status}
                    </span>
                    {onDeleteDocument && doc.fileName && (
                      <button
                        type="button"
                        className="review-section__delete-item-btn"
                        onClick={() => confirmAndDelete(doc.name, () => onDeleteDocument(doc.id))}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FINAL CREATE EMPLOYEE BUTTON */}
      <div className="review-section__final-action-bar">
        <div className="review-section__final-info">
          <strong>✓ Registration Complete</strong>
          <span>Ensure all 10 sections are verified before creating the employee record.</span>
        </div>
        <button
          type="button"
          className="review-section__create-btn--large"
          onClick={handleFinalCreateClick}
        >
          Create Employee
        </button>
      </div>

      {/* VALIDATION WARNING MODAL */}
      {showValidationModal && (
        <div className="review-section__modal-overlay">
          <div className="review-section__modal-card">
            <div className="review-section__modal-header review-section__modal-header--warning">
              <span className="review-section__modal-icon">⚠️</span>
              <h3>Cannot Create Employee — Pending Items ({pendingItems.length})</h3>
            </div>
            <div className="review-section__modal-body">
              <p>
                The registration cannot be completed because required information or document
                verification is still pending:
              </p>
              <div className="review-section__modal-pending-list">
                {pendingItems.map((item, idx) => (
                  <div key={idx} className="review-section__modal-pending-row">
                    <div>
                      <strong>{item.sectionLabel}</strong>: {item.fieldName} ({item.reason})
                    </div>
                    <button
                      type="button"
                      className="review-section__modal-fix-btn"
                      onClick={() => {
                        setShowValidationModal(false);
                        onEditSection(item.sectionId);
                      }}
                    >
                      Fix Now →
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="review-section__modal-footer">
              <button
                type="button"
                className="review-section__modal-close-btn"
                onClick={() => setShowValidationModal(false)}
              >
                Close &amp; Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && (
        <div className="review-section__modal-overlay">
          <div className="review-section__modal-card">
            <div className="review-section__modal-header review-section__modal-header--success">
              <span className="review-section__modal-icon">🎉</span>
              <h3>Employee Registration Complete!</h3>
            </div>
            <div className="review-section__modal-body">
              <p>
                Employee <strong>{data.personal.fullName || 'Arun Kumar'}</strong> (ID:{' '}
                <strong>{data.general.employeeId}</strong>) has been successfully created and
                registered in BEZENT HRMS.
              </p>
              <ul className="review-section__success-checklist">
                <li>✓ General employment records created</li>
                <li>✓ Bank account &amp; payroll breakdown configured</li>
                <li>✓ Official email invitation dispatched</li>
                <li>✓ Document vault &amp; verification records sealed</li>
              </ul>
            </div>
            <div className="review-section__modal-footer">
              <button
                type="button"
                className="review-section__create-btn--large"
                onClick={() => setShowSuccessModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
