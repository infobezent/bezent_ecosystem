import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardIcon,
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
  FormField,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  triggerMissingPunchSweep,
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
  const [sweepingMissingPunches, setSweepingMissingPunches] = useState(false);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);

  // Section 1: Timezone & Day Boundary
  const [timezone, setTimezone] = useState(initialSettings?.timezone || 'UTC');
  const [initialTimezone, setInitialTimezone] = useState(initialSettings?.timezone || 'UTC');
  const [dayBoundaryMode, setDayBoundaryMode] = useState('shift_workday_based');
  const [unscheduledFallbackCutoff, setUnscheduledFallbackCutoff] = useState('04:00:00');
  const [trackingStartDate, setTrackingStartDate] = useState('2026-01-01');
  const [initialTrackingStartDate, setInitialTrackingStartDate] = useState('2026-01-01');

  // Controlled Modification Modal state for Critical Settings (Timezone & Tracking Start Date)
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  const [startDateReason, setStartDateReason] = useState('');
  const [startDateReasonError, setStartDateReasonError] = useState<string | null>(null);

  // Section 2: Processing & Entry Permissions
  const [processingMode, setProcessingMode] = useState<'automatic' | 'manual' | 'daily_batch'>(
    'automatic',
  );
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
  >(initialSettings?.manualEntryConfig?.approvalMode || 'approval_required');
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
  const [digestFrequency, setDigestFrequency] = useState<'instant' | 'daily' | 'weekly' | 'none'>(
    'daily',
  );

  // Escalation
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationDeadlineHours, setEscalationDeadlineHours] = useState(48);
  const [escalationTarget, setEscalationTarget] = useState<'next_level_manager' | 'hr_manager'>(
    'next_level_manager',
  );
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
      setInitialTimezone(data.timezone || 'UTC');
      setDayBoundaryMode(data.dayBoundaryMode || 'shift_workday_based');
      setUnscheduledFallbackCutoff(
        data.unscheduledFallbackCutoff || data.dayBoundaryTime || '04:00:00',
      );
      setTrackingStartDate(data.trackingStartDate || '2026-01-01');
      setInitialTrackingStartDate(data.trackingStartDate || '2026-01-01');

      if (data.processingMode === 'manual') setProcessingMode('manual');
      else if (data.processingMode === 'daily_batch') setProcessingMode('daily_batch');
      else setProcessingMode('automatic');

      setDefaultHistoryView(data.defaultHistoryView || 'current_month');
      setCustomHistoryDays(data.defaultHistoryViewDays || 30);
      setManualEntryAllowed(Boolean(data.manualEntryAllowed));

      if (data.manualEntryConfig) {
        setManualEntryRoles(
          data.manualEntryConfig.allowedRoles || ['hr', 'reporting_manager', 'company_admin'],
        );
        setManualEntryMethods(
          data.manualEntryConfig.allowedMethods || [
            'actual_times',
            'full_day_admin',
            'half_day_admin',
          ],
        );
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
    if (defaultHistoryView === 'custom' && (customHistoryDays < 1 || customHistoryDays > 365)) {
      setError('Custom rolling window days must be between 1 and 365 days.');
      setSaving(false);
      return;
    }

    if (manualEntryAllowed && manualEntryRoles.length === 0) {
      setError('Please select at least one authorized role for manual attendance entry.');
      setSaving(false);
      return;
    }

    if (manualEntryAllowed && manualEntryMethods.length === 0) {
      setError('Please select at least one allowed entry method for manual attendance entry.');
      setSaving(false);
      return;
    }

    try {
      const manualEntryConfigPayload: ManualEntryConfig = {
        allowedRoles: manualEntryRoles,
        allowedMethods: manualEntryMethods,
        approvalMode: manualApprovalMode,
        requireReason: manualRequireReason,
        requireAttachment: manualRequireAttachment,
      };

      const selectedRecipients: (
        'employee' | 'reporting_manager' | 'assigned_approver' | 'hr' | 'device_admin'
      )[] = [];
      if (recipientEmployee) selectedRecipients.push('employee');
      if (recipientManager) selectedRecipients.push('reporting_manager');
      if (recipientApprover) selectedRecipients.push('assigned_approver');
      if (recipientHr) selectedRecipients.push('hr');
      if (recipientDeviceAdmin) selectedRecipients.push('device_admin');

      const selectedChannels: ('in_app' | 'email')[] = [];
      if (channelInApp) selectedChannels.push('in_app');
      if (channelEmail) selectedChannels.push('email');

      const anyAlertTriggerActive =
        alertMissingPunch ||
        alertLateArrival ||
        alertEarlyExit ||
        alertRegularizationPending ||
        alertExceptions ||
        alertOnDutyPending ||
        alertDeviceSyncFailure;

      if (anyAlertTriggerActive && selectedRecipients.length === 0) {
        setError('Please select at least one recipient role for active attendance notifications.');
        setSaving(false);
        return;
      }

      if (anyAlertTriggerActive && selectedChannels.length === 0) {
        setError(
          'Please select at least one delivery channel (e.g. In-App Notification Drawer) for active attendance alerts.',
        );
        setSaving(false);
        return;
      }

      const alertSettingsPayload: AttendanceAlertSettings = {
        events: {
          missingPunch: {
            enabled: alertMissingPunch,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          lateArrival: {
            enabled: alertLateArrival,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          earlyExit: {
            enabled: alertEarlyExit,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          regularizationPending: {
            enabled: alertRegularizationPending,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          exceptions: {
            enabled: alertExceptions,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          onDutyPending: {
            enabled: alertOnDutyPending,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
          deviceSyncFailure: {
            enabled: alertDeviceSyncFailure,
            recipients: selectedRecipients,
            channels: selectedChannels,
          },
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

      const finalCutoff =
        dayBoundaryMode === 'calendar_midnight' ? '00:00:00' : unscheduledFallbackCutoff;

      await updateGeneralSettings({
        timezone,
        dayBoundaryMode,
        unscheduledFallbackCutoff: finalCutoff,
        dayBoundaryTime: finalCutoff,
        trackingStartDate,
        trackingStartDateReason: reasonForGoLive,
        processingMode,
        manualEntryAllowed,
        manualEntryConfig: manualEntryConfigPayload,
        employeeVisibility: 'daily_and_monthly',
        defaultHistoryView,
        defaultHistoryViewDays: defaultHistoryView === 'custom' ? customHistoryDays : undefined,
        alertSettings: alertSettingsPayload,
      });

      setInitialTrackingStartDate(trackingStartDate);
      setInitialTimezone(timezone);
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

  const isTrackingDateChanged = Boolean(
    initialTrackingStartDate && trackingStartDate !== initialTrackingStartDate,
  );
  const isTimezoneChanged = Boolean(initialTimezone && timezone !== initialTimezone);
  const requiresControlledConfirmation = isTrackingDateChanged || isTimezoneChanged;

  const handleSaveClick = () => {
    if (requiresControlledConfirmation) {
      setIsStartDateModalOpen(true);
      setStartDateReasonError(null);
      return;
    }
    executeSave();
  };

  const handleConfirmStartDateChange = () => {
    if (!startDateReason.trim()) {
      setStartDateReasonError(
        isTimezoneChanged && isTrackingDateChanged
          ? 'A mandatory business justification is required when modifying critical attendance configurations.'
          : isTimezoneChanged
            ? 'A mandatory business justification is required when modifying the company attendance timezone.'
            : 'A business reason is mandatory when modifying the live tracking start date.',
      );
      return;
    }
    executeSave(startDateReason.trim());
  };

  if (loading) {
    return <LoadingState label="Loading Attendance General Settings..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">Attendance settings successfully saved and synchronized.</Alert>
      )}

      {/* ── Section 1: Workday & Timezone Configuration ── */}
      <Card variant="flat" padding="lg">
        <CardHeader>
          <Inline gap="md" align="center">
            <CardIcon>
              <BezentIcon name="shifts" size={24} />
            </CardIcon>
            <Stack gap="none">
              <CardTitle>Workday & Timezone Configuration</CardTitle>
              <CardDescription>
                Define company timezone, rollover behaviour, and attendance tracking boundaries.
              </CardDescription>
            </Stack>
          </Inline>
        </CardHeader>

        <Divider spacing="md" />

        {/* 2x2 Tile Grid */}
        <Grid columns={2} gap="lg">
          {/* Tile 1: Company Timezone */}
          <Stack gap="xs">
            <span className="bezent-label">Company Timezone</span>
            <p className="bezent-form-field__helper">
              Primary timezone for attendance logs, punch cutoffs and scheduled jobs.
            </p>
            <TimezoneSelect value={timezone} onChange={(newTz) => setTimezone(newTz)} />
            {isTimezoneChanged && (
              <Inline align="center" gap="xs">
                <Badge variant="warning">Timezone Modified</Badge>
                <span className="bezent-form-field__helper">
                  Impact justification required upon saving
                </span>
              </Inline>
            )}
          </Stack>

          {/* Tile 2: Workday Rollover Mode */}
          <Stack gap="xs">
            <span className="bezent-label">Workday Rollover Mode</span>
            <p className="bezent-form-field__helper">
              Controls how attendance days roll over for overnight shifts.
            </p>
            <Select
              value={dayBoundaryMode}
              onChange={(e) => setDayBoundaryMode(e.target.value)}
              options={[
                {
                  value: 'shift_workday_based',
                  label: 'Shift-Based Rollover (Recommended for Night Shifts)',
                },
                {
                  value: 'calendar_midnight',
                  label: 'Standard Calendar Day (Midnight 12:00 AM)',
                },
              ]}
            />
          </Stack>

          {/* Tile 3: Overnight Rollover Cutoff Time (Tinted Amber) */}
          <Card variant="tint-amber" padding="md">
            <Stack gap="xs">
              <Inline gap="xs" align="center">
                <BezentIcon name="clock" size={16} />
                <span className="bezent-label">Overnight Rollover Cutoff Time</span>
              </Inline>
              <p className="bezent-form-field__helper">
                Clock time when a new workday begins for employees without a shift schedule.
              </p>
              {dayBoundaryMode === 'calendar_midnight' ? (
                <Inline align="center" gap="sm">
                  <Badge variant="neutral">Fixed at 12:00 AM (00:00:00)</Badge>
                </Inline>
              ) : (
                <Stack gap="xs">
                  <TimePicker
                    value={unscheduledFallbackCutoff}
                    onChange={(newTime) => setUnscheduledFallbackCutoff(newTime)}
                  />
                  {parseInt(unscheduledFallbackCutoff.split(':')[0] || '0', 10) >= 12 && (
                    <Badge variant="warning">
                      Warning: Afternoon cutoff (12:00 PM+) may split daytime shifts
                    </Badge>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Tile 4: Attendance Tracking Start Date (Tinted Green) */}
          <Card variant="tint-green" padding="md">
            <Stack gap="xs">
              <Inline gap="xs" align="center">
                <BezentIcon name="calendar" size={16} />
                <span className="bezent-label">Attendance Tracking Start Date</span>
              </Inline>
              <p className="bezent-form-field__helper">
                Effective inception date for live attendance calculations.
              </p>
              <LocaleDatePicker
                value={trackingStartDate}
                onChange={(newDate) => setTrackingStartDate(newDate)}
              />
              {isTrackingDateChanged && (
                <Inline align="center" gap="xs">
                  <Badge variant="warning">Date Modified</Badge>
                  <span className="bezent-form-field__helper">
                    Change reason required upon saving
                  </span>
                </Inline>
              )}
            </Stack>
          </Card>
        </Grid>
      </Card>

      {/* ── Section 2: Processing Engine & History Rules ── */}
      <Card variant="flat" padding="lg">
        <CardHeader>
          <Inline gap="md" align="center">
            <CardIcon>
              <BezentIcon name="operations" size={24} />
            </CardIcon>
            <Stack gap="none">
              <CardTitle>Processing Engine & History Rules</CardTitle>
              <CardDescription>
                Configure real-time vs batch calculation engines and default portal history rolling
                windows.
              </CardDescription>
            </Stack>
          </Inline>
        </CardHeader>

        <Divider spacing="md" />

        <Grid columns={2} gap="lg">
          {/* Column 1: Processing Mode */}
          <Stack gap="sm">
            <span className="bezent-label">Processing Mode</span>
            <p className="bezent-form-field__helper">
              Automatically calculate and finalize valid records according to policy.
            </p>
            <Select
              value={processingMode}
              onChange={(e) =>
                setProcessingMode(e.target.value as 'automatic' | 'manual' | 'daily_batch')
              }
              options={[
                { value: 'automatic', label: 'Automatic Processing' },
                { value: 'manual', label: 'Manual Review' },
                { value: 'daily_batch', label: 'Daily Batch' },
              ]}
            />
            <Alert variant="info">
              {processingMode === 'automatic'
                ? 'The system will automatically calculate attendance and route exceptions for authorized review based on your policies.'
                : processingMode === 'daily_batch'
                  ? 'Attendance calculations run once nightly via scheduled daemon; unreviewed punches remain pending until batch execution.'
                  : 'Attendance is calculated only upon explicit administrative trigger; no automated status calculations will execute.'}
            </Alert>
          </Stack>

          {/* Column 2: Default History View */}
          <Stack gap="sm">
            <span className="bezent-label">Default History View</span>
            <p className="bezent-form-field__helper">
              Initial operational display filter duration for attendance history.
            </p>
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
              <Inline gap="sm" align="center">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={String(customHistoryDays)}
                  onChange={(e) => setCustomHistoryDays(Number(e.target.value) || 30)}
                  placeholder="45"
                />
                <Badge variant="neutral">Days</Badge>
              </Inline>
            )}
            <Inline gap="xs" align="center">
              <BezentIcon name="help" size={14} />
              <span className="bezent-form-field__helper">
                {defaultHistoryView === 'custom'
                  ? `Shows the latest ${customHistoryDays} days of attendance data by default.`
                  : `Shows the ${defaultHistoryView.replace(/_/g, ' ')} of attendance data by default.`}
              </span>
            </Inline>
          </Stack>
        </Grid>
      </Card>

      {/* ── Section 3: Administrative Controls & Manual Entry ── */}
      <Card variant="flat" padding="lg">
        <CardHeader>
          <Inline gap="md" align="center">
            <CardIcon>
              <BezentIcon name="security" size={24} />
            </CardIcon>
            <Stack gap="none">
              <CardTitle>Administrative Controls & Manual Entry</CardTitle>
              <CardDescription>
                Manage privileged administrative attendance adjustments, authorized roles, and
                approval safeguards.
              </CardDescription>
            </Stack>
          </Inline>
        </CardHeader>

        <Divider spacing="md" />

        <Stack gap="md">
          {/* Row 7: Controlled Manual Attendance Entry */}
          <SettingsRow
            label="Manual Attendance Entry"
            icon="edit"
            info="Permits authorized administrative actors to record manual attendance entries subject to RBAC and audit logging."
          >
            <Inline justify="end" align="center">
              <Switch
                checked={manualEntryAllowed}
                onChange={(e) => setManualEntryAllowed(e.target.checked)}
              />
            </Inline>
          </SettingsRow>

          {manualEntryAllowed && (
            <Card variant="flat" padding="md">
              <Stack gap="md">
                {/* Row 7a: Authorized Roles & Allowed Entry Methods (Two Columns) */}
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

                {/* Row 7b: Approval Mode & Requirements (Three Columns) */}
                <Grid columns={3} gap="lg">
                  <FormField
                    label="Approval Mode"
                    htmlFor="manual-approval-mode"
                    helperText="Manager submissions route to HR for authorization. HR entries are recorded directly."
                  >
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
                  </FormField>

                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <Label htmlFor="manual-require-reason" weight="semibold">
                        Require Justification Reason
                      </Label>
                      <Switch
                        id="manual-require-reason"
                        checked={manualRequireReason}
                        onChange={(e) => setManualRequireReason(e.target.checked)}
                      />
                    </Inline>
                    <p className="bezent-form-field__helper">
                      Mandates entering a justification reason before submission.
                    </p>
                  </Stack>

                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <Label htmlFor="manual-require-attachment" weight="semibold">
                        Require Supporting Attachment
                      </Label>
                      <Switch
                        id="manual-require-attachment"
                        checked={manualRequireAttachment}
                        onChange={(e) => setManualRequireAttachment(e.target.checked)}
                      />
                    </Inline>
                    <p className="bezent-form-field__helper">
                      Mandates uploading documentation or proof of attendance.
                    </p>
                  </Stack>
                </Grid>
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {/* ── Section 4: Notifications & Automated Operations ── */}
      <Card variant="flat" padding="lg">
        <CardHeader>
          <Inline gap="md" align="center">
            <CardIcon>
              <BezentIcon name="notifications" size={24} />
            </CardIcon>
            <Stack gap="none">
              <CardTitle>Notifications & Automated Operations</CardTitle>
              <CardDescription>
                Configure real-time event triggers, recipient notification channels, and automated
                sweeper daemons.
              </CardDescription>
            </Stack>
          </Inline>
        </CardHeader>

        <Divider spacing="md" />

        <Stack gap="md">
          <Grid columns={2} gap="lg">
            {/* Tile 1: Attendance Notifications & Alerts */}
            <Stack gap="sm">
              <Inline gap="xs" align="center">
                <BezentIcon name="notifications" size={16} />
                <span className="bezent-label">Attendance Notifications & Alerts</span>
              </Inline>
              <p className="bezent-form-field__helper">
                Configure real-time event triggers, recipients, digest frequency, and approval
                escalation.
              </p>
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
                  {alertsExpanded ? 'Collapse Options' : 'Configure Options'}
                </Button>
              </Inline>
            </Stack>

            {/* Tile 2: Automated Missing Punch Sweeper (Tinted Blue Card) */}
            <Card variant="tint-blue" padding="md">
              <Stack gap="xs">
                <Inline gap="xs" align="center">
                  <BezentIcon name="missingPunch" size={16} />
                  <span className="bezent-label">Automated Missing Punch Sweeper</span>
                </Inline>
                <p className="bezent-form-field__helper">
                  Background daemon runs periodically to detect unclosed past workdays, enforce
                  missing punch policy, and alert employees.
                </p>
                <Inline gap="sm" align="center">
                  <Badge variant="success">Active (Periodic Daemon)</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSweepingMissingPunches(true);
                      setSweepMessage(null);
                      setError(null);
                      try {
                        const res = await triggerMissingPunchSweep();
                        setSweepMessage(
                          res.detectedCount > 0
                            ? `Missing punch sweep completed: detected ${res.detectedCount} missing punch(es) and dispatched ${res.alertCount} notification(s).`
                            : 'Missing punch sweep completed: no pending missing punches detected.',
                        );
                      } catch (err: unknown) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Failed to execute missing punch sweep',
                        );
                      } finally {
                        setSweepingMissingPunches(false);
                      }
                    }}
                    disabled={sweepingMissingPunches}
                  >
                    {sweepingMissingPunches ? 'Sweeping...' : 'Run Sweep Now'}
                  </Button>
                </Inline>
              </Stack>
            </Card>
          </Grid>

          {sweepMessage && <Alert variant="info">{sweepMessage}</Alert>}

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
        <Button
          variant="primary"
          onClick={handleSaveClick}
          disabled={saving}
          leftIcon={<BezentIcon name="check" size={16} />}
        >
          {saving ? 'Publishing...' : 'Save Changes'}
        </Button>
      </Actions>

      {/* ── Controlled Modification Modal: Timezone & Tracking Start Date Change Reason ── */}
      <Modal
        isOpen={isStartDateModalOpen}
        onClose={() => setIsStartDateModalOpen(false)}
        title={
          isTimezoneChanged && isTrackingDateChanged
            ? 'Confirm Critical Attendance Configuration Changes'
            : isTimezoneChanged
              ? 'Confirm Company Attendance Timezone Modification'
              : 'Confirm Attendance Go-Live Date Modification'
        }
        size="md"
        footer={
          <Inline justify="end" gap="sm">
            <Button onClick={() => setIsStartDateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmStartDateChange} disabled={saving}>
              {saving ? 'Publishing...' : 'Authorize & Publish Changes'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {isTimezoneChanged && (
            <Alert variant="warning">
              <strong>Timezone Impact Assessment:</strong> Modifying the company fallback timezone
              shifts the live wall clock, 24-hour workday boundary cutoff, and punch evaluation for
              all employees without an assigned shift schedule. Employees with specific shift
              timezones will remain governed by their shift timezones. Past payroll-locked periods
              remain strictly preserved.
            </Alert>
          )}

          {isTrackingDateChanged && (
            <Alert variant="warning">
              <strong>Inception Date Impact Assessment:</strong> Adjusting the Attendance Tracking
              Start Date changes the live inception threshold for automated absence generation.
              Historical attendance logs, manual entries, and payroll-locked periods remain strictly
              preserved.
            </Alert>
          )}

          <div>
            <label className="bezent-label">Mandatory Business Justification</label>
            <Input
              placeholder={
                isTimezoneChanged && isTrackingDateChanged
                  ? 'e.g. Operations realignment & corporate go-live approved by Operations Committee'
                  : isTimezoneChanged
                    ? 'e.g. Headquarters operational realignment approved by Operations Committee'
                    : 'e.g. Corporate go-live postponement approved by HR Operations Committee'
              }
              value={startDateReason}
              onChange={(e) => {
                setStartDateReason(e.target.value);
                if (startDateReasonError) setStartDateReasonError(null);
              }}
              error={startDateReasonError || undefined}
            />
            <span className="bezent-text-hint">
              This justification will be recorded in the immutable attendance audit history
              alongside your user identity and timestamp.
            </span>
          </div>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default GeneralTab;
