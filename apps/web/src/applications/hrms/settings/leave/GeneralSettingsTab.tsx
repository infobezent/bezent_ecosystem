import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardTitle,
  CardDescription,
  Stack,
  Inline,
  Grid,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Alert,
  Spinner,
  FormField,
  PageHeader,
  EmptyState,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchLeaveGeneralSettings,
  updateLeaveGeneralSettings,
  fetchLeaveSettingsVersions,
} from './api/leaveSettingsApi';
import type {
  LeaveGeneralSettings,
  LeaveGeneralSettingsVersion,
  LeaveGeneralSettingsResponse,
  LeaveYearCycle,
  DayCountingMethod,
  BalancePrecision,
  BalanceRoundingRule,
} from './types/settings.types';

export interface GeneralSettingsTabProps {
  initialData?: LeaveGeneralSettingsResponse;
  initialVersions?: LeaveGeneralSettingsVersion[];
  canManage?: boolean;
}

export function GeneralSettingsTab({
  initialData,
  initialVersions,
  canManage = true,
}: GeneralSettingsTabProps = {}) {
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings state
  const [serverSettings, setServerSettings] = useState<LeaveGeneralSettings | null>(
    initialData?.settings || null,
  );
  const [versions, setVersions] = useState<LeaveGeneralSettingsVersion[]>(initialVersions || []);
  const [activeVersion, setActiveVersion] = useState<LeaveGeneralSettingsVersion | null>(
    initialData?.activeVersion || null,
  );
  const [latestPublished, setLatestPublished] = useState<LeaveGeneralSettingsVersion | null>(
    initialData?.latestPublishedVersion || null,
  );
  const [hasScheduled, setHasScheduled] = useState<boolean>(
    initialData?.hasScheduledFutureVersion || false,
  );

  // Form field state
  const [leaveYearCycle, setLeaveYearCycle] = useState<LeaveYearCycle>(
    initialData?.settings.leaveYearCycle || 'calendar_year',
  );
  const [customYearStartDate, setCustomYearStartDate] = useState<string>(
    initialData?.settings.customYearStartDate || '',
  );
  const [goLiveDate, setGoLiveDate] = useState<string>(initialData?.settings.goLiveDate || '');
  const [dayCountingMethod, setDayCountingMethod] = useState<DayCountingMethod>(
    initialData?.settings.dayCountingMethod || 'working_days',
  );
  const [balancePrecision, setBalancePrecision] = useState<BalancePrecision>(
    initialData?.settings.balancePrecision || 'two_decimals',
  );
  const [balanceRoundingRule, setBalanceRoundingRule] = useState<BalanceRoundingRule>(
    initialData?.settings.balanceRoundingRule || 'nearest',
  );
  const [maxBackdatedDays, setMaxBackdatedDays] = useState<number>(
    initialData?.settings.maxBackdatedDays ?? 7,
  );
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState<number>(
    initialData?.settings.maxAdvanceBookingDays ?? 180,
  );

  // Confirmation Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [changeReason, setChangeReason] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [settingsRes, versionsRes] = await Promise.all([
        fetchLeaveGeneralSettings(),
        fetchLeaveSettingsVersions(),
      ]);

      const s = settingsRes.settings;
      setServerSettings(s);
      setActiveVersion(settingsRes.activeVersion);
      setLatestPublished(settingsRes.latestPublishedVersion);
      setHasScheduled(settingsRes.hasScheduledFutureVersion);
      setVersions(versionsRes);

      // Populate form fields
      setLeaveYearCycle(s.leaveYearCycle);
      setCustomYearStartDate(s.customYearStartDate || '');
      setGoLiveDate(s.goLiveDate);
      setDayCountingMethod(s.dayCountingMethod);
      setBalancePrecision(s.balancePrecision);
      setBalanceRoundingRule(s.balanceRoundingRule);
      setMaxBackdatedDays(s.maxBackdatedDays);
      setMaxAdvanceBookingDays(s.maxAdvanceBookingDays);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load general settings';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      void loadData();
    }
  }, [initialData]);

  // Inline Validation
  const customStartDateError = useMemo(() => {
    if (leaveYearCycle !== 'custom') return undefined;
    if (!customYearStartDate || !customYearStartDate.trim()) {
      return 'Start date required (MM-DD).';
    }
    const match = customYearStartDate.trim().match(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/);
    if (!match) {
      return 'Format must be MM-DD (e.g. 07-01).';
    }
    const month = parseInt(match[1]!, 10);
    const day = parseInt(match[2]!, 10);

    if ([4, 6, 9, 11].includes(month) && day > 30) {
      return `Date ${customYearStartDate} does not exist.`;
    }
    if (month === 2 && day > 29) {
      return `Date ${customYearStartDate} does not exist.`;
    }
    if (month === 2 && day === 29) {
      return 'Leap day (Feb 29) disallowed. Use March 1.';
    }
    return undefined;
  }, [leaveYearCycle, customYearStartDate]);

  const backdatedError = useMemo(() => {
    if (maxBackdatedDays < 0 || maxBackdatedDays > 90 || isNaN(maxBackdatedDays)) {
      return 'Range: 0 to 90 days';
    }
    return undefined;
  }, [maxBackdatedDays]);

  const advanceBookingError = useMemo(() => {
    if (maxAdvanceBookingDays < 1 || maxAdvanceBookingDays > 365 || isNaN(maxAdvanceBookingDays)) {
      return 'Range: 1 to 365 days';
    }
    return undefined;
  }, [maxAdvanceBookingDays]);

  const hasFormErrors = Boolean(customStartDateError || backdatedError || advanceBookingError);

  // Compute dirty state
  const changedFields = useMemo(() => {
    if (!serverSettings) return [];
    const diffs: { field: string; from: string; to: string }[] = [];
    if (leaveYearCycle !== serverSettings.leaveYearCycle) {
      diffs.push({
        field: 'Leave Year Cycle',
        from: serverSettings.leaveYearCycle,
        to: leaveYearCycle,
      });
    }
    if ((customYearStartDate || null) !== serverSettings.customYearStartDate) {
      diffs.push({
        field: 'Custom Start Date',
        from: serverSettings.customYearStartDate || 'None',
        to: customYearStartDate || 'None',
      });
    }
    if (goLiveDate !== serverSettings.goLiveDate) {
      diffs.push({ field: 'Go-Live Date', from: serverSettings.goLiveDate, to: goLiveDate });
    }
    if (dayCountingMethod !== serverSettings.dayCountingMethod) {
      diffs.push({
        field: 'Weekend & Holiday Deductions',
        from: serverSettings.dayCountingMethod,
        to: dayCountingMethod,
      });
    }
    if (balancePrecision !== serverSettings.balancePrecision) {
      diffs.push({
        field: 'Display Precision',
        from: serverSettings.balancePrecision,
        to: balancePrecision,
      });
    }
    if (balanceRoundingRule !== serverSettings.balanceRoundingRule) {
      diffs.push({
        field: 'Accrual Rounding',
        from: serverSettings.balanceRoundingRule,
        to: balanceRoundingRule,
      });
    }
    if (maxBackdatedDays !== serverSettings.maxBackdatedDays) {
      diffs.push({
        field: 'Max Backdated Days',
        from: `${serverSettings.maxBackdatedDays}d`,
        to: `${maxBackdatedDays}d`,
      });
    }
    if (maxAdvanceBookingDays !== serverSettings.maxAdvanceBookingDays) {
      diffs.push({
        field: 'Max Advance Booking',
        from: `${serverSettings.maxAdvanceBookingDays}d`,
        to: `${maxAdvanceBookingDays}d`,
      });
    }
    return diffs;
  }, [
    serverSettings,
    leaveYearCycle,
    customYearStartDate,
    goLiveDate,
    dayCountingMethod,
    balancePrecision,
    balanceRoundingRule,
    maxBackdatedDays,
    maxAdvanceBookingDays,
  ]);

  const isDirty = changedFields.length > 0;

  const handleDiscard = () => {
    if (!serverSettings) return;
    setLeaveYearCycle(serverSettings.leaveYearCycle);
    setCustomYearStartDate(serverSettings.customYearStartDate || '');
    setGoLiveDate(serverSettings.goLiveDate);
    setDayCountingMethod(serverSettings.dayCountingMethod);
    setBalancePrecision(serverSettings.balancePrecision);
    setBalanceRoundingRule(serverSettings.balanceRoundingRule);
    setMaxBackdatedDays(serverSettings.maxBackdatedDays);
    setMaxAdvanceBookingDays(serverSettings.maxAdvanceBookingDays);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleOpenModal = () => {
    if (hasFormErrors) return;
    setModalError(null);
    setChangeReason('');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEffectiveFrom(now.toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!serverSettings || saving) return;
    if (changeReason.trim().length < 10) {
      setModalError('Change reason must be at least 10 characters.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      await updateLeaveGeneralSettings({
        leaveYearCycle,
        customYearStartDate: leaveYearCycle === 'custom' ? customYearStartDate.trim() : null,
        goLiveDate,
        dayCountingMethod,
        balancePrecision,
        balanceRoundingRule,
        maxBackdatedDays,
        maxAdvanceBookingDays,
        changeReason: changeReason.trim(),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
        expectedCurrentVersionNumber: serverSettings.currentVersionNumber,
      });

      setIsModalOpen(false);
      setSuccessMsg('Settings updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish settings';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="lg" align="center">
        <Spinner size="lg" />
        <span>Loading Leave General Settings...</span>
      </Stack>
    );
  }

  const isActivated = serverSettings?.status === 'activated';

  return (
    <Stack gap="xl">
      {/* 1. Page Header with Title, Status Badges, and Action Bar */}
      <PageHeader
        title="General Settings"
        badge={
          <Inline gap="xs" align="center">
            <Badge variant={isActivated ? 'success' : 'warning'}>
              {isActivated ? 'Company Activated (Locked Cycle)' : 'Pre-Activation (Draft Mode)'}
            </Badge>
            <Badge variant="neutral">
              Active Version: v{serverSettings?.currentVersionNumber ?? 1}
            </Badge>
            {isDirty && <Badge variant="info">⚡ {changedFields.length} Pending Changes</Badge>}
          </Inline>
        }
        actions={
          canManage ? (
            <Inline gap="sm">
              <Button
                variant="secondary"
                type="button"
                disabled={!isDirty || saving}
                onClick={handleDiscard}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={!isDirty || saving || hasFormErrors}
                onClick={handleOpenModal}
              >
                Save Changes
              </Button>
            </Inline>
          ) : undefined
        }
      />

      {/* Global Alerts for Errors, Success, and Scheduled Versions */}
      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {hasScheduled && latestPublished && (
        <Alert variant="info">
          Scheduled Version {latestPublished.versionNumber} takes effect on{' '}
          {new Date(latestPublished.effectiveFrom).toLocaleDateString()}. Calculations currently
          follow Version {activeVersion?.versionNumber ?? 1}.
        </Alert>
      )}

      {/* Linear / Apple Settings Style: Single Unified Flat Card with Clean Hairline Dividers */}
      <Card padding="lg">
        <Stack gap="xl">
          {/* Section 1: Leave Year & Operational Calendar Boundaries */}
          <Stack gap="md">
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>1. Operational Calendar Boundaries</CardTitle>
                <CardDescription>
                  Defines the 12-month annual period and live cut-over date for entitlements.
                </CardDescription>
              </Stack>
              {isActivated && <Badge variant="neutral">🔒 Locked Post-Activation</Badge>}
            </Inline>

            {isActivated && (
              <Alert variant="info">
                Company activation is complete. Cycle and Go-Live Cutover Date are permanently
                locked to preserve ledger snapshots.
              </Alert>
            )}

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>Leave Year Cycle</strong>
                <CardDescription>Annual reset schedule and balance period.</CardDescription>
              </Stack>
              <FormField htmlFor="leaveYearCycle" required disabled={isActivated}>
                <Select
                  id="leaveYearCycle"
                  value={leaveYearCycle}
                  disabled={isActivated}
                  onChange={(e) => setLeaveYearCycle(e.target.value as LeaveYearCycle)}
                >
                  <option value="calendar_year">Calendar Year (Jan 1 – Dec 31)</option>
                  <option value="financial_year">Financial Year (Apr 1 – Mar 31)</option>
                  <option value="custom">Custom Cycle (Fixed Date)</option>
                </Select>
              </FormField>
            </Grid>

            {leaveYearCycle === 'custom' && (
              <Grid columns={2} gap="lg">
                <Stack gap="xs">
                  <strong>Custom Year Start Date</strong>
                  <CardDescription>Month and day when annual cycle begins (MM-DD).</CardDescription>
                </Stack>
                <FormField
                  htmlFor="customYearStartDate"
                  required
                  disabled={isActivated}
                  error={customStartDateError}
                >
                  <Input
                    id="customYearStartDate"
                    type="text"
                    placeholder="07-01"
                    value={customYearStartDate}
                    disabled={isActivated}
                    onChange={(e) => setCustomYearStartDate(e.target.value)}
                  />
                </FormField>
              </Grid>
            )}

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>Go-Live Cut-Over Date</strong>
                <CardDescription>Official cut-over date for active leave tracking.</CardDescription>
              </Stack>
              <FormField htmlFor="goLiveDate" required disabled={isActivated}>
                <Input
                  id="goLiveDate"
                  type="date"
                  value={goLiveDate}
                  disabled={isActivated}
                  onChange={(e) => setGoLiveDate(e.target.value)}
                />
              </FormField>
            </Grid>
          </Stack>

          <Divider />

          {/* Section 2: Weekend & Holiday Schedule Deductions */}
          <Stack gap="md">
            <Stack gap="none">
              <CardTitle>2. Schedule Deductions &amp; Day Counting</CardTitle>
              <CardDescription>
                Governs whether scheduled non-working days (weekends &amp; public holidays) deduct
                from leave balances.
              </CardDescription>
            </Stack>

            <div role="radiogroup" aria-label="Day Counting Method">
              <Grid columns={2} gap="md">
                <Card
                  variant={dayCountingMethod === 'working_days' ? 'tint-blue' : 'interactive'}
                  className={dayCountingMethod === 'working_days' ? 'bezent-card--interactive' : ''}
                  padding="md"
                  role="radio"
                  aria-checked={dayCountingMethod === 'working_days'}
                  tabIndex={0}
                  onClick={() => setDayCountingMethod('working_days')}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setDayCountingMethod('working_days');
                    }
                  }}
                >
                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <strong>Working Days</strong>
                      {dayCountingMethod === 'working_days' && (
                        <Badge variant="info">
                          <Inline gap="xs" align="center">
                            <BezentIcon name="check" size={14} />
                            <span>Selected</span>
                          </Inline>
                        </Badge>
                      )}
                    </Inline>
                    <CardDescription>
                      Excludes scheduled Weekly Offs and declared Public Holidays.
                    </CardDescription>
                  </Stack>
                </Card>

                <Card
                  variant={dayCountingMethod === 'calendar_days' ? 'tint-blue' : 'interactive'}
                  className={
                    dayCountingMethod === 'calendar_days' ? 'bezent-card--interactive' : ''
                  }
                  padding="md"
                  role="radio"
                  aria-checked={dayCountingMethod === 'calendar_days'}
                  tabIndex={0}
                  onClick={() => setDayCountingMethod('calendar_days')}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setDayCountingMethod('calendar_days');
                    }
                  }}
                >
                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <strong>Calendar Days</strong>
                      {dayCountingMethod === 'calendar_days' && (
                        <Badge variant="info">
                          <Inline gap="xs" align="center">
                            <BezentIcon name="check" size={14} />
                            <span>Selected</span>
                          </Inline>
                        </Badge>
                      )}
                    </Inline>
                    <CardDescription>
                      Deducts every calendar day in range regardless of schedule.
                    </CardDescription>
                  </Stack>
                </Card>
              </Grid>
            </div>
          </Stack>

          <Divider />

          {/* Section 3: Display Precision & Accrual Rounding */}
          <Stack gap="md">
            <Stack gap="none">
              <CardTitle>3. Display Precision &amp; Accrual Rounding</CardTitle>
              <CardDescription>
                Formatting precision in employee self-service and deterministic math for monthly
                accruals.
              </CardDescription>
            </Stack>

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>UI Balance Precision</strong>
                <CardDescription>How numbers are rendered in portals and ledgers.</CardDescription>
              </Stack>
              <FormField htmlFor="balancePrecision" required>
                <Select
                  id="balancePrecision"
                  value={balancePrecision}
                  onChange={(e) => setBalancePrecision(e.target.value as BalancePrecision)}
                >
                  <option value="two_decimals">Two Decimals (12.50 days)</option>
                  <option value="half">Half Day (12.5 days)</option>
                  <option value="whole_numbers">Whole Numbers (12 days)</option>
                </Select>
              </FormField>
            </Grid>

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>Accrual Rounding Rule (0.5 Increment)</strong>
                <CardDescription>Mathematical rule for pro-rata monthly accruals.</CardDescription>
              </Stack>
              <FormField htmlFor="balanceRoundingRule" required>
                <Select
                  id="balanceRoundingRule"
                  value={balanceRoundingRule}
                  onChange={(e) => setBalanceRoundingRule(e.target.value as BalanceRoundingRule)}
                >
                  <option value="nearest">Nearest 0.5 (Half-Up Tie-Breaker)</option>
                  <option value="round_up">Round Up (+0.5)</option>
                  <option value="round_down">Round Down (-0.5)</option>
                </Select>
              </FormField>
            </Grid>
          </Stack>

          <Divider />

          {/* Section 4: Application Windows & Limits */}
          <Stack gap="md">
            <Stack gap="none">
              <CardTitle>4. Application Windows &amp; Operational Boundaries</CardTitle>
              <CardDescription>
                Earliest retrospective limit and farthest advance booking window for employees.
              </CardDescription>
            </Stack>

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>Max Backdated Days</strong>
                <CardDescription>
                  Maximum calendar days allowed into the past (0 to 90 days).
                </CardDescription>
              </Stack>
              <FormField htmlFor="maxBackdatedDays" required error={backdatedError}>
                <Input
                  id="maxBackdatedDays"
                  type="number"
                  min="0"
                  max="90"
                  value={maxBackdatedDays.toString()}
                  onChange={(e) => setMaxBackdatedDays(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
            </Grid>

            <Grid columns={2} gap="lg">
              <Stack gap="xs">
                <strong>Max Advance Booking Days</strong>
                <CardDescription>
                  Maximum calendar days allowed into the future (1 to 365 days).
                </CardDescription>
              </Stack>
              <FormField htmlFor="maxAdvanceBookingDays" required error={advanceBookingError}>
                <Input
                  id="maxAdvanceBookingDays"
                  type="number"
                  min="1"
                  max="365"
                  value={maxAdvanceBookingDays.toString()}
                  onChange={(e) => setMaxAdvanceBookingDays(parseInt(e.target.value, 10) || 1)}
                />
              </FormField>
            </Grid>
          </Stack>

          <Divider />

          {/* Section 5: Version History & Audit Trail */}
          <Stack gap="md">
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>5. Version History &amp; Audit Trail</CardTitle>
                <CardDescription>
                  Sealed chronological snapshots of all published policy configurations and author
                  justifications.
                </CardDescription>
              </Stack>
              <Badge variant="neutral">
                {versions.length} Version{versions.length === 1 ? '' : 's'}
              </Badge>
            </Inline>

            {versions.length === 0 ? (
              <EmptyState
                title="No History"
                description="Version snapshots will appear as changes are published."
                size="compact"
              />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Version</TableHeaderCell>
                    <TableHeaderCell>Effective Date</TableHeaderCell>
                    <TableHeaderCell>Cycle</TableHeaderCell>
                    <TableHeaderCell>Counting Method</TableHeaderCell>
                    <TableHeaderCell>Change Reason</TableHeaderCell>
                    <TableHeaderCell>Author</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((v) => {
                    const isCurrentActive =
                      v.versionNumber ===
                      (activeVersion?.versionNumber ?? serverSettings?.currentVersionNumber);
                    const isScheduledFuture = new Date(v.effectiveFrom) > new Date();

                    const cycleLabel =
                      v.settingsPayload.leaveYearCycle === 'calendar_year'
                        ? 'Calendar Year'
                        : v.settingsPayload.leaveYearCycle === 'financial_year'
                          ? 'Financial Year'
                          : 'Custom';

                    const countingLabel =
                      v.settingsPayload.dayCountingMethod === 'working_days'
                        ? 'Working Days'
                        : 'Calendar Days';

                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Inline gap="xs" align="center">
                            <strong>v{v.versionNumber}</strong>
                            {isCurrentActive && <Badge variant="success">Active</Badge>}
                            {isScheduledFuture && <Badge variant="info">Scheduled</Badge>}
                          </Inline>
                        </TableCell>
                        <TableCell>{new Date(v.effectiveFrom).toLocaleDateString()}</TableCell>
                        <TableCell>{cycleLabel}</TableCell>
                        <TableCell>{countingLabel}</TableCell>
                        <TableCell>{v.changeReason}</TableCell>
                        <TableCell>{v.createdByUserId}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Save Changes Confirmation Modal with Diff Summary */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title="Confirm Settings Update"
      >
        <Stack gap="md">
          {modalError && <Alert variant="danger">{modalError}</Alert>}

          <p>
            You are publishing a new immutable version of Leave General Settings. Once published,
            future leave calculations and balance evaluations will follow this policy snapshot.
          </p>

          {changedFields.length > 0 && (
            <Stack gap="xs">
              <strong>Pending Changes ({changedFields.length}):</strong>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Setting</TableHeaderCell>
                    <TableHeaderCell>Current</TableHeaderCell>
                    <TableHeaderCell>New</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changedFields.map((df) => (
                    <TableRow key={df.field}>
                      <TableCell>
                        <strong>{df.field}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{df.from}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{df.to}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}

          <FormField label="Effective Date & Time" htmlFor="effectiveFrom" required>
            <Input
              id="effectiveFrom"
              type="datetime-local"
              value={effectiveFrom}
              disabled={saving}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </FormField>

          <FormField
            label={`Change Reason (${changeReason.trim().length} / 10 min chars)`}
            htmlFor="changeReason"
            required
            error={
              changeReason.length > 0 && changeReason.trim().length < 10
                ? 'Reason must be at least 10 characters'
                : undefined
            }
          >
            <Textarea
              id="changeReason"
              rows={3}
              placeholder="Provide a reason for this update (e.g. Annual policy review, new working day deduction rules)..."
              value={changeReason}
              disabled={saving}
              onChange={(e) => setChangeReason(e.target.value)}
            />
          </FormField>

          {changeReason.trim().length >= 10 && (
            <Inline gap="xs" align="center">
              <Badge variant="success">✓ Valid reason</Badge>
              <CardDescription>Ready to publish.</CardDescription>
            </Inline>
          )}

          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={saving || changeReason.trim().length < 10}
              onClick={handleConfirmSave}
            >
              {saving ? 'Publishing...' : 'Publish New Version'}
            </Button>
          </Inline>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default GeneralSettingsTab;
