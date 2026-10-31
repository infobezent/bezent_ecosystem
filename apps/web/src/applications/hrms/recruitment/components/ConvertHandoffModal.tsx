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
import type { ConvertHandoffInput, OnboardingHandoffItem } from '../types/handoff';

export interface ConvertHandoffModalProps {
  item: OnboardingHandoffItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmHandoff: (input: ConvertHandoffInput) => void;
}

export function ConvertHandoffModal({
  item,
  isOpen,
  onClose,
  onConfirmHandoff,
}: ConvertHandoffModalProps) {
  const [template, setTemplate] = useState('Engineering Standard Pre-Boarding');
  const [partner, setPartner] = useState(item?.assignedPartner || 'Priya Sundaram');
  const [isRehire, setIsRehire] = useState(Boolean(item?.duplicateCheck?.hasDuplicate));
  const [triggerIt, setTriggerIt] = useState(true);
  const [targetDate, setTargetDate] = useState(item?.targetJoiningDate || '2026-11-17');
  const [notes, setNotes] = useState('Signed offer verified. BGV checks completed. Ready for pre-boarding passport.');

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmHandoff({
      handoffId: item.id,
      workflowTemplate: template,
      assignedPartner: partner,
      isRehire,
      triggerItProvisioning: triggerIt,
      targetJoiningDate: targetDate,
      notes: notes.trim(),
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
          <BezentIcon name="onboarding" size="action" />
          <span>Convert Hired Candidate to Onboarding Case</span>
        </Inline>
      }
      description={`Initialize pre-boarding pipeline and employee record bridge for ${item.candidateName} (${item.jobTitle}).`}
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Initialize Onboarding Case
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Candidate Snapshot */}
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <Inline justify="between" align="center">
              <span>Candidate: <strong>{item.candidateName}</strong> ({item.candidateNumber})</span>
              <span className="text-primary-700 font-semibold">{item.offerNumber}</span>
            </Inline>
            <div>Role: <strong>{item.jobTitle}</strong> • {item.department} ({item.designationLevel})</div>
            <div>Email / Phone: {item.candidateEmail} • {item.candidatePhone}</div>
          </div>

          {/* Duplicate Prevention Guard */}
          {item.duplicateCheck.hasDuplicate ? (
            <Alert variant="warning">
              <strong>Duplicate Identity Warning:</strong> Candidate email/PAN matches former record{' '}
              <strong>{item.duplicateCheck.existingEmployeeCode}</strong> ({item.duplicateCheck.existingEmployeeName}).
              Conversion will link this record as a <strong>Re-hire</strong> to avoid duplicate employee profiles.
            </Alert>
          ) : (
            <Alert variant="success">
              <strong>Identity Guard Passed:</strong> No duplicate national ID, email, or employee code found in BEZENT workforce database.
            </Alert>
          )}

          <FormGrid columns={2} gap="md">
            <FormField label="Onboarding Workflow Template" required>
              <Select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                options={[
                  { value: 'Engineering Standard Pre-Boarding', label: 'Engineering Standard Pre-Boarding' },
                  { value: 'Engineering Tech Lead Pre-Boarding', label: 'Engineering Tech Lead Pre-Boarding' },
                  { value: 'Standard Product & Design Pre-Boarding', label: 'Product & Design Pre-Boarding' },
                  { value: 'Executive & Leadership Onboarding', label: 'Executive & Leadership Onboarding' },
                  { value: 'General Corporate Pre-Boarding', label: 'General Corporate Pre-Boarding' },
                ]}
              />
            </FormField>

            <FormField label="Assigned People Partner / HR Buddy" required>
              <Select
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                options={[
                  { value: 'Priya Sundaram', label: 'Priya Sundaram (Head of People)' },
                  { value: 'Arun Kumar', label: 'Arun Kumar (People Operations Specialist)' },
                  { value: 'Sabin Rahul', label: 'Sabin Rahul (Design Operations)' },
                ]}
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2} gap="md">
            <FormField label="Confirmed Joining Date" required>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </FormField>

            <FormField label="Identity Record Handling">
              <Select
                value={isRehire ? 'rehire' : 'new_employee'}
                onChange={(e) => setIsRehire(e.target.value === 'rehire')}
                options={[
                  { value: 'new_employee', label: 'Create New Employee Record' },
                  { value: 'rehire', label: 'Re-hire (Link to Existing Record)' },
                ]}
              />
            </FormField>
          </FormGrid>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs space-y-2">
            <span className="font-semibold text-blue-900 block">Automated Pre-Boarding Provisions:</span>
            <label className="flex items-center gap-2 cursor-pointer text-blue-950">
              <input
                type="checkbox"
                checked={triggerIt}
                onChange={(e) => setTriggerIt(e.target.checked)}
              />
              <span>Trigger IT hardware requisition (MacBook Pro / Peripheral kit)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-blue-950">
              <input type="checkbox" defaultChecked />
              <span>Send Pre-Boarding Portal invitation email to candidate</span>
            </label>
          </div>

          <FormField label="Handoff Notes &amp; Handover Context">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any instructions for the onboarding coordinator..."
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
