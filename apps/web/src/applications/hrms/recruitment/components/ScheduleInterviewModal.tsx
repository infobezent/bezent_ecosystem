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
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { Candidate } from '../types/candidate';
import type {
  InterviewSchedule,
  InterviewType,
} from '../types/interview';

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (interview: InterviewSchedule) => void;
  candidates: Candidate[];
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSchedule,
  candidates,
}: ScheduleInterviewModalProps) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id || 'cand-1');
  const [roundName, setRoundName] = useState('Round 2: Technical Architecture');
  const [interviewType, setInterviewType] = useState<InterviewType>('technical');
  const [scheduledDate, setScheduledDate] = useState('2026-10-31');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [panelName, setPanelName] = useState('Priya Sundaram');
  const [panelRole, setPanelRole] = useState('Engineering Manager');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/bez-interview');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === candidateId) || candidates[0];
    if (!cand) {
      setError('Please select a valid candidate.');
      return;
    }

    const newInterview: InterviewSchedule = {
      id: `int-${Date.now()}`,
      candidateId: cand.id,
      candidateName: cand.fullName,
      candidateNumber: cand.candidateNumber,
      candidateEmail: cand.email,
      candidateAvatarColor: 'blue',
      jobId: cand.appliedJobId,
      jobTitle: cand.appliedJobTitle,
      jobCode: cand.appliedJobCode,
      roundName: roundName.trim(),
      interviewType,
      status: 'scheduled',
      scheduledDate,
      startTime,
      endTime,
      durationMinutes: 60,
      meetingLink: meetingLink.trim(),
      panel: [
        {
          name: panelName.trim(),
          role: panelRole.trim(),
          email: `${panelName.toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
          avatarColor: 'purple',
        },
      ],
    };

    onSchedule(newInterview);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="calendar" size="action" />
          <span>Schedule Interview Round</span>
        </Inline>
      }
      description="Book an interview round, assign evaluators, and configure meeting coordinates."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Confirm & Schedule
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

            <FormField label="Interview Category" required>
              <Select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                options={[
                  { value: 'technical', label: 'Technical Coding' },
                  { value: 'system_design', label: 'System Design & Architecture' },
                  { value: 'managerial', label: 'Managerial & Problem Solving' },
                  { value: 'cultural_fit', label: 'Executive Culture Alignment' },
                  { value: 'screening', label: 'Recruiter Screening' },
                ]}
              />
            </FormField>

            <FormField label="Round Title" required>
              <Input
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g. Round 2: Architecture Deep Dive"
              />
            </FormField>

            <FormField label="Scheduled Date" required>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </FormField>

            <FormField label="Start Time" required>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </FormField>

            <FormField label="End Time" required>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </FormField>

            <FormField label="Lead Interviewer Name" required>
              <Input
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="e.g. Priya Sundaram"
              />
            </FormField>

            <FormField label="Interviewer Role" required>
              <Input
                value={panelRole}
                onChange={(e) => setPanelRole(e.target.value)}
                placeholder="e.g. Engineering Director"
              />
            </FormField>
          </FormGrid>

          <FormField label="Virtual Meeting URL (Google Meet / Zoom)" required>
            <Input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
