import { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface SkillEntry {
  id: string;
  skillName: string;
  customSkillName?: string;
  skillType: 'Technical' | 'Functional' | 'Soft Skill' | 'Language' | 'Professional' | 'Other';
  customSkillType?: string;
  levelType: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  level: string;
  levelDate: string;
  yearsOfExperience: string;
  examinerId: string;
  examinerName: string;
  verifiedById: string;
  verifiedByName: string;
  mentorId: string;
  mentorName: string;
}

export interface EmployeeDirectoryItem {
  id: string;
  name: string;
  initials: string;
  designation: string;
  department: string;
}

export const SAMPLE_EMPLOYEES: EmployeeDirectoryItem[] = [
  {
    id: 'EMP101',
    name: 'Rakesh Kumar',
    initials: 'RK',
    designation: 'Senior Engineering Manager',
    department: 'Engineering',
  },
  {
    id: 'EMP102',
    name: 'Priya S',
    initials: 'PS',
    designation: 'Senior HR Specialist',
    department: 'Human Resources',
  },
  {
    id: 'EMP103',
    name: 'Arun Kumar',
    initials: 'AK',
    designation: 'Principal Architect',
    department: 'Engineering',
  },
  {
    id: 'EMP104',
    name: 'Meera Nair',
    initials: 'MN',
    designation: 'Director of Learning & Development',
    department: 'Human Resources',
  },
  {
    id: 'EMP105',
    name: 'Suresh Raina',
    initials: 'SR',
    designation: 'VP of Operations',
    department: 'Operations',
  },
];

interface SkillMasterOption {
  name: string;
  defaultType: 'Technical' | 'Functional' | 'Soft Skill' | 'Language' | 'Professional';
}

const SKILL_MASTER: SkillMasterOption[] = [
  { name: 'TypeScript', defaultType: 'Technical' },
  { name: 'React.js', defaultType: 'Technical' },
  { name: 'Node.js', defaultType: 'Technical' },
  { name: 'Python', defaultType: 'Technical' },
  { name: 'Java', defaultType: 'Technical' },
  { name: 'SQL & Database Architecture', defaultType: 'Technical' },
  { name: 'DevOps & CI/CD', defaultType: 'Technical' },
  { name: 'Talent Acquisition', defaultType: 'Functional' },
  { name: 'HR Operations & Compliance', defaultType: 'Functional' },
  { name: 'Financial Modeling & Analysis', defaultType: 'Functional' },
  { name: 'Payroll Administration', defaultType: 'Functional' },
  { name: 'Project Management & PMP', defaultType: 'Professional' },
  { name: 'Agile & Scrum Facilitation', defaultType: 'Professional' },
  { name: 'Strategic Planning', defaultType: 'Professional' },
  { name: 'Communication & Public Speaking', defaultType: 'Soft Skill' },
  { name: 'Leadership & Mentorship', defaultType: 'Soft Skill' },
  { name: 'Problem Solving & Critical Thinking', defaultType: 'Soft Skill' },
  { name: 'English (Fluent)', defaultType: 'Language' },
  { name: 'German (Intermediate)', defaultType: 'Language' },
  { name: 'Spanish (Basic)', defaultType: 'Language' },
];

const LEVEL_OPTIONS_BY_TYPE: Record<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert', string[]> =
  {
    Beginner: [
      'Level 1 — Basic Awareness',
      'Level 1 — Novice Practitioner',
      'Level 1 — Guided Application',
    ],
    Intermediate: [
      'Level 2 — Working Knowledge',
      'Level 2 — Independent Practitioner',
      'Level 2 — Proficient',
    ],
    Advanced: [
      'Level 3 — High Proficiency',
      'Level 3 — Subject Matter Specialist',
      'Level 3 — Advanced Practitioner',
    ],
    Expert: [
      'Level 4 — Master / Authority',
      'Level 4 — Lead Architect / Strategist',
      'Level 4 — Recognized Industry Expert',
    ],
  };

export function SkillsSection() {
  const [skillsList, setSkillsList] = useState<SkillEntry[]>([
    {
      id: 'skill-01',
      skillName: 'TypeScript',
      skillType: 'Technical',
      levelType: 'Advanced',
      level: 'Level 3 — Subject Matter Specialist',
      levelDate: '2026-01-15',
      yearsOfExperience: '4.5',
      examinerId: 'EMP103',
      examinerName: 'Arun Kumar',
      verifiedById: 'EMP102',
      verifiedByName: 'Priya S',
      mentorId: 'EMP101',
      mentorName: 'Rakesh Kumar',
    },
  ]);

  // Form state for adding/editing a skill
  const [selectedSkill, setSelectedSkill] = useState('TypeScript');
  const [customSkillName, setCustomSkillName] = useState('');

  const [skillType, setSkillType] = useState<
    'Technical' | 'Functional' | 'Soft Skill' | 'Language' | 'Professional' | 'Other'
  >('Technical');
  const [customSkillType, setCustomSkillType] = useState('');

  const [levelType, setLevelType] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>(
    'Advanced',
  );
  const [level, setLevel] = useState(LEVEL_OPTIONS_BY_TYPE.Advanced[0]!);

  const [levelDate, setLevelDate] = useState('2026-03-01');
  const [yearsOfExperience, setYearsOfExperience] = useState('3.5');

  // Employee Selectors
  const [examinerId, setExaminerId] = useState('EMP103');
  const [verifiedById, setVerifiedById] = useState('EMP102');
  const [mentorId, setMentorId] = useState('EMP101');

  // Search Modals State
  const [activePickerField, setActivePickerField] = useState<
    'examiner' | 'verifiedBy' | 'mentor' | null
  >(null);
  const [searchFilter, setSearchFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  // AUTOMATION: Handle Skill Selection -> Auto suggest Skill Type
  const handleSkillChange = (value: string) => {
    setSelectedSkill(value);
    if (value === 'Other') {
      setSkillType('Other');
      return;
    }
    const match = SKILL_MASTER.find((s) => s.name === value);
    if (match) {
      setSkillType(match.defaultType);
    }
  };

  // AUTOMATION: Handle Level Type change -> Update Level options
  const handleLevelTypeChange = (
    newLevelType: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
  ) => {
    setLevelType(newLevelType);
    const availableLevels = LEVEL_OPTIONS_BY_TYPE[newLevelType];
    if (availableLevels && availableLevels.length > 0) {
      setLevel(availableLevels[0]!);
    }
  };

  const handleAddOrUpdateSkill = () => {
    const finalSkillName = selectedSkill === 'Other' ? customSkillName.trim() : selectedSkill;
    if (!finalSkillName) return;

    const examiner = SAMPLE_EMPLOYEES.find((e) => e.id === examinerId);
    const verifiedBy = SAMPLE_EMPLOYEES.find((e) => e.id === verifiedById);
    const mentor = SAMPLE_EMPLOYEES.find((e) => e.id === mentorId);

    const entry: SkillEntry = {
      id: editingId || `skill-${Date.now()}`,
      skillName: selectedSkill,
      customSkillName: selectedSkill === 'Other' ? customSkillName : undefined,
      skillType: skillType,
      customSkillType: skillType === 'Other' ? customSkillType : undefined,
      levelType,
      level,
      levelDate,
      yearsOfExperience,
      examinerId,
      examinerName: examiner ? examiner.name : 'Unassigned',
      verifiedById,
      verifiedByName: verifiedBy ? verifiedBy.name : 'Unassigned',
      mentorId,
      mentorName: mentor ? mentor.name : 'Unassigned',
    };

    if (editingId) {
      setSkillsList((prev) => prev.map((item) => (item.id === editingId ? entry : item)));
      setEditingId(null);
    } else {
      setSkillsList((prev) => [...prev, entry]);
    }

    // Reset Form for next entry
    setSelectedSkill('React.js');
    setSkillType('Technical');
    setLevelType('Intermediate');
    setLevel(LEVEL_OPTIONS_BY_TYPE.Intermediate[0]!);
    setLevelDate('2026-04-01');
    setYearsOfExperience('2.0');
    setCustomSkillName('');
    setCustomSkillType('');
  };

  const handleEditSkill = (entry: SkillEntry) => {
    setEditingId(entry.id);
    setSelectedSkill(entry.skillName);
    setCustomSkillName(entry.customSkillName || '');
    setSkillType(entry.skillType);
    setCustomSkillType(entry.customSkillType || '');
    setLevelType(entry.levelType);
    setLevel(entry.level);
    setLevelDate(entry.levelDate);
    setYearsOfExperience(entry.yearsOfExperience);
    setExaminerId(entry.examinerId);
    setVerifiedById(entry.verifiedById);
    setMentorId(entry.mentorId);
  };

  const handleRemoveSkill = (id: string) => {
    setSkillsList((prev) => prev.filter((item) => item.id !== id));
  };

  const getSelectedEmployee = (id: string) => {
    return SAMPLE_EMPLOYEES.find((e) => e.id === id) || SAMPLE_EMPLOYEES[0]!;
  };

  const filteredEmployees = SAMPLE_EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.department.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const handleSelectEmployeeModal = (emp: EmployeeDirectoryItem) => {
    if (activePickerField === 'examiner') setExaminerId(emp.id);
    if (activePickerField === 'verifiedBy') setVerifiedById(emp.id);
    if (activePickerField === 'mentor') setMentorId(emp.id);
    setActivePickerField(null);
    setSearchFilter('');
  };

  return (
    <div className="skills-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="learning" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">Skills</h2>
          <p className="employee-registration__section-subtitle">
            Employee skills, proficiency, assessment and mentorship information.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="skills-section__form-card">
        <h3 className="skills-section__card-title">
          {editingId ? 'Edit Skill Entry' : 'Add New Skill Entry'}
        </h3>

        <form className="skills-section__grid" onSubmit={(e) => e.preventDefault()}>
          {/* ROW 1 */}
          {/* 1. Skill */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Skill <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <span className="employee-registration__search-prefix">🔍</span>
              <select
                className="employee-registration__select employee-registration__select--with-search"
                value={selectedSkill}
                onChange={(e) => handleSkillChange(e.target.value)}
              >
                {SKILL_MASTER.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.defaultType})
                  </option>
                ))}
                <option value="Other">Other / Add New Skill</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {selectedSkill === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Skill"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 2. Skill Type */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Skill Type <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as SkillEntry['skillType'])}
              >
                <option value="Technical">Technical</option>
                <option value="Functional">Functional</option>
                <option value="Soft Skill">Soft Skill</option>
                <option value="Language">Language</option>
                <option value="Professional">Professional</option>
                <option value="Other">Other</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
            {skillType === 'Other' && (
              <div className="employee-registration__other-container">
                <input
                  type="text"
                  className="employee-registration__input"
                  placeholder="Enter Skill Type"
                  value={customSkillType}
                  onChange={(e) => setCustomSkillType(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 3. Level Type */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Level Type <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={levelType}
                onChange={(e) => handleLevelTypeChange(e.target.value as SkillEntry['levelType'])}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
          </div>

          {/* ROW 2 */}
          {/* 4. Level */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Level <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__select-wrapper">
              <select
                className="employee-registration__select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {LEVEL_OPTIONS_BY_TYPE[levelType].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
              <span className="employee-registration__select-icon">▼</span>
            </div>
          </div>

          {/* 5. Level Date */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Level Date <span className="employee-registration__required">*</span>
            </label>
            <input
              type="date"
              className="employee-registration__input"
              value={levelDate}
              onChange={(e) => setLevelDate(e.target.value)}
            />
          </div>

          {/* 6. Years of Experience */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Years of Experience <span className="employee-registration__required">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              className="employee-registration__input"
              placeholder="e.g. 1.5 Years"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
            />
          </div>

          {/* ROW 3 */}
          {/* 7. Examiner / Assessed By */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Examiner / Assessed By <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__pill-select">
              <div className="employee-registration__pill-tag">
                <span className="employee-registration__pill-avatar">
                  {getSelectedEmployee(examinerId).initials}
                </span>
                <span>{getSelectedEmployee(examinerId).name}</span>
              </div>
              <button
                type="button"
                className="employee-registration__pill-search-btn"
                onClick={() => setActivePickerField('examiner')}
                title="Search Employee Directory"
              >
                🔍
              </button>
            </div>
          </div>

          {/* 8. Verified By */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Verified By <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__pill-select">
              <div className="employee-registration__pill-tag">
                <span className="employee-registration__pill-avatar">
                  {getSelectedEmployee(verifiedById).initials}
                </span>
                <span>{getSelectedEmployee(verifiedById).name}</span>
              </div>
              <button
                type="button"
                className="employee-registration__pill-search-btn"
                onClick={() => setActivePickerField('verifiedBy')}
                title="Search Employee Directory"
              >
                🔍
              </button>
            </div>
          </div>

          {/* 9. Mentor */}
          <div className="employee-registration__field">
            <label className="employee-registration__label">
              Mentor <span className="employee-registration__required">*</span>
            </label>
            <div className="employee-registration__pill-select">
              <div className="employee-registration__pill-tag">
                <span className="employee-registration__pill-avatar">
                  {getSelectedEmployee(mentorId).initials}
                </span>
                <span>{getSelectedEmployee(mentorId).name}</span>
              </div>
              <button
                type="button"
                className="employee-registration__pill-search-btn"
                onClick={() => setActivePickerField('mentor')}
                title="Search Employee Directory"
              >
                🔍
              </button>
            </div>
          </div>
        </form>

        <div className="skills-section__form-actions">
          <button
            type="button"
            className="skills-section__add-btn"
            onClick={handleAddOrUpdateSkill}
          >
            {editingId ? 'Update Skill' : '+ Add Skill'}
          </button>
          {editingId && (
            <button
              type="button"
              className="skills-section__cancel-edit-btn"
              onClick={() => setEditingId(null)}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* Added Skills Summary List */}
      <div className="skills-section__summary-container">
        <h3 className="skills-section__summary-title">Added Skills ({skillsList.length})</h3>
        {skillsList.length === 0 ? (
          <p className="skills-section__empty-text">
            No skills added yet. Fill the form above to add.
          </p>
        ) : (
          <div className="skills-section__summary-grid">
            {skillsList.map((item) => (
              <div key={item.id} className="skills-section__card">
                <div className="skills-section__card-header">
                  <div>
                    <h4 className="skills-section__card-skill-name">
                      {item.skillName === 'Other' ? item.customSkillName : item.skillName}
                    </h4>
                    <span className="skills-section__type-badge">
                      {item.skillType === 'Other' ? item.customSkillType : item.skillType}
                    </span>
                  </div>
                  <div className="skills-section__card-actions">
                    <button
                      type="button"
                      className="skills-section__action-btn"
                      onClick={() => handleEditSkill(item)}
                      title="Edit Skill"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="skills-section__action-btn skills-section__action-btn--delete"
                      onClick={() => handleRemoveSkill(item.id)}
                      title="Remove Skill"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="skills-section__card-details">
                  <div className="skills-section__detail-row">
                    <span className="skills-section__detail-label">Proficiency Level:</span>
                    <span className="skills-section__detail-val">
                      {item.levelType} ({item.level})
                    </span>
                  </div>
                  <div className="skills-section__detail-row">
                    <span className="skills-section__detail-label">Experience & Date:</span>
                    <span className="skills-section__detail-val">
                      {item.yearsOfExperience} Yrs • Assessed {item.levelDate}
                    </span>
                  </div>
                  <div className="skills-section__detail-row">
                    <span className="skills-section__detail-label">
                      Assessed / Verified / Mentor:
                    </span>
                    <span className="skills-section__detail-val">
                      {item.examinerName} / {item.verifiedByName} / {item.mentorName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Search Modal */}
      {activePickerField && (
        <div className="skills-section__modal-overlay">
          <div className="skills-section__modal">
            <div className="skills-section__modal-header">
              <h4 className="skills-section__modal-title">
                Select Employee (
                {activePickerField === 'examiner'
                  ? 'Examiner'
                  : activePickerField === 'verifiedBy'
                    ? 'Verified By'
                    : 'Mentor'}
                )
              </h4>
              <button
                type="button"
                className="skills-section__modal-close"
                onClick={() => setActivePickerField(null)}
              >
                ✕
              </button>
            </div>
            <div className="skills-section__modal-body">
              <input
                type="text"
                className="employee-registration__input"
                placeholder="Search employee by name, designation, department..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
              />
              <div className="skills-section__employee-list">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="skills-section__employee-item"
                    onClick={() => handleSelectEmployeeModal(emp)}
                  >
                    <span className="employee-registration__pill-avatar">{emp.initials}</span>
                    <div className="skills-section__emp-info">
                      <span className="skills-section__emp-name">{emp.name}</span>
                      <span className="skills-section__emp-sub">
                        {emp.designation} • {emp.department} ({emp.id})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
