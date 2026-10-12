import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  Switch,
  Stack,
  Inline,
  Button,
  Badge,
  Alert,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  Divider,
  Actions,
} from '../../../../../design-system/components';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchPayrollSettings,
  updatePayrollSettings,
  fetchAttendancePeriods,
  checkPeriodLockReadiness,
  lockAttendancePeriod,
  unlockAttendancePeriod,
  fetchPayrollHandoverBatches,
  generatePayrollHandover,
} from '../../../attendance/api/attendanceApi';
import type {
  AttendancePeriod,
  AttendancePayrollHandoverBatch,
  PeriodLockReadiness,
} from '../../../attendance/types/attendance.types';

export function PayrollLockingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings
  const [cycleType, setCycleType] = useState<'calendar_month' | 'custom_cutoff'>('calendar_month');
  const [cutoffDay, setCutoffDay] = useState(25);
  const [requireApprovalBeforeLock, setRequireApprovalBeforeLock] = useState(true);
  const [autoLockOnCutoff, setAutoLockOnCutoff] = useState(false);
  const [blockingSeverity, setBlockingSeverity] = useState<'hard_block' | 'warning_only'>(
    'hard_block',
  );

  // Periods & Handover
  const [periods, setPeriods] = useState<AttendancePeriod[]>([]);
  const [handoverBatches, setHandoverBatches] = useState<AttendancePayrollHandoverBatch[]>([]);

  // Readiness Modal
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [selectedPeriodCode, setSelectedPeriodCode] = useState<string | null>(null);
  const [readinessData, setReadinessData] = useState<PeriodLockReadiness | null>(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);

  // Unlock Modal
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Export state
  const [generatingHandover, setGeneratingHandover] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, periodsRes, batchesRes] = await Promise.all([
        fetchPayrollSettings(),
        fetchAttendancePeriods(),
        fetchPayrollHandoverBatches(),
      ]);

      setCycleType(settingsRes.cycleType || 'calendar_month');
      setCutoffDay(settingsRes.cutoffDay ?? 25);
      setRequireApprovalBeforeLock(Boolean(settingsRes.requireApprovalBeforeLock));
      setAutoLockOnCutoff(Boolean(settingsRes.autoLockOnCutoff));
      setBlockingSeverity(settingsRes.blockingSeverity || 'hard_block');

      setPeriods(periodsRes);
      setHandoverBatches(batchesRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll & locking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePayrollSettings({
        cycleType,
        cutoffDay,
        requireApprovalBeforeLock,
        autoLockOnCutoff,
        blockingSeverity,
      });
      setSuccess('Attendance payroll & locking rules saved.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckReadiness = async (periodCode: string) => {
    setSelectedPeriodCode(periodCode);
    setCheckingReadiness(true);
    setError(null);
    try {
      const res = await checkPeriodLockReadiness(periodCode);
      setReadinessData(res);
      setReadinessModalOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check lock readiness');
    } finally {
      setCheckingReadiness(false);
    }
  };

  const handleExecuteLock = async (periodCode: string) => {
    setSaving(true);
    setError(null);
    try {
      await lockAttendancePeriod(periodCode);
      setSuccess(`Period ${periodCode} locked successfully.`);
      setReadinessModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock period');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUnlockModal = (periodCode: string) => {
    setSelectedPeriodCode(periodCode);
    setUnlockReason('');
    setUnlockModalOpen(true);
  };

  const handleExecuteUnlock = async () => {
    if (!selectedPeriodCode || unlockReason.trim().length < 5) {
      setError('A comprehensive reason (at least 5 characters) is required to unlock a period');
      return;
    }
    setUnlocking(true);
    setError(null);
    try {
      await unlockAttendancePeriod(selectedPeriodCode, unlockReason);
      setSuccess(`Period ${selectedPeriodCode} reopened for adjustment.`);
      setUnlockModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock period');
    } finally {
      setUnlocking(false);
    }
  };

  const handleGenerateHandover = async (periodCode: string) => {
    setGeneratingHandover(true);
    setError(null);
    try {
      const res = await generatePayrollHandover({
        periodCode,
        format: 'csv',
      });

      const blob = new Blob([res.exportData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_handover_${periodCode}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Payroll handover batch ${res.batch.batchNumber} generated and downloaded.`);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate payroll handover');
    } finally {
      setGeneratingHandover(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Attendance Payroll & Locking..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Cycle Rules */}
      <Card variant="flat" padding="lg">
        <Stack gap="md">
          {/* Cycle Type */}
          <SettingsRow
            label="Attendance Cycle Type"
            icon="schedule"
            info="Calendar Month (1st to last day) or Custom Cutoff day."
          >
            <Select
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value as 'calendar_month' | 'custom_cutoff')}
              options={[
                { value: 'calendar_month', label: 'Calendar Month' },
                { value: 'custom_cutoff', label: 'Custom Cutoff Day' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Monthly Cutoff Day */}
          <SettingsRow
            label="Monthly Cutoff Day"
            icon="calendar"
            info="Day of month when attendance locking window opens."
          >
            <Input
              type="number"
              min={1}
              max={31}
              value={String(cutoffDay)}
              onChange={(e) => setCutoffDay(Number(e.target.value) || 25)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Locking Readiness Policy */}
          <SettingsRow
            label="Locking Readiness Policy"
            icon="security"
            info="Enforce hard block on unresolved exceptions or allow warning with authorized override."
          >
            <Select
              value={blockingSeverity}
              onChange={(e) => setBlockingSeverity(e.target.value as 'hard_block' | 'warning_only')}
              options={[
                { value: 'hard_block', label: 'Hard Block (Unresolved exceptions block lock)' },
                { value: 'warning_only', label: 'Warning Only (Authorized override permitted)' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Require HR Approval Before Lock */}
          <SettingsRow
            label="Require Dual HR Sign-Off Before Lock"
            icon="task_alt"
            info="Enforces dual managerial sign-off before closing attendance cycle."
          >
            <Switch
              checked={requireApprovalBeforeLock}
              onChange={(e) => setRequireApprovalBeforeLock(e.target.checked)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Auto-Lock on Cutoff Date */}
          <SettingsRow
            label="Auto-Lock on Cutoff Date"
            icon="lock"
            info="Automatically lock period at midnight on cutoff day."
          >
            <Switch
              checked={autoLockOnCutoff}
              onChange={(e) => setAutoLockOnCutoff(e.target.checked)}
            />
          </SettingsRow>
        </Stack>
      </Card>

      <Actions align="end">
        <Button variant="primary" onClick={handleSaveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Cycle Rules'}
        </Button>
      </Actions>

      {/* Attendance Periods Table */}
      <Card variant="flat" padding="lg">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <span className="bezent-label">Attendance Periods & Closure Status</span>
            <Badge variant="neutral">{periods.length} Periods</Badge>
          </Inline>

          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Period Code</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Closure Audit</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <strong>{p.periodCode}</strong>
                  </TableCell>
                  <TableCell>
                    {p.startDate} &rarr; {p.endDate}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === 'locked'
                          ? 'danger'
                          : p.status === 'reopened'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.lockedAt ? (
                      <div className="bezent-text-hint">
                        Locked: {new Date(p.lockedAt).toLocaleDateString()}
                      </div>
                    ) : p.reopenReason ? (
                      <div className="bezent-text-hint">
                        Reopened: &ldquo;{p.reopenReason}&rdquo;
                      </div>
                    ) : (
                      'Cycle Active'
                    )}
                  </TableCell>
                  <TableCell>
                    <Inline gap="xs">
                      {p.status !== 'locked' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckReadiness(p.periodCode)}
                            disabled={checkingReadiness}
                          >
                            Readiness
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleExecuteLock(p.periodCode)}
                          >
                            Lock Period
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenUnlockModal(p.periodCode)}
                          >
                            Reopen
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleGenerateHandover(p.periodCode)}
                            disabled={generatingHandover}
                          >
                            {generatingHandover ? 'Exporting...' : 'Export Handover'}
                          </Button>
                        </>
                      )}
                    </Inline>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Card>

      {/* Handover Batches Table */}
      <Card variant="flat" padding="lg">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <span className="bezent-label">Payroll Handover Batches</span>
            <Badge variant="neutral">{handoverBatches.length} Batches</Badge>
          </Inline>

          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Batch Number</TableHeaderCell>
                <TableHeaderCell>Employees</TableHeaderCell>
                <TableHeaderCell>Eligible Days</TableHeaderCell>
                <TableHeaderCell>Deduction Units</TableHeaderCell>
                <TableHeaderCell>Format</TableHeaderCell>
                <TableHeaderCell>Generated</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {handoverBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="bezent-text-center bezent-text-secondary">
                      No payroll handover batches generated yet. Lock a period to export.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                handoverBatches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <code>{b.batchNumber}</code>
                    </TableCell>
                    <TableCell>{b.totalEmployees}</TableCell>
                    <TableCell>
                      <strong>{b.totalPayableDays}</strong>
                    </TableCell>
                    <TableCell>{b.totalDeductionUnits}</TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {b.exportedFormat.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Stack>
      </Card>

      {/* Readiness Check Modal */}
      <Modal
        isOpen={readinessModalOpen}
        onClose={() => setReadinessModalOpen(false)}
        title={`Lock Readiness Inspection — ${selectedPeriodCode}`}
        size="md"
        footer={
          <Inline justify="end" gap="sm">
            <Button onClick={() => setReadinessModalOpen(false)}>Close</Button>
            {readinessData?.canLock && selectedPeriodCode && (
              <Button variant="primary" onClick={() => handleExecuteLock(selectedPeriodCode)}>
                Proceed with Lock
              </Button>
            )}
          </Inline>
        }
      >
        {readinessData && (
          <Stack gap="md">
            <Inline justify="between" align="center">
              <span>Overall Readiness:</span>
              <Badge variant={readinessData.canLock ? 'success' : 'danger'}>
                {readinessData.canLock ? 'READY TO LOCK' : 'BLOCKED'}
              </Badge>
            </Inline>
            <Table compact>
              <TableBody>
                <TableRow>
                  <TableCell>Unresolved Missing Punches</TableCell>
                  <TableCell>{readinessData.unresolvedMissingPunches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pending Regularizations</TableCell>
                  <TableCell>{readinessData.pendingRegularizations}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {readinessData.warnings && readinessData.warnings.length > 0 && (
              <Alert variant={readinessData.canLock ? 'warning' : 'error'}>
                <strong>
                  {readinessData.canLock ? 'Notices & Warnings:' : 'Blocking Issues:'}
                </strong>
                <ul>
                  {readinessData.warnings.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Stack>
        )}
      </Modal>

      {/* Unlock / Reopen Modal */}
      <Modal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        title={`Authorize Period Reopening — ${selectedPeriodCode}`}
        size="md"
        footer={
          <Inline justify="end" gap="sm">
            <Button onClick={() => setUnlockModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleExecuteUnlock}
              disabled={unlocking || unlockReason.trim().length < 5}
            >
              {unlocking ? 'Authorizing...' : 'Authorize Reopening'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <Alert variant="warning">
            Reopening a period unlocks historical attendance for retroactive adjustments. A formal
            audit reason is mandatory.
          </Alert>
          <Input
            label="Mandatory Business Reopening Reason"
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="e.g. Audit correction authorized by HR Operations"
          />
        </Stack>
      </Modal>
    </Stack>
  );
}

export default PayrollLockingTab;
