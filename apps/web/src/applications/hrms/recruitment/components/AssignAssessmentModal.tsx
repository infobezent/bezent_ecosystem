import { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  FormGrid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { Candidate } from '../types/candidate';
import type { AssessmentAssignment, AssessmentType } from '../types/assessment';

export interface AssignAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignment: AssessmentAssignment) => void;
  candidates: Candidate[];
}

export function AssignAssessmentModal({
  isOpen,
  onClose,
  onAssign,
  candidates,
}: AssignAssessmentModalProps) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id || 'cand-1');
  const [title, setTitle] = useState('Frontend Architecture & Performance Challenge');
  const [type, setType] = useState<AssessmentType>('coding_challenge');
  const [platform, setPlatform] = useState('GitHub Classroom');
  const [testLink, setTestLink] = useState('https://github.com/bezent-evals/fe-arch-test');
  const [dueDate, setDueDate] = useState('2026-11-06');
  const [evaluatorName, setEvaluatorName] = useState('Priya Sundaram');
  const evaluatorRole = 'VP of Engineering';
  const [instructions, setInstructions] = useState(
    'Please clone the starter repository, follow the README specification, and open a pull request with your solution and test suite.',
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === candidateId) || candidates[0];
    if (!cand) {
      setError('Please select a candidate.');
      return;
    }
    if (!title.trim()) {
      setError('Assessment title is required.');
      return;
    }

    const newAssignment: AssessmentAssignment = {
      id: `asmt-${Date.now()}`,
      candidateId: cand.id,
      candidateName: cand.fullName,
      candidateNumber: cand.candidateNumber,
      candidateEmail: cand.email,
      candidateAvatarColor: 'blue',
      jobId: cand.appliedJobId,
      jobTitle: cand.appliedJobTitle,
      jobCode: cand.appliedJobCode,
      title: title.trim(),
      type,
      status: 'assigned',
      platform: platform.trim(),
      testLink: testLink.trim() || undefined,
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate,
      evaluatorName: evaluatorName.trim(),
      evaluatorRole: evaluatorRole.trim(),
      maxScore: 100,
    };

    onAssign(newAssignment);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="tasks" size="action" />
          <span>Assign Practical Assessment</span>
        </Inline>
      }
      description="Send a technical coding challenge, design project, or domain case study to an applicant."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Assign Assessment
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormGrid columns={2} gap="md">
            <FormField label="Candidate" required>
              <Select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                options={candidates.map((c) => ({
                  value: c.id,
                  label: `${c.fullName} — ${c.appliedJobTitle}`,
                }))}
              />
            </FormField>

            <FormField label="Assessment Category" required>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as AssessmentType)}
                options={[
                  { value: 'coding_challenge', label: 'Coding Challenge' },
                  { value: 'design_project', label: 'Design Project' },
                  { value: 'take_home_assignment', label: 'Take-Home Project' },
                  { value: 'domain_case_study', label: 'Domain Case Study' },
                  { value: 'aptitude_cognitive', label: 'Aptitude / Cognitive' },
                ]}
              />
            </FormField>

            <FormField label="Challenge Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Ledger Challenge"
              />
            </FormField>

            <FormField label="Platform / Tool" required>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                options={[
                  { value: 'GitHub Classroom', label: 'GitHub Classroom' },
                  { value: 'Figma Community File', label: 'Figma Community File' },
                  { value: 'HackerRank', label: 'HackerRank Test' },
                  { value: 'Google Drive Document', label: 'Google Drive Document' },
                  { value: 'CodeSandbox', label: 'CodeSandbox' },
                ]}
              />
            </FormField>

            <FormField label="Due Date" required>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>

            <FormField label="Lead Evaluator Name" required>
              <Input
                value={evaluatorName}
                onChange={(e) => setEvaluatorName(e.target.value)}
                placeholder="e.g. Mukesh Murugesan"
              />
            </FormField>
          </FormGrid>

          <FormField label="Challenge Repository or Workspace URL">
            <Input
              value={testLink}
              onChange={(e) => setTestLink(e.target.value)}
              placeholder="https://github.com/..."
            />
          </FormField>

          <FormField label="Instructions & Deliverables for Candidate">
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
