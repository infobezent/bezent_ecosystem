import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { CalendarEmployee } from '../types/leaveOperations.types';

export interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjusted: (message: string) => void;
  employees: CalendarEmployee[];
  leaveTypes: Array<{ id: string; name: string; code: string }>;
  /** Pre-selected employee (from a register row). */
  employeeId?: string;
}

export function AdjustBalanceModal({
  isOpen,
  onClose,
  onAdjusted,
  employees,
  leaveTypes,
  employeeId: presetEmployee,
}: AdjustBalanceModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmployeeId(presetEmployee ?? '');
    setLeaveTypeId('');
    setDirection('credit');
    setDays('1');
    setReason('');
    setError(null);
  }, [isOpen, presetEmployee]);

  const numericDays = Number(days);
  const valid =
    employeeId &&
    leaveTypeId &&
    Number.isFinite(numericDays) &&
    numericDays > 0 &&
    reason.trim().length >= 3;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await leaveOperationsApi.adjustBalance({
        employeeId,
        leaveTypeId,
        direction,
        days: numericDays,
        reason: reason.trim(),
      });
      const who = employees.find((e) => e.id === employeeId)?.name ?? 'the employee';
      const type = leaveTypes.find((t) => t.id === leaveTypeId)?.name ?? 'leave';
      onAdjusted(
        `${direction === 'credit' ? 'Credited' : 'Debited'} ${numericDays} day(s) of ${type} ${direction === 'credit' ? 'to' : 'from'} ${who}.`,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust the balance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Adjust Leave Balance"
      description="Recorded in the employee's ledger with your reason. The employee is notified."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={direction === 'credit' ? 'primary' : 'danger'}
            type="button"
            disabled={!valid || saving}
            onClick={() => void submit()}
          >
            {saving ? 'Saving...' : direction === 'credit' ? 'Credit Balance' : 'Debit Balance'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="md">
        {error && <Alert variant="error">{error}</Alert>}
        <Select
          label="Employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={[
            { value: '', label: 'Select an employee' },
            ...employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employeeNumber})` })),
          ]}
        />
        <Select
          label="Leave type"
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          options={[
            { value: '', label: 'Select a leave type' },
            ...leaveTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
          ]}
        />
        <Grid columns={2} gap="md">
          <Select
            label="Adjustment"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')}
            options={[
              { value: 'credit', label: 'Credit (add days)' },
              { value: 'debit', label: 'Debit (deduct days)' },
            ]}
          />
          <Input
            label="Days"
            type="number"
            min={0.5}
            step={0.5}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            helperText="In steps of 0.5"
          />
        </Grid>
        <Textarea
          label="Reason"
          value={reason}
          rows={3}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
      </Stack>
    </Modal>
  );
}

export default AdjustBalanceModal;
