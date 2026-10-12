import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Grid,
  Input,
  Select,
  Switch,
  Checkbox,
  Stack,
  Inline,
  Button,
  Alert,
  Badge,
  LoadingState,
  TimezoneSelect,
  LocaleDatePicker,
  TimePicker,
  Modal,
  Divider,
  FormSection,
  Actions,
  Label,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchGeneralSettings,
  updateGeneralSettings,
} from '../../../attendance/api/attendanceApi';
import type {
  AttendanceGeneralSettings,
  ManualEntryConfig,
  AttendanceAlertSettings,
} from '../../../attendance/types/attendance.types';

export interface GeneralTabProps {
  initialSettings?: Partial<AttendanceGeneralSettings>;
}

export function GeneralTab({ initialSettings }: GeneralTabProps = {}) {
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Section 1: Timezone & Day Boundary
  const [timezone, setTimezone] = useState('UTC');
  const [dayBoundaryMode, setDayBoundaryMode] = useState('shift_workday_based');
  const [unscheduledFallbackCutoff, setUnscheduledFallbackCutoff] = useState('04:00:00');
  const [trackingStartDate, setTrackingStartDate] = useState('2026-01-01');
  const [initialTrackingStartDate, setInitialTrackingStartDate] = useState('2026-01-01');

  // Controlled Modification Modal state for Tracking Start Date
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  const [startDateReason, setStartDateReason] = useState('');
  const [startDateReasonError, setStartDateReasonError] = useState<string | null>(null);

  // Section 2: Processing & Entry Permissions
  const [processingMode, setProcessingMode] = useState<'automatic' | 'manual' | 'daily_batch'>('automatic');
  const [employeeVisibility, setEmployeeVisibility] = useState<
    'daily_and_monthly' | 'daily_only' | 'monthly_summary_only'
  >('daily_and_monthly');
  const [defaultHistoryView, setDefaultHistoryView] = useState('current_month');
  const [customHistoryDays, setCustomHistoryDays] = useState(30);

  // Controlled Manual Entry
  const [manualEntryAllowed, setManualEntryAllowed] = useState(
    initialSettings ? Boolean(initialSettings.manualEntryAllowed) : true,
  );
  const [manualEntryRoles, setManualEntryRoles] = useState<string[]>(
    initialSettings?.manualEntryConfig?.allowedRoles || [
      'hr',
      'reporting_manager',
      'company_admin',
    ],
  );
  const [manualEntryMethods, setManualEntryMethods] = useState<
    ('actual_times' | 'full_day_admin' | 'half_day_admin')[]
  >(
    initialSettings?.manualEntryConfig?.allowedMethods || [
      'actual_times',
      'full_day_admin',
      'half_day_admin',
    ],
  );
  const [manualApprovalMode, setManualApprovalMode] = useState<
    'approval_required' | 'direct_finalization'
  >(
    initialSettings?.manualEntryConfig?.approvalMode || 'approval_required',
  );
  const [manualRequireReason, setManualRequireReason] = useState(
    initialSettings?.manualEntryConfig?.requireReason ?? true,
  );
  const [manualRequireAttachment, setManualRequireAttachment] = useState(
    Boolean(initialSettings?.manualEntryConfig?.requireAttachment),
  );

  // Section 3: Attendance Notifications & Alerts
  const [alertMissingPunch, setAlertMissingPunch] = useState(true);
  const [alertLateArrival, setAlertLateArrival] = useState(true);
  const [alertEarlyExit, setAlertEarlyExit] = useState(false);
  const [alertRegularizationPending, setAlertRegularizationPending] = useState(true);
  const [alertExceptions, setAlertExceptions] = useState(true);
  const [alertOnDutyPending, setAlertOnDutyPending] = useState(true);
  const [alertDeviceSyncFailure, setAlertDeviceSyncFailure] = useState(true);

  // Alert Recipients & Channels
  const [recipientEmployee, setRecipientEmployee] = useState(true);
  const [recipientManager, setRecipientManager] = useState(true);
  const [recipientApprover, setRecipientApprover] = useState(true);
  const [recipientHr, setRecipientHr] = useState(true);
  const [recipientDeviceAdmin, setRecipientDeviceAdmin] = useState(true);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);

  // Timing & Frequency
  const [missingPunchDelay, setMissingPunchDelay] = useState(30);
  const [digestFrequency, setDigestFrequency] = useState<'instant' | 'daily' | 'weekly' | 'none'>('daily');

  // Escalation
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationDeadlineHours, setEscalationDeadlineHours] = useState(48);
  const [escalationTarget, setEscalationTarget] = useState<'next_level_manager' | 'hr_manager'>('next_level_manager');
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const toggleManualRole = (role: string) => {
    setManualEntryRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const toggleManualMethod = (method: 'actual_times' | 'full_day_admin' | 'half_day_admin') => {
    setManualEntryMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: AttendanceGeneralSettings = await fetchGeneralSettings();
      setTimezone(data.timezone || 'UTC');
      setDayBoundaryMode(data.dayBoundaryMode || 'shift_workday_based');
      setUnscheduledFallbackCutoff(data.unscheduledFallbackCutoff || data.dayBoundaryTime || '04:00:00');
      setTrackingStartDate(data.trackingStartDate || '2026-01-01');
      setInitialTrackingStartDate(data.trackingStartDate || '2026-01-01');

      if (data.processingMode === 'manual') setProcessingMode('manual');
      else if (data.processingMode === 'daily_batch') setProcessingMode('daily_batch');
      else setProcessingMode('automatic');

      if (data.employeeVisibility === 'daily_only') setEmployeeVisibility('daily_only');
      else if (data.employeeVisibility === 'monthly_summary_only') setEmployeeVisibility('monthly_summary_only');
      else setEmployeeVisibility('daily_and_monthly');

      setDefaultHistoryView(data.defaultHistoryView || 'current_month');
      setCustomHistoryDays(data.defaultHistoryViewDays || 30);
      setManualEntryAllowed(Boolean(data.manualEntryAllowed));

      if (data.manualEntryConfig) {
        setManualEntryRoles(data.manualEntryConfig.allowedRoles || ['hr', 'reporting_manager', 'company_admin']);
        setManualEntryMethods(data.manualEntryConfig.allowedMethods || ['actual_times', 'full_day_admin', 'half_day_admin']);
        setManualApprovalMode(data.manualEntryConfig.approvalMode || 'approval_required');
        setManualRequireReason(data.manualEntryConfig.requireReason ?? true);
        setManualRequireAttachment(Boolean(data.manualEntryConfig.requireAttachment));
      }

      if (data.alertSettings) {
        const events = data.alertSettings.events || {};
        setAlertMissingPunch(events.missingPunch?.enabled ?? true);
        setAlertLateArrival(events.lateArrival?.enabled ?? true);
        setAlertEarlyExit(events.earlyExit?.enabled ?? false);
        setAlertRegularizationPending(events.regularizationPending?.enabled ?? true);
        setAlertExceptions(events.exceptions?.enabled ?? true);
        setAlertOnDutyPending(events.onDutyPending?.enabled ?? true);
        setAlertDeviceSyncFailure(events.deviceSyncFailure?.enabled ?? true);

        const recs = events.missingPunch?.recipients || [];
        setRecipientEmployee(recs.includes('employee'));
        setRecipientManager(recs.includes('reporting_manager'));
        setRecipientApprover(recs.includes('assigned_approver'));
        setRecipientHr(recs.includes('hr'));
        setRecipientDeviceAdmin(recs.includes('device_admin'));

        const chans = events.missingPunch?.channels || [];
        setChannelInApp(chans.includes('in_app'));
        setChannelEmail(chans.includes('email'));

        if (data.alertSettings.timing) {
          setMissingPunchDelay(data.alertSettings.timing.missingPunchDelayMinutes ?? 30);
          setDigestFrequency(data.alertSettings.timing.digestFrequency || 'daily');
        }

        if (data.alertSettings.escalation) {
          setEscalationEnabled(Boolean(data.alertSettings.escalation.enabled));
          setEscalationDeadlineHours(data.alertSettings.escalation.deadlineHours ?? 48);
          setEscalationTarget(data.alertSettings.escalation.targetRole || 'next_level_manager');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load general settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSettings) {
      loadSettings();
    }
  }, [loadSettings, initialSettings]);

  const executeSave = async (reasonForGoLive?: string) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const manualEntryConfigPayload: ManualEntryConfig = {
        allowedRoles: manualEntryRoles,
        allowedMethods: manualEntryMethods,
        approvalMode: manualApprovalMode,
        requireReason: manualRequireReason,
        requireAttachment: manualRequireAttachment,
      };

      const selectedRecipients: ('employee' | 'reporting_manager' | 'assigned_approver' | 'hr' | 'device_admin')[] = [];
      if (recipientEmployee) selectedRecipients.push('employee');
      if (recipientManager) selectedRecipients.push('reporting_manager');
      if (recipientApprover) selectedRecipients.push('assigned_approver');
      if (recipientHr) selectedRecipients.push('hr');
      if (recipientDeviceAdmin) selectedRecipients.push('device_admin');

      const selectedChannels: ('in_app' | 'email')[] = [];
      if (channelInApp) selectedChannels.push('in_app');
      if (channelEmail) selectedChannels.push('email');

      const alertSettingsPayload: AttendanceAlertSettings = {
        events: {
          missingPunch: { enabled: alertMissingPunch, recipients: selectedRecipients, channels: selectedChannels },
          lateArrival: { enabled: alertLateArrival, recipients: selectedRecipients, channels: selectedChannels },
          earlyExit: { enabled: alertEarlyExit, recipients: selectedRecipients, channels: selectedChannels },
          regularizationPending: { enabled: alertRegularizationPending, recipients: selectedRecipients, channels: selectedChannels },
          exceptions: { enabled: alertExceptions, recipients: selectedRecipients, channels: selectedChannels },
          onDutyPending: { enabled: alertOnDutyPending, recipients: selectedRecipients, channels: selectedChannels },
          deviceSyncFailure: { enabled: alertDeviceSyncFailure, recipients: selectedRecipients, channels: selectedChannels },
        },
        timing: {
          missingPunchDelayMinutes: missingPunchDelay,
          digestFrequency,
          reminderIntervalHours: 24,
        },
        escalation: {
          enabled: escalationEnabled,
          deadlineHours: escalationDeadlineHours,
          targetRole: escalationTarget,
        },
      };

      await updateGeneralSettings({
        timezone,
        dayBoundaryMode,
        unscheduledFallbackCutoff,
        dayBoundaryTime: unscheduledFallbackCutoff,
        trackingStartDate,
        trackingStartDateReason: reasonForGoLive,
        processingMode,
        manualEntryAllowed,
        manualEntryConfig: manualEntryConfigPayload,
        employeeVisibility,
        defaultHistoryView,
        defaultHistoryViewDays: defaultHistoryView === 'custom' ? customHistoryDays : undefined,
        alertSettings: alertSettingsPayload,
      });

      setInitialTrackingStartDate(trackingStartDate);
      setIsStartDateModalOpen(false);
      setStartDateReason('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (initialTrackingStartDate && trackingStartDate !== initialTrackingStartDate) {
      setIsStartDateModalOpen(true);
      setStartDateReasonError(null);
      return;
    }
    executeSave();
  };

  const handleConfirmStartDateChange = () => {
    if (!startDateReason.trim()) {
      setStartDateReasonError('A business reason is mandatory when modifying the live tracking start date.');
      return;
    }
    executeSave(startDateReason.trim());
  };

  if (loading) {
    return <LoadingState label="Loading Attendance General Settings..." />;
  }

  const isTrackingDateChanged = Boolean(
    initialTrackingStartDate && trackingStartDate !== initialTrackingStartDate,
  );

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">
          Attendance settings successfully saved and synchronized.
        </Alert>
      )}

      {/* ── Minimal 2-Column Settings Layout ── */}
      <Card variant="flat" padding="lg">
        <Stack gap="md">
          {/* Row 1: Timezone */}
          <SettingsRow
            label="Timezone"
            icon="schedule"
            info="Company fallback timezone. Assigned shift timezones take precedence."
          >
            <TimezoneSelect
              value={timezone}
              onChange={(newTz) => setTimezone(newTz)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 2: Day Boundary Mode */}
          <SettingsRow
            label="Day Boundary Mode"
            icon="events"
            info="Overnight shifts associate attendance with the scheduled workday (shift start date in shift timezone)."
          >
            <Select
              value={dayBoundaryMode}
              onChange={(e) => setDayBoundaryMode(e.target.value)}
              options={[
                {
                  value: 'shift_workday_based',
                  label: 'Shift / Workday Based',
                },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 3: Unscheduled Fallback Cutoff */}
          <SettingsRow
            label="Unscheduled Workday Fallback Cutoff"
            icon="schedule"
            info="24-hour cutoff partition (HH:mm:ss) applied strictly to employees without an assigned scheduled shift."
          >
            <TimePicker
              value={unscheduledFallbackCutoff}
              onChange={(newTime) => setUnscheduledFallbackCutoff(newTime)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 4: Attendance Tracking Start Date */}
          <SettingsRow
            label="Attendance Tracking Start Date"
            icon="calendar"
            info="Effective inception date for live attendance calculations. Absence records are not generated prior to this date."
            description={
              isTrackingDateChanged ? (
                <Inline align="center" gap="xs">
                  <Badge variant="warning">Date Modified</Badge>
                  <span>Change reason will be required upon saving</span>
                </Inline>
              ) : undefined
            }
          >
            <LocaleDatePicker
              value={trackingStartDate}
              onChange={(newDate) => setTrackingStartDate(newDate)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 5: Processing Mode */}
          <SettingsRow
            label="Processing Mode"
            icon="operations"
            info="Automatically calculate and finalize valid records according to policy; route exceptions for authorized review."
          >
            <Select
              value={processingMode}
              onChange={(e) =>
                setProcessingMode(
                  e.target.value as 'automatic' | 'manual' | 'daily_batch',
                )
              }
              options={[
                { value: 'automatic', label: 'Automatic Processing' },
                { value: 'manual', label: 'Manual Review' },
                { value: 'daily_batch', label: 'Daily Batch' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 6: Employee Attendance Visibility */}
          <SettingsRow
            label="Employee Visibility"
            icon="visibility"
            info="Authorized employee self-service visibility. Note: Self-only access is a mandatory security invariant."
          >
            <Select
              value={employeeVisibility}
              onChange={(e) =>
                setEmployeeVisibility(
                  e.target.value as
                    | 'daily_and_monthly'
                    | 'daily_only'
                    | 'monthly_summary_only',
                )
              }
              options={[
                {
                  value: 'daily_and_monthly',
                  label: 'Daily & Monthly Attendance',
                },
                { value: 'daily_only', label: 'Daily Attendance Only' },
                { value: 'monthly_summary_only', label: 'Monthly Summary Only' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 7: Default History View */}
          <SettingsRow
            label="Default History View"
            icon="history"
            info="Initial operational display filter duration."
          >
            <Stack gap="xs">
              <Select
                value={defaultHistoryView}
                onChange={(e) => setDefaultHistoryView(e.target.value)}
                options={[
                  { value: 'current_month', label: 'Current Month' },
                  { value: 'today', label: 'Today' },
                  { value: 'current_week', label: 'Current Week' },
                  { value: 'previous_month', label: 'Previous Month' },
                  { value: 'last_7_days', label: 'Last 7 Days' },
                  { value: 'last_30_days', label: 'Last 30 Days' },
                  { value: 'last_60_days', label: 'Last 60 Days' },
                  { value: 'last_90_days', label: 'Last 90 Days' },
                  { value: 'custom', label: 'Custom Rolling Window (Days)' },
                ]}
              />
              {defaultHistoryView === 'custom' && (
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={String(customHistoryDays)}
                  onChange={(e) =>
                    setCustomHistoryDays(Number(e.target.value) || 30)
                  }
                  placeholder="Specify days (1 - 365)"
                />
              )}
            </Stack>
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Row 8: Controlled Manual Attendance Entry */}
          <SettingsRow
            label="Manual Attendance Entry"
            icon="edit"
            info="Permits authorized administrative actors to record manual attendance entries subject to RBAC and audit logging."
          >
            <Switch
              checked={manualEntryAllowed}
              onChange={(e) => setManualEntryAllowed(e.target.checked)}
            />
          </SettingsRow>

          {manualEntryAllowed && (
            <>
              <Divider spacing="sm" />

              {/* Row 8a: Authorized Roles & Allowed Entry Methods (Two Columns) */}
              <Grid columns={2} gap="lg">
                <Stack gap="sm">
                  <Inline gap="xs" align="center">
                    <Label weight="semibold">Authorized Roles</Label>
                    <span
                      title="User roles authorized to record manual attendance entries"
                      tabIndex={0}
                      aria-label="User roles authorized to record manual attendance entries"
                      className="bezent-text-secondary"
                    >
                      <BezentIcon name="help" size={14} />
                    </span>
                  </Inline>
                  <Stack gap="xs">
                    <Checkbox
                      label="HR Operations"
                      checked={manualEntryRoles.includes('hr')}
                      onChange={() => toggleManualRole('hr')}
                    />
                    <Checkbox
                      label="Reporting Manager"
                      checked={manualEntryRoles.includes('reporting_manager')}
                      onChange={() => toggleManualRole('reporting_manager')}
                    />
                    <Checkbox
                      label="Company Admin"
                      checked={manualEntryRoles.includes('company_admin')}
                      onChange={() => toggleManualRole('company_admin')}
                    />
                  </Stack>
                </Stack>

                <Stack gap="sm">
                  <Inline gap="xs" align="center">
                    <Label weight="semibold">Allowed Entry Methods</Label>
                    <span
                      title="Permitted methods for manual attendance entries and credits"
                      tabIndex={0}
                      aria-label="Permitted methods for manual attendance entries and credits"
                      className="bezent-text-secondary"
                    >
                      <BezentIcon name="help" size={14} />
                    </span>
                  </Inline>
                  <Stack gap="xs">
                    <Checkbox
                      label="Actual Times (In/Out Punches)"
                      checked={manualEntryMethods.includes('actual_times')}
                      onChange={() => toggleManualMethod('actual_times')}
                    />
                    <Checkbox
                      label="Full Day Present Credit"
                      checked={manualEntryMethods.includes('full_day_admin')}
                      onChange={() => toggleManualMethod('full_day_admin')}
                    />
                    <Checkbox
                      label="Half Day Credit"
                      checked={manualEntryMethods.includes('half_day_admin')}
                      onChange={() => toggleManualMethod('half_day_admin')}
                    />
                  </Stack>
                </Stack>
              </Grid>

              <Divider spacing="sm" />

              {/* Row 8b: Approval Mode & Requirements (Three Columns) */}
              <Grid columns={3} gap="lg">
                <Stack gap="xs">
                  <Label htmlFor="manual-approval-mode" weight="semibold">
                    Approval Mode
                  </Label>
                  <Select
                    id="manual-approval-mode"
                    value={manualApprovalMode}
                    onChange={(e) =>
                      setManualApprovalMode(
                        e.target.value as 'approval_required' | 'direct_finalization',
                      )
                    }
                    options={[
                      { value: 'approval_required', label: 'Approval Required' },
                      { value: 'direct_finalization', label: 'Direct Finalization' },
                    ]}
                  />
                </Stack>

                <Stack gap="xs">
                  <Label htmlFor="manual-require-reason" weight="semibold">
                    Require Justification Reason
                  </Label>
                  <Inline align="center">
                    <Switch
                      id="manual-require-reason"
                      checked={manualRequireReason}
                      onChange={(e) => setManualRequireReason(e.target.checked)}
                    />
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <Label htmlFor="manual-require-attachment" weight="semibold">
                    Require Supporting Attachment
                  </Label>
                  <Inline align="center">
                    <Switch
                      id="manual-require-attachment"
                      checked={manualRequireAttachment}
                      onChange={(e) => setManualRequireAttachment(e.target.checked)}
                    />
                  </Inline>
                </Stack>
              </Grid>
            </>
          )}

          <Divider spacing="sm" />

          {/* Row 9: Attendance Notifications & Alerts */}
          <SettingsRow
            label="Attendance Notifications & Alerts"
            icon="notifications"
            info="Configure real-time event triggers, recipients, digest frequency, and approval escalation."
          >
            <Inline gap="sm" align="center">
              <Badge variant="info">
                {
                  [
                    alertMissingPunch,
                    alertLateArrival,
                    alertEarlyExit,
                    alertRegularizationPending,
                    alertExceptions,
                    alertOnDutyPending,
                    alertDeviceSyncFailure,
                  ].filter(Boolean).length
                }{' '}
                Triggers Active
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAlertsExpanded(!alertsExpanded)}
              >
                {alertsExpanded ? 'Collapse' : 'Configure Options'}
              </Button>
            </Inline>
          </SettingsRow>

          {alertsExpanded && (
            <Card variant="flat" padding="md">
              <Stack gap="md">
                <FormSection title="Event Triggers">
                  <Grid columns={3} gap="sm">
                    <Checkbox
                      label="Missing Punch"
                      checked={alertMissingPunch}
                      onChange={(e) => setAlertMissingPunch(e.target.checked)}
                    />
                    <Checkbox
                      label="Late Arrival"
                      checked={alertLateArrival}
                      onChange={(e) => setAlertLateArrival(e.target.checked)}
                    />
                    <Checkbox
                      label="Early Exit"
                      checked={alertEarlyExit}
                      onChange={(e) => setAlertEarlyExit(e.target.checked)}
                    />
                    <Checkbox
                      label="Regularization Pending"
                      checked={alertRegularizationPending}
                      onChange={(e) => setAlertRegularizationPending(e.target.checked)}
                    />
                    <Checkbox
                      label="Attendance Exceptions"
                      checked={alertExceptions}
                      onChange={(e) => setAlertExceptions(e.target.checked)}
                    />
                    <Checkbox
                      label="On-Duty Pending"
                      checked={alertOnDutyPending}
                      onChange={(e) => setAlertOnDutyPending(e.target.checked)}
                    />
                    <Checkbox
                      label="Device Sync Failure"
                      checked={alertDeviceSyncFailure}
                      onChange={(e) => setAlertDeviceSyncFailure(e.target.checked)}
                    />
                  </Grid>
                </FormSection>

                <FormSection title="Recipients & Channels">
                  <Grid columns={2} gap="md">
                    <div>
                      <span className="bezent-label">Recipients</span>
                      <Stack gap="xs">
                        <Checkbox
                          label="Employee"
                          checked={recipientEmployee}
                          onChange={(e) => setRecipientEmployee(e.target.checked)}
                        />
                        <Checkbox
                          label="Reporting Manager"
                          checked={recipientManager}
                          onChange={(e) => setRecipientManager(e.target.checked)}
                        />
                        <Checkbox
                          label="Assigned Approver"
                          checked={recipientApprover}
                          onChange={(e) => setRecipientApprover(e.target.checked)}
                        />
                        <Checkbox
                          label="HR Operations"
                          checked={recipientHr}
                          onChange={(e) => setRecipientHr(e.target.checked)}
                        />
                        <Checkbox
                          label="Device Admin"
                          checked={recipientDeviceAdmin}
                          onChange={(e) => setRecipientDeviceAdmin(e.target.checked)}
                        />
                      </Stack>
                    </div>

                    <div>
                      <span className="bezent-label">Delivery Channels</span>
                      <Stack gap="xs">
                        <Checkbox
                          label="In-App Notification Drawer"
                          checked={channelInApp}
                          onChange={(e) => setChannelInApp(e.target.checked)}
                        />
                        <Checkbox
                          label="Email Digest"
                          checked={channelEmail}
                          onChange={(e) => setChannelEmail(e.target.checked)}
                        />
                      </Stack>
                    </div>
                  </Grid>
                </FormSection>

                <FormSection title="Timing, Digest & Escalation">
                  <Grid columns={3} gap="md">
                    <div>
                      <label className="bezent-label">Missing Punch Delay (Min)</label>
                      <Input
                        type="number"
                        min={0}
                        max={180}
                        value={String(missingPunchDelay)}
                        onChange={(e) => setMissingPunchDelay(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="bezent-label">Digest Frequency</label>
                      <Select
                        value={digestFrequency}
                        onChange={(e) =>
                          setDigestFrequency(
                            e.target.value as 'instant' | 'daily' | 'weekly' | 'none',
                          )
                        }
                        options={[
                          { value: 'instant', label: 'Instant' },
                          { value: 'daily', label: 'Daily Digest' },
                          { value: 'weekly', label: 'Weekly Summary' },
                          { value: 'none', label: 'None' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="bezent-label">Approval Escalation</label>
                      <Switch
                        checked={escalationEnabled}
                        onChange={(e) => setEscalationEnabled(e.target.checked)}
                      />
                    </div>
                  </Grid>

                  {escalationEnabled && (
                    <Grid columns={2} gap="md">
                      <div>
                        <label className="bezent-label">Escalation Deadline (Hours)</label>
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          value={String(escalationDeadlineHours)}
                          onChange={(e) => setEscalationDeadlineHours(Number(e.target.value) || 48)}
                        />
                      </div>
                      <div>
                        <label className="bezent-label">Escalation Target</label>
                        <Select
                          value={escalationTarget}
                          onChange={(e) =>
                            setEscalationTarget(
                              e.target.value as 'next_level_manager' | 'hr_manager',
                            )
                          }
                          options={[
                            { value: 'next_level_manager', label: 'Next-Level Manager' },
                            { value: 'hr_manager', label: 'HR Manager' },
                          ]}
                        />
                      </div>
                    </Grid>
                  )}
                </FormSection>
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {/* ── Save Action ── */}
      <Actions align="end">
        <Button variant="primary" onClick={handleSaveClick} disabled={saving}>
          {saving ? 'Publishing...' : 'Save Changes'}
        </Button>
      </Actions>

      {/* ── Controlled Modification Modal: Tracking Start Date Change Reason ── */}
      <Modal
        isOpen={isStartDateModalOpen}
        onClose={() => setIsStartDateModalOpen(false)}
        title="Confirm Attendance Go-Live Date Modification"
        size="md"
        footer={
          <Inline justify="end" gap="sm">
            <Button onClick={() => setIsStartDateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmStartDateChange} disabled={saving}>
              {saving ? 'Publishing...' : 'Authorize & Publish Changes'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <Alert variant="warning">
            <strong>Impact Assessment:</strong> Adjusting the Attendance Tracking Start Date changes the live inception threshold for automated absence generation. Historical attendance logs, manual entries, and payroll-locked periods remain strictly preserved.
          </Alert>

          <div>
            <label className="bezent-label">Mandatory Change Reason</label>
            <Input
              placeholder="e.g. Corporate go-live postponement approved by HR Operations Committee"
              value={startDateReason}
              onChange={(e) => {
                setStartDateReason(e.target.value);
                if (startDateReasonError) setStartDateReasonError(null);
              }}
              error={startDateReasonError || undefined}
            />
            <span className="bezent-text-hint">
              This reason will be recorded in the immutable attendance audit history alongside your user identity and timestamp.
            </span>
          </div>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default GeneralTab;
