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
import type { Candidate, CandidateSource } from '../types/candidate';
import type { JobOpening } from '../types/jobOpening';

export interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCandidate: (candidate: Candidate) => void;
  jobs: JobOpening[];
  existingCount: number;
}

export function AddCandidateModal({
  isOpen,
  onClose,
  onAddCandidate,
  jobs,
  existingCount,
}: AddCandidateModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('HQ - Chennai');
  const [appliedJobId, setAppliedJobId] = useState(jobs[0]?.id || 'job-1');
  const [totalExperienceYears, setTotalExperienceYears] = useState('4.0');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [source, setSource] = useState<CandidateSource>('linkedin');
  const [referredBy, setReferredBy] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('30');
  const [expectedCtcLpa, setExpectedCtcLpa] = useState('24');
  const [skillsRaw, setSkillsRaw] = useState('React, TypeScript, CSS');
  const [tagsRaw, setTagsRaw] = useState('Fast Learner, Enterprise Fit');
  const [summary, setSummary] = useState(
    'Strong professional looking to contribute to scalable cloud enterprise platforms.',
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    const selectedJob = jobs.find((j) => j.id === appliedJobId) || jobs[0];
    const newNumber = `CND-2026-${String(existingCount + 1).padStart(3, '0')}`;
    const skillsList = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const tagsList = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newCandidate: Candidate = {
      id: `cand-${Date.now()}`,
      candidateNumber: newNumber,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 90000 00000',
      location,
      currentCompany: currentCompany.trim() || undefined,
      currentDesignation: currentDesignation.trim() || undefined,
      totalExperienceYears: parseFloat(totalExperienceYears) || 0,
      relevantExperienceYears: parseFloat(totalExperienceYears) || 0,
      source,
      referredBy: source === 'referral' ? referredBy.trim() : undefined,
      tags: tagsList,
      skills: skillsList.length > 0 ? skillsList : ['General'],
      appliedJobId: selectedJob?.id || 'job-1',
      appliedJobTitle: selectedJob?.title || 'General Applicant',
      appliedJobCode: selectedJob?.jobCode || 'JOB-2026-001',
      currentStage: 'applied',
      rating: 4.0,
      appliedDate: new Date().toISOString().slice(0, 10),
      resumeFileName: `${fullName.trim().replace(/\s+/g, '_')}_Resume.pdf`,
      summary: summary.trim(),
      noticePeriodDays: parseInt(noticePeriodDays, 10) || 30,
      expectedCtcLpa: parseFloat(expectedCtcLpa) || undefined,
      experienceHistory: currentCompany
        ? [{ company: currentCompany, role: currentDesignation || 'Engineer', duration: '2022 - Present', current: true }]
        : [],
      educationHistory: [{ degree: 'B.E. / B.Tech', institution: 'State University', year: '2020' }],
      applicationHistory: [
        {
          id: `app-${Date.now()}`,
          jobTitle: selectedJob?.title || 'General Requisition',
          jobCode: selectedJob?.jobCode || 'JOB-2026-001',
          department: selectedJob?.department || 'Engineering',
          appliedDate: new Date().toISOString().slice(0, 10),
          stage: 'applied',
          rating: 4.0,
        },
      ],
    };

    onAddCandidate(newCandidate);
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
          <span>Add New Candidate</span>
        </Inline>
      }
      description="Add an applicant profile, resume metadata, and assign them to an active job opening."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Candidate Profile
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Personal & Contact */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Personal & Contact Information</h4>
            <FormGrid columns={2} gap="md">
              <FormField label="Full Name" required>
                <Input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Arunachalam S"
                />
              </FormField>

              <FormField label="Email Address" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. arun.s@example.com"
                />
              </FormField>

              <FormField label="Phone Number" required>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98401 55667"
                />
              </FormField>

              <FormField label="Location" required>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Chennai, TN"
                />
              </FormField>
            </FormGrid>
          </Stack>

          {/* Application & Job */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Job Application & Sourcing</h4>
            <FormGrid columns={2} gap="md">
              <FormField label="Target Job Opening" required>
                <Select
                  value={appliedJobId}
                  onChange={(e) => setAppliedJobId(e.target.value)}
                  options={jobs.map((j) => ({
                    value: j.id,
                    label: `${j.title} (${j.jobCode})`,
                  }))}
                />
              </FormField>

              <FormField label="Sourcing Channel" required>
                <Select
                  value={source}
                  onChange={(e) => setSource(e.target.value as CandidateSource)}
                  options={[
                    { value: 'linkedin', label: 'LinkedIn' },
                    { value: 'referral', label: 'Employee Referral' },
                    { value: 'career_page', label: 'Career Page' },
                    { value: 'agency', label: 'Staffing Agency' },
                    { value: 'naukri', label: 'Job Board' },
                    { value: 'direct', label: 'Direct Inbound' },
                  ]}
                />
              </FormField>

              {source === 'referral' && (
                <FormField label="Referred By Employee Name">
                  <Input
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    placeholder="e.g. Mukesh Murugesan"
                  />
                </FormField>
              )}
            </FormGrid>
          </Stack>

          {/* Experience & Compensation */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Experience & Compensation</h4>
            <FormGrid columns={2} gap="md">
              <FormField label="Total Experience (Years)" required>
                <Input
                  type="number"
                  step="0.5"
                  value={totalExperienceYears}
                  onChange={(e) => setTotalExperienceYears(e.target.value)}
                />
              </FormField>

              <FormField label="Current Company">
                <Input
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="e.g. Freshworks Inc."
                />
              </FormField>

              <FormField label="Current Role / Title">
                <Input
                  value={currentDesignation}
                  onChange={(e) => setCurrentDesignation(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />
              </FormField>

              <FormField label="Notice Period (Days)" required>
                <Select
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(e.target.value)}
                  options={[
                    { value: '0', label: 'Immediate Joiner' },
                    { value: '15', label: '15 Days' },
                    { value: '30', label: '30 Days' },
                    { value: '60', label: '60 Days' },
                    { value: '90', label: '90 Days' },
                  ]}
                />
              </FormField>

              <FormField label="Expected CTC (LPA)">
                <Input
                  type="number"
                  value={expectedCtcLpa}
                  onChange={(e) => setExpectedCtcLpa(e.target.value)}
                  placeholder="e.g. 28"
                />
              </FormField>
            </FormGrid>
          </Stack>

          {/* Skills & Summary */}
          <Stack gap="xs">
            <h4 className="bezent-font-semibold bezent-text-sm">Skills & Pitch</h4>
            <FormField label="Verified Skills (comma separated)" required>
              <Input
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="e.g. React, TypeScript, GraphQL, Node.js"
              />
            </FormField>

            <FormField label="Candidate Tags (comma separated)">
              <Input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="e.g. Fast Joiner, Top University, High Scale"
              />
            </FormField>

            <FormField label="Candidate Pitch / Summary">
              <Textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </FormField>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
