import { useState } from 'react';
import {
  Alert,
  Button,
  FormGrid,
  FormField,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  EmploymentType,
  ExperienceLevel,
  JobOpening,
  JobStatus,
  WorkplaceType,
} from '../types/jobOpening';

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: (job: JobOpening) => void;
  existingCount: number;
}

export function CreateJobModal({
  isOpen,
  onClose,
  onCreateJob,
  existingCount,
}: CreateJobModalProps) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [location, setLocation] = useState('HQ - Chennai');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('hybrid');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('mid');
  const [positionsCount, setPositionsCount] = useState('1');
  const [targetCloseDate, setTargetCloseDate] = useState('2026-11-30');
  const [salaryMin, setSalaryMin] = useState('1800000');
  const [salaryMax, setSalaryMax] = useState('2800000');
  const [hiringManagerName, setHiringManagerName] = useState('Priya Sundaram');
  const [hiringManagerRole, setHiringManagerRole] = useState('Engineering Manager');
  const [recruiterName, setRecruiterName] = useState('Karthik Raja');
  const [skillsRaw, setSkillsRaw] = useState('React, TypeScript, CSS, Node.js');
  const [description, setDescription] = useState(
    'We are seeking a high-caliber professional to join our expanding enterprise development squad.',
  );
  const [responsibilitiesRaw, setResponsibilitiesRaw] = useState(
    'Architect and implement scalable business features.\nCollaborate with UX and product designers.\nConduct code reviews and maintain automated test quality.',
  );
  const [requirementsRaw, setRequirementsRaw] = useState(
    'Bachelor degree in Computer Science or equivalent practical experience.\n3+ years of relevant industry experience in enterprise software.\nExcellent analytical and problem-solving skills.',
  );
  const [status, setStatus] = useState<JobStatus>('open');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Job Title is required.');
      return;
    }

    const newCode = `JOB-2026-${String(existingCount + 1).padStart(3, '0')}`;
    const skillsList = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const responsibilitiesList = responsibilitiesRaw
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    const requirementsList = requirementsRaw
      .split('\n')
      .map((req) => req.trim())
      .filter(Boolean);

    const newJob: JobOpening = {
      id: `job-${Date.now()}`,
      jobCode: newCode,
      title: title.trim(),
      department,
      location,
      workplaceType,
      employmentType,
      experienceLevel,
      status,
      positionsCount: Math.max(1, parseInt(positionsCount, 10) || 1),
      filledCount: 0,
      totalApplicants: 0,
      postedDate: new Date().toISOString().slice(0, 10),
      targetCloseDate,
      salaryMin: parseInt(salaryMin, 10) || undefined,
      salaryMax: parseInt(salaryMax, 10) || undefined,
      currency: 'INR',
      hiringManager: {
        name: hiringManagerName,
        role: hiringManagerRole,
        email: `${hiringManagerName.toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
        avatarColor: 'purple',
      },
      recruiter: {
        name: recruiterName,
        role: 'Talent Partner',
        email: `${recruiterName.toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
        avatarColor: 'blue',
      },
      interviewers: [],
      skills: skillsList.length > 0 ? skillsList : ['General'],
      description: description.trim(),
      responsibilities: responsibilitiesList,
      requirements: requirementsList,
      pipeline: {
        applied: 0,
        screening: 0,
        interview: 0,
        assessment: 0,
        offer: 0,
        hired: 0,
      },
    };

    onCreateJob(newJob);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="add" size="action" />
          <span>Create New Job Opening</span>
        </Inline>
      }
      description="Define requisition details, requirements, hiring team, and target closing timeline."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Publish Job Opening
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Core Information */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Requisition Details</h4>
            <FormGrid columns={2} gap="md">
              <FormField label="Job Title" required>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Senior Frontend Architect"
                />
              </FormField>

              <FormField label="Department" required>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  options={[
                    { value: 'Engineering', label: 'Engineering' },
                    { value: 'Product & Design', label: 'Product & Design' },
                    { value: 'Human Resources', label: 'Human Resources' },
                    { value: 'Marketing', label: 'Marketing' },
                    { value: 'Sales & Growth', label: 'Sales & Growth' },
                    { value: 'Finance & Legal', label: 'Finance & Legal' },
                  ]}
                />
              </FormField>

              <FormField label="Location" required>
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  options={[
                    { value: 'HQ - Chennai', label: 'HQ - Chennai' },
                    { value: 'Bengaluru Tech Hub', label: 'Bengaluru Tech Hub' },
                    { value: 'Remote - India', label: 'Remote - India' },
                    { value: 'Remote - Global', label: 'Remote - Global' },
                  ]}
                />
              </FormField>

              <FormField label="Workplace Policy" required>
                <Select
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                  options={[
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'remote', label: 'Remote' },
                    { value: 'on_site', label: 'On-site' },
                  ]}
                />
              </FormField>

              <FormField label="Employment Type" required>
                <Select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  options={[
                    { value: 'full_time', label: 'Full-time' },
                    { value: 'part_time', label: 'Part-time' },
                    { value: 'contract', label: 'Contract' },
                    { value: 'internship', label: 'Internship' },
                  ]}
                />
              </FormField>

              <FormField label="Experience Level" required>
                <Select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  options={[
                    { value: 'entry', label: 'Entry Level (0-2 yrs)' },
                    { value: 'mid', label: 'Mid Level (3-5 yrs)' },
                    { value: 'senior', label: 'Senior Level (6-8 yrs)' },
                    { value: 'lead', label: 'Lead / Principal (8+ yrs)' },
                    { value: 'executive', label: 'Executive' },
                  ]}
                />
              </FormField>

              <FormField label="Open Vacancies" required>
                <Input
                  type="number"
                  min="1"
                  value={positionsCount}
                  onChange={(e) => setPositionsCount(e.target.value)}
                />
              </FormField>

              <FormField label="Target Close Date" required>
                <Input
                  type="date"
                  value={targetCloseDate}
                  onChange={(e) => setTargetCloseDate(e.target.value)}
                />
              </FormField>

              <FormField label="Min Salary (INR)">
                <Input
                  type="number"
                  placeholder="e.g. 1800000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                />
              </FormField>

              <FormField label="Max Salary (INR)">
                <Input
                  type="number"
                  placeholder="e.g. 2800000"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                />
              </FormField>
            </FormGrid>
          </Stack>

          {/* Hiring Team */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Hiring Team</h4>
            <FormGrid columns={2} gap="md">
              <FormField label="Hiring Manager Name" required>
                <Input
                  value={hiringManagerName}
                  onChange={(e) => setHiringManagerName(e.target.value)}
                  placeholder="e.g. Priya Sundaram"
                />
              </FormField>

              <FormField label="Hiring Manager Title" required>
                <Input
                  value={hiringManagerRole}
                  onChange={(e) => setHiringManagerRole(e.target.value)}
                  placeholder="e.g. Engineering Director"
                />
              </FormField>

              <FormField label="Lead Recruiter" required>
                <Input
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  placeholder="e.g. Karthik Raja"
                />
              </FormField>

              <FormField label="Publish Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                  options={[
                    { value: 'open', label: 'Open (Active)' },
                    { value: 'draft', label: 'Draft (Internal Review)' },
                    { value: 'on_hold', label: 'On Hold' },
                  ]}
                />
              </FormField>
            </FormGrid>
          </Stack>

          {/* Requirements & Description */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Description & Requirements</h4>
            <FormField label="Key Skills (comma separated)" required>
              <Input
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="e.g. React, TypeScript, GraphQL, Next.js"
              />
            </FormField>

            <FormField label="Job Description">
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <FormField label="Key Responsibilities (one per line)">
              <Textarea
                rows={3}
                value={responsibilitiesRaw}
                onChange={(e) => setResponsibilitiesRaw(e.target.value)}
              />
            </FormField>

            <FormField label="Requirements & Qualifications (one per line)">
              <Textarea
                rows={3}
                value={requirementsRaw}
                onChange={(e) => setRequirementsRaw(e.target.value)}
              />
            </FormField>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
