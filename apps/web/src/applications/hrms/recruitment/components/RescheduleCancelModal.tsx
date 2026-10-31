import { useState } from 'react';
import {
  Button,
  FormField,
  FormGrid,
  Inline,
  Input,
  Modal,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { InterviewSchedule } from '../types/interview';

export interface RescheduleCancelModalProps {
  interview: InterviewSchedule | null;
  mode: 'reschedule' | 'cancel';
  isOpen: boolean;
  onClose: () => void;
  onConfirmReschedule: (interviewId: string, newDate: string, newStart: string, newEnd: string, reason: string) => void;
  onConfirmCancel: (interviewId: string, reason: string) => void;
}

export function RescheduleCancelModal({
  interview,
  mode,
  isOpen,
  onClose,
  onConfirmReschedule,
  onConfirmCancel,
}: RescheduleCancelModalProps) {
  const [newDate, setNewDate] = useState(interview?.scheduledDate || '2026-11-01');
  const [newStart, setNewStart] = useState(interview?.startTime || '15:00');
  const [newEnd, setNewEnd] = useState(interview?.endTime || '16:00');
  const [reason, setReason] = useState(
    mode === 'reschedule'
      ? 'Interviewer scheduling conflict, moved to alternative slot.'
      : 'Requisition vacancy filled by earlier candidate.',
  );

  if (!interview || !isOpen) return null;

  const isReschedule = mode === 'reschedule';

  const handleConfirm = () => {
    if (isReschedule) {
      onConfirmReschedule(interview.id, newDate, newStart, newEnd, reason);
    } else {
      onConfirmCancel(interview.id, reason);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name={isReschedule ? 'calendar' : 'delete'} size="action" />
          <span>{isReschedule ? 'Reschedule Interview Round' : 'Cancel Interview'}</span>
        </Inline>
      }
      description={`Candidate: ${interview.candidateName} • ${interview.roundName}`}
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button
            variant={isReschedule ? 'primary' : 'danger'}
            onClick={handleConfirm}
          >
            {isReschedule ? 'Confirm Reschedule' : 'Confirm Cancellation'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="md">
        {isReschedule && (
          <FormGrid columns={2} gap="md">
            <FormField label="New Date" required>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </FormField>

            <FormField label="New Slot (Start - End)" required>
              <Inline gap="xs" align="center">
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
                <span>-</span>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </Inline>
            </FormField>
          </FormGrid>
        )}

        <FormField label={isReschedule ? 'Reschedule Reason' : 'Cancellation Reason'} required>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
      </Stack>
    </Modal>
  );
}
