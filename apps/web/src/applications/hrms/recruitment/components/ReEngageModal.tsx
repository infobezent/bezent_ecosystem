import { useState } from 'react';
import {
  Button,
  FormField,
  FormGrid,
  Inline,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { ReEngageInput, TalentProfile } from '../types/talentPool';
import type { JobOpening } from '../types/jobOpening';

export interface ReEngageModalProps {
  profile: TalentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReEngage: (input: ReEngageInput) => void;
  jobOpenings: JobOpening[];
}

export function ReEngageModal({
  profile,
  isOpen,
  onClose,
  onConfirmReEngage,
  jobOpenings,
}: ReEngageModalProps) {
  const openJobs = jobOpenings.filter((j) => j.status === 'open');
  const [targetJobId, setTargetJobId] = useState(openJobs[0]?.id || 'job-1');
  const [fastTrackStage, setFastTrackStage] = useState<
    'applied' | 'screening' | 'shortlisted' | 'interview'
  >('shortlisted');
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'phone'>('email');
  const [message, setMessage] = useState(
    `Hi ${profile?.fullName || ''},\n\nWe really enjoyed speaking with you during your previous evaluation for BEZENT. A new requisition has opened up that perfectly aligns with your background, and we'd love to fast-track your profile. Would you be open for a quick sync this week?`,
  );

  if (!profile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReEngage({
      talentId: profile.id,
      targetJobId,
      fastTrackStage,
      outreachChannel,
      message: message.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="pipeline" size="action" />
          <span>Re-Engage Talent — {profile.fullName}</span>
        </Inline>
      }
      description={`Fast-track ${profile.fullName} into an active hiring pipeline and dispatch a personalized outreach message.`}
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Fast-Track &amp; Send Outreach
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <FormGrid columns={2} gap="md">
            <FormField label="Target Active Requisition" required>
              <Select
                value={targetJobId}
                onChange={(e) => setTargetJobId(e.target.value)}
                options={openJobs.map((j) => ({
                  value: j.id,
                  label: `${j.title} (${j.jobCode}) — ${j.department}`,
                }))}
              />
            </FormField>

            <FormField label="Fast-Track Pipeline Stage" required>
              <Select
                value={fastTrackStage}
                onChange={(e) => setFastTrackStage(e.target.value as typeof fastTrackStage)}
                options={[
                  { value: 'shortlisted', label: 'Shortlisted (Skip Screening)' },
                  { value: 'interview', label: 'Direct to Technical Interview' },
                  { value: 'screening', label: 'Recruiter Screening' },
                  { value: 'applied', label: 'Initial Review / Applied' },
                ]}
              />
            </FormField>
          </FormGrid>

          <FormField label="Outreach Channel" required>
            <Select
              value={outreachChannel}
              onChange={(e) => setOutreachChannel(e.target.value as typeof outreachChannel)}
              options={[
                { value: 'email', label: `Personalized Email (${profile.email})` },
                { value: 'phone', label: `Direct Phone Call (${profile.phone})` },
              ]}
            />
          </FormField>

          <FormField label="Outreach Message / Email Body" required>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
