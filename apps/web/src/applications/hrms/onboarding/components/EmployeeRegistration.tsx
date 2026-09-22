import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import { PersonalInformation } from './PersonalInformation';
import { OnboardingSection } from './OnboardingSection';
import { SkillsSection } from './SkillsSection';
import { EmergencyContactSection } from './EmergencyContactSection';
import './EmployeeRegistration.css';

export type RegistrationSectionId =
  | 'general'
  | 'personal'
  | 'onboarding'
  | 'skills'
  | 'emergency'
  | 'accounts'
  | 'online_access'
  | 'working_hours'
  | 'documents'
  | 'review';

export interface RegistrationSection {
  id: RegistrationSectionId;
  label: string;
}

export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [
  { id: 'general', label: 'General' },
  { id: 'personal', label: 'Personal Information' },
  { id: 'onboarding', label: 'Onboarding' },
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
}

export function EmployeeRegistration({ onCancel }: EmployeeRegistrationProps) {
  const [activeSection, setActiveSection] = useState<RegistrationSectionId>('general');

  // General Form State
  const [employeeId, setEmployeeId] = useState('EMP2026001');

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

  const handleAutoGenerateId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setEmployeeId(`EMP${randomNum}`);
  };

  const handleNext = () => {
    const currentIndex = REGISTRATION_SECTIONS.findIndex((s) => s.id === activeSection);
    if (currentIndex < REGISTRATION_SECTIONS.length - 1) {
      setActiveSection(REGISTRATION_SECTIONS[currentIndex + 1]!.id);
    }
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

        {/* 10-Section Horizontal Navigation */}
        <div className="employee-registration__nav-bar" role="tablist">
          {REGISTRATION_SECTIONS.map((section) => (
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
          ) : (
            /* Placeholder for remaining sections */
            <div className="employee-registration__placeholder">
              <BezentIcon name="documents" size={44} />
              <h3 className="employee-registration__placeholder-title">
                {REGISTRATION_SECTIONS.find((s) => s.id === activeSection)?.label} Section
              </h3>
              <p className="employee-registration__placeholder-desc">
                Configure and manage{' '}
                {REGISTRATION_SECTIONS.find((s) => s.id === activeSection)?.label.toLowerCase()}{' '}
                details for the employee.
              </p>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="employee-registration__actions">
            <button type="button" className="employee-registration__cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <Button variant="primary" onClick={handleNext}>
              Save &amp; Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
