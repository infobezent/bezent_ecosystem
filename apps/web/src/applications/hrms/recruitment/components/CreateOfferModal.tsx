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
import type { JobOffer } from '../types/offer';

export interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOffer: (offer: JobOffer) => void;
  candidates: Candidate[];
}

export function CreateOfferModal({
  isOpen,
  onClose,
  onCreateOffer,
  candidates,
}: CreateOfferModalProps) {
  const eligibleCandidates = candidates.filter(
    (c) =>
      c.currentStage === 'interview' ||
      c.currentStage === 'assessment' ||
      c.currentStage === 'selected' ||
      c.currentStage === 'offer',
  );

  const [candidateId, setCandidateId] = useState(
    eligibleCandidates[0]?.id || candidates[0]?.id || '',
  );
  const [level, setLevel] = useState('L5 - Senior Specialist');
  const [ctcLpa, setCtcLpa] = useState('28');
  const [baseLpa, setBaseLpa] = useState('16');
  const [variableLpa, setVariableLpa] = useState('2');
  const [stockLpa, setStockLpa] = useState('2');
  const [targetJoiningDate, setTargetJoiningDate] = useState('2026-11-20');
  const [expiryDate, setExpiryDate] = useState('2026-11-06');
  const [notes, setNotes] = useState('Approved by Hiring Panel after technical evaluation.');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === candidateId) || candidates[0];
    if (!cand) {
      setError('Please select a candidate.');
      return;
    }

    const totalCtc = Math.round((parseFloat(ctcLpa) || 28) * 100000);
    const basePay = Math.round((parseFloat(baseLpa) || 16) * 100000);
    const performanceBonus = Math.round((parseFloat(variableLpa) || 2) * 100000);
    const stockOptionsValue = Math.round((parseFloat(stockLpa) || 2) * 100000);
    const hra = Math.round(basePay * 0.4);
    const statutoryBonus = 60000;
    const pf = 80000;
    const specialAllowance = Math.max(
      0,
      totalCtc - (basePay + hra + performanceBonus + stockOptionsValue + statutoryBonus + pf),
    );

    const newOffer: JobOffer = {
      id: `off-${Date.now()}`,
      offerNumber: `OFF-2026-${Math.floor(100 + Math.random() * 900)}`,
      candidateId: cand.id,
      candidateName: cand.fullName,
      candidateEmail: cand.email,
      candidateNumber: cand.candidateNumber,
      candidateAvatarColor: 'blue',
      jobId: cand.appliedJobId,
      jobTitle: cand.appliedJobTitle,
      jobCode: cand.appliedJobCode,
      department: cand.applicationHistory[0]?.department || 'Engineering',
      location: 'Bangalore, India (Hybrid)',
      designationLevel: level,
      status: 'pending_approval',
      compensation: {
        basePay,
        houseRentAllowance: hra,
        specialAllowance,
        statutoryBonus,
        providentFundEmployer: pf,
        performanceBonus,
        stockOptionsValue,
        totalCtc,
      },
      currency: 'INR',
      offeredDate: new Date().toISOString().slice(0, 10),
      expiryDate,
      targetJoiningDate,
      approvalChain: [
        {
          id: `app-hm-${Date.now()}`,
          approverRole: 'Hiring Manager',
          approverName: 'Mukesh Murugesan',
          approverEmail: 'mukesh.murugesan@bezent.com',
          status: 'pending',
        },
        {
          id: `app-fin-${Date.now()}`,
          approverRole: 'Finance Controller',
          approverName: 'Arjun Nambiar',
          approverEmail: 'arjun.nambiar@bezent.com',
          status: 'pending',
        },
        {
          id: `app-vp-${Date.now()}`,
          approverRole: 'Head of People',
          approverName: 'Priya Sundaram',
          approverEmail: 'priya.sundaram@bezent.com',
          status: 'pending',
        },
      ],
      notes: notes.trim(),
    };

    onCreateOffer(newOffer);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="offers" size="action" />
          <span>Draft New Job Offer</span>
        </Inline>
      }
      description="Define the candidate's compensation structure, joining date, and trigger the multi-tier approval workflow."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Create &amp; Route for Approval
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormGrid columns={2} gap="md">
            <FormField label="Select Candidate" required>
              <Select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                options={candidates.map((c) => ({
                  value: c.id,
                  label: `${c.fullName} (${c.candidateNumber}) — ${c.appliedJobTitle}`,
                }))}
              />
            </FormField>

            <FormField label="Designation / Band" required>
              <Input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g. L5 - Senior Product Designer"
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2} gap="md">
            <FormField label="Total CTC (LPA ₹)" required>
              <Input
                type="number"
                value={ctcLpa}
                onChange={(e) => setCtcLpa(e.target.value)}
                placeholder="28"
              />
            </FormField>

            <FormField label="Base Pay (LPA ₹)" required>
              <Input
                type="number"
                value={baseLpa}
                onChange={(e) => setBaseLpa(e.target.value)}
                placeholder="16"
              />
            </FormField>

            <FormField label="Variable Bonus (LPA ₹)">
              <Input
                type="number"
                value={variableLpa}
                onChange={(e) => setVariableLpa(e.target.value)}
                placeholder="2"
              />
            </FormField>

            <FormField label="ESOP / Stock (LPA ₹)">
              <Input
                type="number"
                value={stockLpa}
                onChange={(e) => setStockLpa(e.target.value)}
                placeholder="2"
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2} gap="md">
            <FormField label="Target Joining Date" required>
              <Input
                type="date"
                value={targetJoiningDate}
                onChange={(e) => setTargetJoiningDate(e.target.value)}
              />
            </FormField>

            <FormField label="Offer Validity / Expiry Date" required>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </FormField>
          </FormGrid>

          <FormField label="Internal Notes &amp; Justification">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Provide background regarding why this compensation band was chosen..."
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
