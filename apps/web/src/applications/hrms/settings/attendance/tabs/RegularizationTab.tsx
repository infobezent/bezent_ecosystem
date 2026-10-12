import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Grid,
  Input,
  Select,
  Switch,
  Checkbox,
  Stack,
  Button,
  Alert,
  LoadingState,
  Divider,
  Actions,
} from '../../../../../design-system/components';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchRegularizationSettings,
  updateRegularizationSettings,
} from '../../../attendance/api/attendanceApi';
import type { AttendanceRegularizationSettings } from '../../../attendance/types/attendance.types';

const CORRECTION_OPTIONS = [
  { id: 'missed_check_in', label: 'Missed Check-In Punch' },
  { id: 'missed_check_out', label: 'Missed Check-Out Punch' },
  { id: 'both_punches', label: 'Missing Both Punches' },
  { id: 'late_arrival', label: 'Late Arrival Justification' },
  { id: 'early_exit', label: 'Early Exit Justification' },
  { id: 'shift_timing_mismatch', label: 'Shift Schedule Mismatch' },
];

export function RegularizationTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [allowedCorrectionTypes, setAllowedCorrectionTypes] = useState<string[]>([
    'missed_check_in',
    'missed_check_out',
    'both_punches',
    'late_arrival',
  ]);
  const [submissionWindowDays, setSubmissionWindowDays] = useState(7);
  const [maxRequestsPerMonth, setMaxRequestsPerMonth] = useState(3);
  const [requireReason, setRequireReason] = useState(true);
  const [requireEvidence, setRequireEvidence] = useState(false);
  const [approvalHierarchy, setApprovalHierarchy] = useState<
    'manager_only' | 'hr_only' | 'manager_then_hr' | 'auto_approve'
  >('manager_then_hr');
  const [autoApproveGraceMinutes, setAutoApproveGraceMinutes] = useState(0);
  const [blockOnPayrollLock, setBlockOnPayrollLock] = useState(true);
  const [allowWithdrawal, setAllowWithdrawal] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: AttendanceRegularizationSettings = await fetchRegularizationSettings();
      setIsEnabled(Boolean(data.isEnabled));
      if (Array.isArray(data.allowedCorrectionTypes)) {
        setAllowedCorrectionTypes(data.allowedCorrectionTypes);
      }
      setSubmissionWindowDays(data.submissionWindowDays ?? 7);
      setMaxRequestsPerMonth(data.maxRequestsPerMonth ?? 3);
      setRequireReason(Boolean(data.requireReason));
      setRequireEvidence(Boolean(data.requireEvidence));
      setApprovalHierarchy(data.approvalHierarchy || 'manager_then_hr');
      setAutoApproveGraceMinutes(data.autoApproveGraceMinutes ?? 0);
      setBlockOnPayrollLock(Boolean(data.blockOnPayrollLock));
      setAllowWithdrawal(Boolean(data.allowWithdrawal));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load regularization settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleCorrectionType = (id: string) => {
    setAllowedCorrectionTypes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateRegularizationSettings({
        isEnabled,
        allowedCorrectionTypes,
        submissionWindowDays,
        maxRequestsPerMonth,
        requireReason,
        requireEvidence,
        approvalHierarchy,
        autoApproveGraceMinutes,
        blockOnPayrollLock,
        allowWithdrawal,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save regularization settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Attendance Regularization Settings..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Regularization policies successfully saved.</Alert>}

      <Card variant="flat" padding="lg">
        <Stack gap="md">
          {/* Master Enable */}
          <SettingsRow
            label="Enable Regularization Workflow"
            icon="checklist"
            info="Permits employees to submit post-facto corrections for missing punches, late arrivals, or discrepancies."
          >
            <Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          </SettingsRow>

          {isEnabled && (
            <>
              <Divider spacing="sm" />

              {/* Allowed Correction Categories */}
              <SettingsRow
                label="Allowed Correction Categories"
                icon="tune"
                info="Select the discrepancy categories employees are permitted to raise regularizations for."
                align="start"
              >
                <Grid columns={2} gap="xs">
                  {CORRECTION_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.id}
                      label={opt.label}
                      checked={allowedCorrectionTypes.includes(opt.id)}
                      onChange={() => toggleCorrectionType(opt.id)}
                    />
                  ))}
                </Grid>
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Submission Window */}
              <SettingsRow
                label="Submission Window (Days)"
                icon="calendar"
                info="Maximum days elapsed since discrepancy before submission is blocked."
              >
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={String(submissionWindowDays)}
                  onChange={(e) => setSubmissionWindowDays(Number(e.target.value) || 7)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Max Requests Per Month */}
              <SettingsRow
                label="Monthly Request Quota"
                icon="operations"
                info="Maximum allowed regularization requests per employee per calendar month."
              >
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={String(maxRequestsPerMonth)}
                  onChange={(e) => setMaxRequestsPerMonth(Number(e.target.value) || 3)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Auto-Approve Grace Window */}
              <SettingsRow
                label="Auto-Approve Grace Window (Minutes)"
                icon="schedule"
                info="Automatically approves discrepancy if variance is within this window (0 = disabled)."
              >
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={String(autoApproveGraceMinutes)}
                  onChange={(e) => setAutoApproveGraceMinutes(Number(e.target.value) || 0)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Approval Hierarchy */}
              <SettingsRow
                label="Approval Route"
                icon="task_alt"
                info="Multi-level approval hierarchy for reviewing submitted regularizations."
              >
                <Select
                  value={approvalHierarchy}
                  onChange={(e) =>
                    setApprovalHierarchy(
                      e.target.value as 'manager_only' | 'hr_only' | 'manager_then_hr' | 'auto_approve',
                    )
                  }
                  options={[
                    { value: 'manager_then_hr', label: 'Two-Level: Manager then HR' },
                    { value: 'manager_only', label: 'Single-Level: Reporting Manager Only' },
                    { value: 'hr_only', label: 'Single-Level: HR Operations Only' },
                    { value: 'auto_approve', label: 'Zero-Touch: Auto-Approve' },
                  ]}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Require Reason */}
              <SettingsRow
                label="Require Justification Reason"
                icon="description"
                info="Mandates explanatory text from the employee for every submitted regularization."
              >
                <Switch
                  checked={requireReason}
                  onChange={(e) => setRequireReason(e.target.checked)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Require Evidence */}
              <SettingsRow
                label="Require Supporting Evidence"
                icon="folder"
                info="Requires document attachment (gate pass, medical certificate, travel voucher)."
              >
                <Switch
                  checked={requireEvidence}
                  onChange={(e) => setRequireEvidence(e.target.checked)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Block on Payroll Lock */}
              <SettingsRow
                label="Block on Payroll Lock"
                icon="lock"
                info="Strictly rejects regularization submissions for periods that are locked for payroll."
              >
                <Switch
                  checked={blockOnPayrollLock}
                  onChange={(e) => setBlockOnPayrollLock(e.target.checked)}
                />
              </SettingsRow>

              <Divider spacing="sm" />

              {/* Allow Withdrawal */}
              <SettingsRow
                label="Allow Employee Withdrawal"
                icon="undo"
                info="Permits employees to withdraw pending requests before reviewer decision."
              >
                <Switch
                  checked={allowWithdrawal}
                  onChange={(e) => setAllowWithdrawal(e.target.checked)}
                />
              </SettingsRow>
            </>
          )}
        </Stack>
      </Card>

      {/* Save Action */}
      <Actions align="end">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Actions>
    </Stack>
  );
}

export default RegularizationTab;
