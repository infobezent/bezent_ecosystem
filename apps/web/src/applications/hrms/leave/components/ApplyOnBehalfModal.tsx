import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  Checkbox,
  Grid,
  Inline,
  LocaleDatePicker,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { fetchEmployees } from '../../employees/api/employeesApi';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { EmployeeLeaveBalance, LeaveSession } from '../types/leaveOperations.types';

export interface ApplyOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied: (message: string) => void;
  canBackdateOverride?: boolean;
  canPayrollOverride?: boolean;
}

interface EmployeeOption {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  employeeId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  session: '' as '' | LeaveSession,
  reason: '',
  backdatedOverride: false,
  payrollLockOverride: false,
};

export function ApplyOnBehalfModal({
  isOpen,
  onClose,
  onApplied,
  canBackdateOverride = false,
  canPayrollOverride = false,
}: ApplyOnBehalfModalProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setBalances([]);
    setError(null);
    fetchEmployees({ pageSize: 200 })
      .then((res) =>
        setEmployees(
          res.data.map((e) => ({
            id: e.id,
            name:
              `${e.firstName} ${e.lastName ?? ''}`.trim() +
              (e.employeeNumber ? ` (${e.employeeNumber})` : ''),
          })),
        ),
      )
      .catch(() => setEmployees([]));
  }, [isOpen]);

  useEffect(() => {
    if (!form.employeeId) return;
    setBalances([]);
    leaveOperationsApi
      .employeeWorkspace(form.employeeId)
      .then((ws) => setBalances(ws.balances))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load balances'));
  }, [form.employeeId]);

  const selectedType = useMemo(
    () => balances.find((b) => b.leaveTypeId === form.leaveTypeId) ?? null,
    [balances, form.leaveTypeId],
  );
  const singleDay = !!form.startDate && form.startDate === form.endDate;
  const update = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  const valid =
    form.employeeId &&
    form.leaveTypeId &&
    form.startDate &&
    form.endDate &&
    form.endDate >= form.startDate &&
    form.reason.trim().length >= 3;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await leaveOperationsApi.applyOnBehalf({
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        session: singleDay && form.session ? form.session : null,
        backdatedOverride: form.backdatedOverride || undefined,
        payrollLockOverride: form.payrollLockOverride || undefined,
      });
      const who = employees.find((e) => e.id === form.employeeId)?.name ?? 'the employee';
      onApplied(
        `Leave applied for ${who} — ${res.status === 'approved' ? 'auto-approved' : 'sent for approval'}.`,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Apply Leave on Behalf"
      description="The request runs through the same policy checks and approval workflow as ESS. The employee is notified."
      footer={
        <Inline justify="end" gap="sm">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => void submit()}
            disabled={!valid || saving}
          >
            {saving ? 'Submitting...' : 'Submit Leave'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="md">
        {error && <Alert variant="error">{error}</Alert>}

        <Select
          label="Employee"
          value={form.employeeId}
          onChange={(e) => update({ employeeId: e.target.value, leaveTypeId: '' })}
          options={[
            { value: '', label: 'Select an employee' },
            ...employees.map((e) => ({ value: e.id, label: e.name })),
          ]}
        />

        {form.employeeId && (
          <Select
            label="Leave type"
            value={form.leaveTypeId}
            onChange={(e) => update({ leaveTypeId: e.target.value, session: '' })}
            options={[
              {
                value: '',
                label: balances.length ? 'Select a leave type' : 'Loading leave types…',
              },
              ...balances.map((b) => ({
                value: b.leaveTypeId,
                label: `${b.leaveTypeName} (${b.leaveTypeCode}) — ${
                  b.availableDays === null ? 'Unlimited' : `${b.availableDays} available`
                }`,
              })),
            ]}
          />
        )}

        {selectedType && (
          <Card variant="tint-blue" padding="sm">
            <Inline gap="sm" align="center">
              <Badge variant="info">{selectedType.leaveTypeCode}</Badge>
              <CardDescription>
                {selectedType.availableDays === null
                  ? 'Untracked type — no balance is deducted.'
                  : `${selectedType.availableDays} day(s) available this cycle.`}
                {selectedType.allowHalfDay ? ' Half days allowed.' : ''}
              </CardDescription>
            </Inline>
          </Card>
        )}

        <Grid columns={2} gap="md">
          <LocaleDatePicker
            label="Start date"
            value={form.startDate}
            onChange={(d) =>
              update({
                startDate: d,
                endDate: form.endDate && form.endDate >= d ? form.endDate : d,
              })
            }
          />
          <LocaleDatePicker
            label="End date"
            value={form.endDate}
            minDate={form.startDate || undefined}
            onChange={(d) => update({ endDate: d })}
          />
        </Grid>

        {singleDay && selectedType?.allowHalfDay && (
          <Select
            label="Session"
            value={form.session}
            onChange={(e) => update({ session: e.target.value as '' | LeaveSession })}
            options={[
              { value: '', label: 'Full day' },
              { value: 'first_half', label: 'First half' },
              { value: 'second_half', label: 'Second half' },
            ]}
          />
        )}

        <Textarea
          label="Reason"
          value={form.reason}
          rows={3}
          maxLength={500}
          onChange={(e) => update({ reason: e.target.value })}
        />

        {(canBackdateOverride || canPayrollOverride) && (
          <Card variant="tint-amber" padding="sm">
            <Stack gap="xs">
              {canBackdateOverride && (
                <Checkbox
                  label="Override the backdated limit (up to 90 days)"
                  checked={form.backdatedOverride}
                  onChange={(e) => update({ backdatedOverride: e.target.checked })}
                />
              )}
              {canPayrollOverride && (
                <Checkbox
                  label="Allow dates in a payroll-locked period"
                  checked={form.payrollLockOverride}
                  onChange={(e) => update({ payrollLockOverride: e.target.checked })}
                />
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </Modal>
  );
}

export default ApplyOnBehalfModal;
