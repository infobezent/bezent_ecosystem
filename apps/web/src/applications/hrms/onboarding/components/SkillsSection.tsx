import { useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Button,
  Badge,
  Card,
  CardTitle,
  Label,
  Modal,
  Avatar,
  Stack,
  Inline,
  Grid,
  EmptyState,
} from '../../../../design-system';

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
      skillType,
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

  const skillOptions = [
    ...SKILL_MASTER.map((s) => ({ value: s.name, label: `${s.name} (${s.defaultType})` })),
    { value: 'Other', label: 'Other / Add New Skill' },
  ];

  const skillTypeOptions = [
    { value: 'Technical', label: 'Technical' },
    { value: 'Functional', label: 'Functional' },
    { value: 'Soft Skill', label: 'Soft Skill' },
    { value: 'Language', label: 'Language' },
    { value: 'Professional', label: 'Professional' },
    { value: 'Other', label: 'Other' },
  ];

  const levelTypeOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Expert', label: 'Expert' },
  ];

  const currentLevelOptions = (LEVEL_OPTIONS_BY_TYPE[levelType] || []).map((lvl) => ({
    value: lvl,
    label: lvl,
  }));

  return (
    <Stack gap="xl">
      {/* 1. Skill Entry Form */}
      <FormSection
        title="Skill Proficiency & Assessment"
        description="Employee skills, proficiency, assessment and mentorship information."
      >
        <Card variant="flat">
          <Stack gap="md">
            <CardTitle>{editingId ? 'Edit Skill Entry' : 'Add New Skill Entry'}</CardTitle>

            <FormGrid columns={2} layout="horizontal" labelWidth="md">
              {/* 1. Skill */}
              <FormField label="Skill" required>
                <Stack gap="xs">
                  <Select
                    options={skillOptions}
                    value={selectedSkill}
                    onChange={(e) => handleSkillChange(e.target.value)}
                  />
                  {selectedSkill === 'Other' && (
                    <Input
                      type="text"
                      placeholder="Enter Skill"
                      value={customSkillName}
                      onChange={(e) => setCustomSkillName(e.target.value)}
                    />
                  )}
                </Stack>
              </FormField>

              {/* 2. Skill Type */}
              <FormField label="Skill Type" required>
                <Stack gap="xs">
                  <Select
                    options={skillTypeOptions}
                    value={skillType}
                    onChange={(e) => setSkillType(e.target.value as SkillEntry['skillType'])}
                  />
                  {skillType === 'Other' && (
                    <Input
                      type="text"
                      placeholder="Enter Skill Type"
                      value={customSkillType}
                      onChange={(e) => setCustomSkillType(e.target.value)}
                    />
                  )}
                </Stack>
              </FormField>

              {/* 3. Level Type */}
              <FormField label="Level Type" required>
                <Select
                  options={levelTypeOptions}
                  value={levelType}
                  onChange={(e) =>
                    handleLevelTypeChange(
                      e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
                    )
                  }
                />
              </FormField>

              {/* 4. Level */}
              <FormField label="Level" required>
                <Select
                  options={currentLevelOptions}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </FormField>

              {/* 5. Level Date */}
              <FormField label="Level Date" required>
                <Input
                  type="date"
                  value={levelDate}
                  onChange={(e) => setLevelDate(e.target.value)}
                />
              </FormField>

              {/* 6. Years of Experience */}
              <FormField label="Experience" required>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 1.5 Years"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                />
              </FormField>

              {/* 7. Examiner */}
              <FormField label="Examiner" required>
                <Inline gap="xs" align="center">
                  <Avatar initials={getSelectedEmployee(examinerId).initials} size="sm" />
                  <span>{getSelectedEmployee(examinerId).name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivePickerField('examiner')}
                  >
                    Select
                  </Button>
                </Inline>
              </FormField>

              {/* 8. Verified By */}
              <FormField label="Verified By" required>
                <Inline gap="xs" align="center">
                  <Avatar initials={getSelectedEmployee(verifiedById).initials} size="sm" />
                  <span>{getSelectedEmployee(verifiedById).name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivePickerField('verifiedBy')}
                  >
                    Select
                  </Button>
                </Inline>
              </FormField>

              {/* 9. Mentor */}
              <FormField label="Mentor" required>
                <Inline gap="xs" align="center">
                  <Avatar initials={getSelectedEmployee(mentorId).initials} size="sm" />
                  <span>{getSelectedEmployee(mentorId).name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivePickerField('mentor')}
                  >
                    Select
                  </Button>
                </Inline>
              </FormField>
            </FormGrid>

            <Inline gap="sm">
              <Button type="button" variant="primary" onClick={handleAddOrUpdateSkill}>
                {editingId ? 'Update Skill' : '+ Add Skill'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel Edit
                </Button>
              )}
            </Inline>
          </Stack>
        </Card>
      </FormSection>

      {/* 2. Added Skills Summary */}
      <FormSection
        title={`Added Skills (${skillsList.length})`}
        description="Skills recorded for this employee."
      >
        {skillsList.length === 0 ? (
          <EmptyState title="No skills added" description="Fill the form above to add a skill." />
        ) : (
          <Grid columns={2} gap="md">
            {skillsList.map((item) => (
              <Card key={item.id} variant="flat">
                <Stack gap="sm">
                  <Inline justify="between" align="start">
                    <Stack gap="xs">
                      <CardTitle>
                        {item.skillName === 'Other' ? item.customSkillName : item.skillName}
                      </CardTitle>
                      <Badge variant="neutral" size="sm">
                        {item.skillType === 'Other' ? item.customSkillType : item.skillType}
                      </Badge>
                    </Stack>
                    <Inline gap="xs">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSkill(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSkill(item.id)}
                      >
                        Remove
                      </Button>
                    </Inline>
                  </Inline>

                  <Stack gap="xs">
                    <Inline gap="xs" align="center">
                      <Label size="sm">Proficiency:</Label>
                      <span className="bezent-card__desc">
                        {item.levelType} ({item.level})
                      </span>
                    </Inline>
                    <Inline gap="xs" align="center">
                      <Label size="sm">Experience:</Label>
                      <span className="bezent-card__desc">
                        {item.yearsOfExperience} Yrs • Assessed {item.levelDate}
                      </span>
                    </Inline>
                    <Inline gap="xs" align="center">
                      <Label size="sm">Reviewers:</Label>
                      <span className="bezent-card__desc">
                        {item.examinerName} (Assessed) • {item.verifiedByName} (Verified) •{' '}
                        {item.mentorName} (Mentor)
                      </span>
                    </Inline>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Grid>
        )}
      </FormSection>

      {/* 3. Employee Search Modal */}
      {activePickerField && (
        <Modal
          isOpen={!!activePickerField}
          onClose={() => {
            setActivePickerField(null);
            setSearchFilter('');
          }}
          title={`Select ${
            activePickerField === 'examiner'
              ? 'Examiner'
              : activePickerField === 'verifiedBy'
                ? 'Verified By'
                : 'Mentor'
          }`}
          size="md"
        >
          <Stack gap="md">
            <Input
              type="text"
              placeholder="Search employee by name, designation, department..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              autoFocus
            />

            <Stack gap="xs">
              {filteredEmployees.map((emp) => (
                <Card key={emp.id} variant="flat" onClick={() => handleSelectEmployeeModal(emp)}>
                  <Inline gap="sm" align="center">
                    <Avatar initials={emp.initials} size="md" />
                    <Stack gap="xs">
                      <strong>{emp.name}</strong>
                      <span>
                        {emp.designation} • {emp.department} ({emp.id})
                      </span>
                    </Stack>
                  </Inline>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
