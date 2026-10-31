import { useState } from 'react';
import {
  Button,
  FormField,
  Inline,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOffer } from '../types/offer';
import { formatCtc } from './OffersTable';

export interface ApproveOfferModalProps {
  offer: JobOffer | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmApproval: (offerId: string, decision: 'approved' | 'rejected', comments: string) => void;
}

export function ApproveOfferModal({
  offer,
  isOpen,
  onClose,
  onConfirmApproval,
}: ApproveOfferModalProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [comments, setComments] = useState('Approved. Compensation conforms to band guidelines.');

  if (!offer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmApproval(offer.id, decision, comments.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="check" size="action" />
          <span>Review Offer Approval — {offer.offerNumber}</span>
        </Inline>
      }
      description={`Sign off on the offer package for ${offer.candidateName} (${offer.jobTitle}).`}
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={decision === 'approved' ? 'primary' : 'danger'}
            onClick={handleSubmit}
          >
            Confirm {decision === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div>Candidate: <strong>{offer.candidateName}</strong></div>
            <div>Role: <strong>{offer.jobTitle}</strong> ({offer.department})</div>
            <div>Total Package: <strong className="text-primary-700">{formatCtc(offer.compensation.totalCtc, offer.currency)}</strong></div>
            <div>Target Joining Date: <strong>{offer.targetJoiningDate}</strong></div>
          </div>

          <FormField label="Sign-off Decision" required>
            <Select
              value={decision}
              onChange={(e) => setDecision(e.target.value as typeof decision)}
              options={[
                { value: 'approved', label: 'Approve & Pass to Next Step' },
                { value: 'rejected', label: 'Reject & Request Compensation Revision' },
              ]}
            />
          </FormField>

          <FormField label="Approver Comments & Notes">
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Enter approval rationale or adjustment requirements..."
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
