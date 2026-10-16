import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  Inline,
  Grid,
  Badge,
  Button,
  IconButton,
  Alert,
  LoadingState,
  Toolbar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  FormSection,
  FormGrid,
  ProgressBar,
  Select,
  Input,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  essApi,
  isLocationRequiredError,
  type EssAttendanceRecord,
  type EssAttendanceView,
  type EssMonthlyAttendanceSummary,
  type EssTodayAttendance,
  type EssAttendanceSummaryCounters,
  type EssPunchEvent,
  type PunchDeviceMetadata,
} from '../api/essApi';

/** Asks the browser for the current position. Only used when the company requires location. */
function readCurrentPosition(): Promise<PunchDeviceMetadata> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is required to punch, but this browser cannot provide it.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () =>
        reject(new Error('Location is required to punch. Please allow location access and retry.')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

type AttendanceWorkspace = {
  today: EssTodayAttendance & { notes?: string | null };
  summary?: EssAttendanceSummaryCounters & {
    attendancePercent?: number;
    totalWorkingDays?: number;
  };
  history: EssAttendanceRecord[];
  monthlySummary?: EssMonthlyAttendanceSummary[];
  view?: EssAttendanceView;
};

const WORK_LOCATION_OPTIONS = [
  { value: 'office', label: 'Office' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'on_duty', label: 'On Duty' },
  { value: 'field', label: 'Field' },
];

const BREAK_OPTIONS: Array<{ value: 'tea' | 'lunch' | 'personal'; label: string; desc: string }> = [
  { value: 'tea', label: 'Tea Break', desc: '15 mins allowance' },
  { value: 'lunch', label: 'Lunch Break', desc: '45 mins allowance' },
  { value: 'personal', label: 'Personal Break', desc: 'As needed' },
];

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function EssAttendancePage() {
  const [workspace, setWorkspace] = useState<AttendanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Clock
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Punch actions
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('office');

  // Break Modal
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<'tea' | 'lunch' | 'personal'>('tea');
  const [breakNotes, setBreakNotes] = useState('');
  const [breakLoading, setBreakLoading] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<{
    dateStr: string;
    record?: EssAttendanceRecord;
    isToday?: boolean;
  } | null>(null);

  // Regularization Modal
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regCheckIn, setRegCheckIn] = useState('09:00');
  const [regCheckOut, setRegCheckOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getAttendance();
      setWorkspace(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      try {
        await essApi.checkIn({ workLocation: selectedLocation });
      } catch (err: unknown) {
        if (!isLocationRequiredError(err)) throw err;
        await essApi.checkIn({
          workLocation: selectedLocation,
          deviceMetadata: await readCurrentPosition(),
        });
      }
      setPunchSuccess('Checked in successfully!');
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      try {
        await essApi.checkOut();
      } catch (err: unknown) {
        if (!isLocationRequiredError(err)) throw err;
        await essApi.checkOut({ deviceMetadata: await readCurrentPosition() });
      }
      setPunchSuccess('Checked out successfully!');
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setBreakLoading(true);
    setPunchError(null);
    try {
      await essApi.startBreak({ breakType: selectedBreakType, notes: breakNotes });
      setBreakModalOpen(false);
      setBreakNotes('');
      setPunchSuccess(`Started ${selectedBreakType} break.`);
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Failed to start break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setBreakLoading(true);
    setPunchError(null);
    try {
      await essApi.endBreak();
      setPunchSuccess('Break ended. Welcome back to work!');
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Failed to end break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleRegularize = async () => {
    setRegLoading(true);
    setRegError(null);
    try {
      await essApi.regularizeAttendance({
        date: regDate,
        checkInTime: regCheckIn,
        checkOutTime: regCheckOut,
        reason: regReason,
      });
      setRegSuccess(true);
      setRegularizeOpen(false);
      setRegReason('');
      await load();
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Regularization failed');
    } finally {
      setRegLoading(false);
    }
  };

  // Calendar weeks generator
  const calendarWeeks = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday as day 0: Sunday is 0 in JS -> 6, Mon is 1 -> 0
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const weeks: Array<
      Array<{
        dateStr: string;
        dayNum: number | null;
        isCurrentMonth: boolean;
        isToday: boolean;
        record?: EssAttendanceRecord;
        statusCode: string;
        badgeVariant: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
      }>
    > = [];

    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const recordsMap = new Map<string, EssAttendanceRecord>();
    if (workspace?.history) {
      workspace.history.forEach((rec) => recordsMap.set(rec.date, rec));
    }

    let currentWeek: Array<{
      dateStr: string;
      dayNum: number | null;
      isCurrentMonth: boolean;
      isToday: boolean;
      record?: EssAttendanceRecord;
      statusCode: string;
      badgeVariant: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
    }> = [];

    // Preceding padding
    for (let i = 0; i < startDayIndex; i++) {
      currentWeek.push({
        dateStr: '',
        dayNum: null,
        isCurrentMonth: false,
        isToday: false,
        statusCode: '',
        badgeVariant: 'neutral',
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, month, day);
      const dayOfWeek = dayDate.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const record = recordsMap.get(dateStr);

      let statusCode = '—';
      let badgeVariant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' = 'neutral';

      if (record) {
        if (record.status === 'present') {
          if (record.workLocation === 'wfh') {
            statusCode = 'WFH';
            badgeVariant = 'info';
          } else if (record.workLocation === 'on_duty' || record.workLocation === 'field') {
            statusCode = 'OD';
            badgeVariant = 'info';
          } else {
            statusCode = 'P';
            badgeVariant = 'success';
          }
        } else if (record.status === 'half_day') {
          statusCode = 'HD';
          badgeVariant = 'warning';
        } else if (record.status === 'on_leave') {
          statusCode = 'L';
          badgeVariant = 'info';
        } else if (record.status === 'holiday') {
          statusCode = 'H';
          badgeVariant = 'neutral';
        } else if (record.status === 'absent') {
          statusCode = 'A';
          badgeVariant = 'danger';
        }
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        statusCode = 'WO';
        badgeVariant = 'neutral';
      } else if (dateStr < todayStr) {
        statusCode = 'A';
        badgeVariant = 'danger';
      }

      currentWeek.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday,
        record,
        statusCode,
        badgeVariant,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing padding
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          dateStr: '',
          dayNum: null,
          isCurrentMonth: false,
          isToday: false,
          statusCode: '',
          badgeVariant: 'neutral',
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [calendarDate, workspace?.history]);

  if (loading) return <LoadingState label="Loading attendance..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  if (!workspace) return null;

  const today = workspace.today;
  const summary = workspace.summary ?? {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    lateMarksCount: 0,
    regularizationQuotaUsed: 0,
    regularizationQuotaLimit: 3,
  };
  const shift = today.shift;
  const monthlySummary = workspace.monthlySummary ?? [];
  const historyDays = workspace.view?.historyDays ?? 60;
  const monthlySummaryOnly = workspace.view?.visibility === 'monthly_summary_only';
  const hasPunchedIn = !!today.checkInTime;
  const hasPunchedOut = !!today.checkOutTime;
  const isOnBreak = !!today.isOnBreak;

  // Live timer computations
  let grossMinutes = 0;
  if (hasPunchedIn && today.checkInTime) {
    const inTime = new Date(today.checkInTime).getTime();
    const endRef =
      hasPunchedOut && today.checkOutTime ? new Date(today.checkOutTime).getTime() : now.getTime();
    if (!isNaN(inTime) && !isNaN(endRef) && endRef >= inTime) {
      grossMinutes = Math.floor((endRef - inTime) / 60000);
    }
  }

  let liveBreakMinutes = today.breakMinutes || 0;
  if (isOnBreak && today.currentBreakStartTime) {
    const bStart = new Date(today.currentBreakStartTime).getTime();
    if (!isNaN(bStart) && now.getTime() >= bStart) {
      liveBreakMinutes += Math.floor((now.getTime() - bStart) / 60000);
    }
  }

  const netWorkedMinutes = Math.max(0, grossMinutes - liveBreakMinutes);
  const requiredShiftMinutes = shift?.requiredHours ? shift.requiredHours * 60 : 480;
  const progressPercent = Math.min(
    100,
    Math.round((netWorkedMinutes / requiredShiftMinutes) * 100),
  );

  return (
    <Page>
      <PageHeader
        title="Attendance & Timesheet"
        subtitle="Real-time attendance punch, daily shift progress, monthly calendar, and regularization requests"
        actions={
          <Button
            id="ess-attendance-regularize-btn"
            variant="secondary"
            leftIcon={<BezentIcon name="edit" size={16} />}
            onClick={() => {
              setRegDate(today.date);
              setRegularizeOpen(true);
            }}
          >
            Regularize Attendance
          </Button>
        }
      />

      {punchError && (
        <Alert variant="error" title="Error">
          {punchError}
        </Alert>
      )}
      {punchSuccess && (
        <Alert variant="success" title="Success">
          {punchSuccess}
        </Alert>
      )}
      {regSuccess && (
        <Alert variant="success" title="Request Submitted">
          Your attendance regularization request has been submitted for manager approval.
        </Alert>
      )}

      {/* ── Today's Hero Card ────────────────────────────────────── */}
      <Section title="Today's Attendance">
        <Card variant="default">
          <Stack gap="lg">
            {/* Header row: Live clock + shift info + status badge */}
            <Inline gap="md" align="center" justify="between" wrap>
              <Inline gap="md" align="center">
                <BezentIcon name="attendance" size={28} />
                <Stack gap="xs">
                  <Inline gap="sm" align="center">
                    <strong>
                      {now.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </strong>
                    <span>•</span>
                    <span>
                      {now.toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </Inline>
                  <Inline gap="xs" align="center">
                    <span>
                      Shift: <strong>{shift?.name || 'General Shift'}</strong> (
                      {shift?.startTime || '09:00'} - {shift?.endTime || '18:00'})
                    </span>
                    <span>•</span>
                    <span>Req: {shift?.requiredHours || 8}h</span>
                  </Inline>
                </Stack>
              </Inline>

              <Inline gap="sm" align="center">
                <Badge
                  variant={
                    today.status === 'working'
                      ? 'success'
                      : today.status === 'on_break'
                        ? 'warning'
                        : today.status === 'checked_out'
                          ? 'neutral'
                          : 'neutral'
                  }
                  size="md"
                >
                  {today.status === 'working'
                    ? 'Working'
                    : today.status === 'on_break'
                      ? `On Break (${today.currentBreakType || 'Break'})`
                      : today.status === 'checked_out'
                        ? 'Checked Out'
                        : 'Not Checked In'}
                </Badge>
              </Inline>
            </Inline>

            <Divider />

            {/* Metrics & Progress row */}
            <Grid columns={4} gap="md">
              <Stack gap="xs">
                <span>Check-In Time</span>
                <strong>{formatTime(today.checkInTime)}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Check-Out Time</span>
                <strong>{formatTime(today.checkOutTime)}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Gross / Net Hours</span>
                <strong>
                  {formatMinutes(grossMinutes)} / {formatMinutes(netWorkedMinutes)}
                </strong>
              </Stack>
              <Stack gap="xs">
                <span>Total Break Taken</span>
                <strong>{formatMinutes(liveBreakMinutes)}</strong>
              </Stack>
            </Grid>

            {/* Shift Progress Bar */}
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span>Shift Completion Progress</span>
                <strong>
                  {formatMinutes(netWorkedMinutes)} of {formatMinutes(requiredShiftMinutes)} (
                  {progressPercent}%)
                </strong>
              </Inline>
              <ProgressBar
                value={netWorkedMinutes}
                max={requiredShiftMinutes}
                variant={progressPercent >= 100 ? 'success' : 'primary'}
                size="md"
              />
            </Stack>

            <Divider />

            {/* Controls row */}
            <Inline gap="md" align="center" justify="between" wrap>
              <Inline gap="sm" align="center">
                {!hasPunchedIn && (
                  <Select
                    label="Work Mode"
                    size="sm"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    options={WORK_LOCATION_OPTIONS}
                  />
                )}
                {hasPunchedIn && (
                  <span>
                    Work Location: <strong>{today.workLocation.toUpperCase()}</strong>
                  </span>
                )}
              </Inline>

              <Inline gap="sm" align="center">
                {/* Check In Button */}
                {!hasPunchedIn && (
                  <Button
                    id="att-check-in"
                    variant="primary"
                    onClick={handleCheckIn}
                    loading={punchLoading}
                    leftIcon={<BezentIcon name="check" size={16} />}
                  >
                    Check In
                  </Button>
                )}

                {/* Working actions */}
                {hasPunchedIn && !hasPunchedOut && (
                  <>
                    {!isOnBreak ? (
                      <Button
                        id="att-take-break"
                        variant="secondary"
                        onClick={() => setBreakModalOpen(true)}
                        loading={breakLoading}
                        leftIcon={<BezentIcon name="coffee" size={16} />}
                      >
                        Take Break
                      </Button>
                    ) : (
                      <Button
                        id="att-end-break"
                        variant="primary"
                        onClick={handleEndBreak}
                        loading={breakLoading}
                        leftIcon={<BezentIcon name="check" size={16} />}
                      >
                        End Break
                      </Button>
                    )}

                    <Button
                      id="att-check-out"
                      variant="secondary"
                      onClick={handleCheckOut}
                      loading={punchLoading}
                      leftIcon={<BezentIcon name="close" size={16} />}
                    >
                      Check Out
                    </Button>
                  </>
                )}

                {hasPunchedIn && hasPunchedOut && (
                  <Badge variant="success" size="md">
                    Day Completed
                  </Badge>
                )}
              </Inline>
            </Inline>
          </Stack>
        </Card>
      </Section>

      {/* ── Today's Punch Timeline Strip ────────────────────────── */}
      {today.punches && today.punches.length > 0 && (
        <Section title="Today's Activity Log" subtitle="Punches recorded during today's shift">
          <Card>
            <Table compact>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Time</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Location / Mode</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Notes</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {today.punches.map((p: EssPunchEvent) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <strong>{formatTime(p.punchTime)}</strong>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.punchType === 'in'
                            ? 'success'
                            : p.punchType === 'out'
                              ? 'neutral'
                              : p.punchType === 'break_out'
                                ? 'warning'
                                : 'info'
                        }
                        size="sm"
                      >
                        {p.punchType === 'in'
                          ? 'Check In'
                          : p.punchType === 'out'
                            ? 'Check Out'
                            : p.punchType === 'break_out'
                              ? 'Break Start'
                              : p.punchType === 'break_in'
                                ? 'Break End'
                                : p.punchType}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.workLocation.toUpperCase()}</TableCell>
                    <TableCell>{p.source || 'Web ESS'}</TableCell>
                    <TableCell>{p.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Section>
      )}

      {/* Attendance History */}
      <Section title="Attendance History">
        <Toolbar left={<span>Last {historyDays} days</span>} />
        {monthlySummary.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Month</TableHeaderCell>
                <TableHeaderCell>Present</TableHeaderCell>
                <TableHeaderCell>Half Day</TableHeaderCell>
                <TableHeaderCell>Absent</TableHeaderCell>
                <TableHeaderCell>On Leave</TableHeaderCell>
                <TableHeaderCell>Late Days</TableHeaderCell>
                <TableHeaderCell>Hours Worked</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlySummary.map((m) => (
                <TableRow key={m.month}>
                  <TableCell>{m.month}</TableCell>
                  <TableCell>{m.present}</TableCell>
                  <TableCell>{m.halfDay}</TableCell>
                  <TableCell>{m.absent}</TableCell>
                  <TableCell>{m.onLeave}</TableCell>
                  <TableCell>{m.lateDays}</TableCell>
                  <TableCell>{(m.workedMinutes / 60).toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {monthlySummaryOnly ? null : workspace.history.length === 0 ? (
          <Alert variant="info" title="No Records">
            No attendance records found for the past {historyDays} days.
          </Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Check In</TableHeaderCell>
                <TableHeaderCell>Check Out</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspace.history.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{rec.date}</TableCell>
                  <TableCell>{rec.checkInTime ?? '—'}</TableCell>
                  <TableCell>{rec.checkOutTime ?? '—'}</TableCell>
                  <TableCell>{rec.workLocation}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rec.status === 'present'
                          ? 'success'
                          : rec.status === 'absent'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {rec.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* ── Monthly Summary Counters Strip ───────────────────────── */}
      <Section
        title="Monthly Attendance Summary"
        subtitle="Current billing / payroll cycle summary"
      >
        <Grid columns={6} gap="md">
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Present Days</span>
              <strong>{summary.presentDays}</strong>
            </Stack>
          </Card>
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Absent Days</span>
              <strong>{summary.absentDays}</strong>
            </Stack>
          </Card>
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Half Days</span>
              <strong>{summary.halfDays}</strong>
            </Stack>
          </Card>
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Leave Days</span>
              <strong>{summary.leaveDays}</strong>
            </Stack>
          </Card>
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Late Marks</span>
              <strong>{summary.lateMarksCount}</strong>
            </Stack>
          </Card>
          <Card variant="flat">
            <Stack gap="xs" align="center">
              <span>Regularization Quota</span>
              <strong>
                {summary.regularizationQuotaUsed} / {summary.regularizationQuotaLimit}
              </strong>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Monthly Attendance Calendar Grid (Spec 4.1) ─────────── */}
      <Section
        title="Attendance Calendar"
        subtitle="Click any date to view daily punch log and regularize attendance"
      >
        <Card>
          <Stack gap="md">
            {/* Calendar Controls */}
            <Toolbar
              left={
                <Inline gap="sm" align="center">
                  <IconButton
                    label="Previous Month"
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1),
                      )
                    }
                  >
                    <BezentIcon name="chevron-left" size={18} />
                  </IconButton>
                  <strong>
                    {calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                  </strong>
                  <IconButton
                    label="Next Month"
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1),
                      )
                    }
                  >
                    <BezentIcon name="chevron-right" size={18} />
                  </IconButton>
                </Inline>
              }
              right={
                <Button variant="ghost" size="sm" onClick={() => setCalendarDate(new Date())}>
                  Today
                </Button>
              }
            />

            {/* Calendar 7-Column Table */}
            <Table compact>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Mon</TableHeaderCell>
                  <TableHeaderCell>Tue</TableHeaderCell>
                  <TableHeaderCell>Wed</TableHeaderCell>
                  <TableHeaderCell>Thu</TableHeaderCell>
                  <TableHeaderCell>Fri</TableHeaderCell>
                  <TableHeaderCell>Sat</TableHeaderCell>
                  <TableHeaderCell>Sun</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calendarWeeks.map((week, wIdx) => (
                  <TableRow key={wIdx}>
                    {week.map((cell, cIdx) => (
                      <TableCell key={cIdx}>
                        {cell.dayNum ? (
                          <Card
                            variant={cell.isToday ? 'interactive' : 'flat'}
                            padding="sm"
                            onClick={() =>
                              setSelectedDayRecord({
                                dateStr: cell.dateStr,
                                record: cell.record,
                                isToday: cell.isToday,
                              })
                            }
                          >
                            <Stack gap="xs" align="center">
                              <Inline justify="between" align="center">
                                <strong>{cell.dayNum}</strong>
                                {cell.isToday && (
                                  <Badge variant="info" size="sm">
                                    Today
                                  </Badge>
                                )}
                              </Inline>
                              {cell.statusCode !== '—' && (
                                <Badge variant={cell.badgeVariant} size="sm">
                                  {cell.statusCode}
                                </Badge>
                              )}
                            </Stack>
                          </Card>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Legend */}
            <Divider />
            <Inline gap="md" align="center" wrap>
              <span>
                <strong>Legend:</strong>
              </span>
              <Inline gap="xs" align="center">
                <Badge variant="success" size="sm">
                  P
                </Badge>
                <span>Present</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="danger" size="sm">
                  A
                </Badge>
                <span>Absent</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="warning" size="sm">
                  HD
                </Badge>
                <span>Half Day</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="info" size="sm">
                  L
                </Badge>
                <span>Leave</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="info" size="sm">
                  WFH
                </Badge>
                <span>Work From Home</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="info" size="sm">
                  OD
                </Badge>
                <span>On Duty</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="neutral" size="sm">
                  WO
                </Badge>
                <span>Weekly Off</span>
              </Inline>
              <Inline gap="xs" align="center">
                <Badge variant="neutral" size="sm">
                  H
                </Badge>
                <span>Holiday</span>
              </Inline>
            </Inline>
          </Stack>
        </Card>
      </Section>

      {/* ── Daily Detail Modal (Spec 4.2) ────────────────────────── */}
      {selectedDayRecord && (
        <Modal
          isOpen={true}
          title={`Attendance Details — ${selectedDayRecord.dateStr}`}
          onClose={() => setSelectedDayRecord(null)}
          footer={
            <Inline gap="sm" justify="between">
              <Button variant="secondary" onClick={() => setSelectedDayRecord(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                leftIcon={<BezentIcon name="edit" size={16} />}
                onClick={() => {
                  setRegDate(selectedDayRecord.dateStr);
                  setSelectedDayRecord(null);
                  setRegularizeOpen(true);
                }}
              >
                Regularize This Day
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span>Date</span>
                <strong>{selectedDayRecord.dateStr}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Status</span>
                <Badge
                  variant={
                    selectedDayRecord.record?.status === 'present'
                      ? 'success'
                      : selectedDayRecord.record?.status === 'absent'
                        ? 'danger'
                        : 'warning'
                  }
                  size="md"
                >
                  {selectedDayRecord.record?.status?.toUpperCase() || 'NO PUNCH'}
                </Badge>
              </Stack>
              <Stack gap="xs">
                <span>Check-In</span>
                <strong>{formatTime(selectedDayRecord.record?.checkInTime)}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Check-Out</span>
                <strong>{formatTime(selectedDayRecord.record?.checkOutTime)}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Worked Time</span>
                <strong>
                  {selectedDayRecord.record?.workedMinutes !== undefined
                    ? formatMinutes(selectedDayRecord.record.workedMinutes)
                    : '—'}
                </strong>
              </Stack>
              <Stack gap="xs">
                <span>Break Duration</span>
                <strong>
                  {selectedDayRecord.record?.breakMinutes !== undefined
                    ? formatMinutes(selectedDayRecord.record.breakMinutes)
                    : '—'}
                </strong>
              </Stack>
              <Stack gap="xs">
                <span>Work Location</span>
                <strong>{selectedDayRecord.record?.workLocation || 'Office'}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Flags</span>
                <Inline gap="xs" wrap>
                  {selectedDayRecord.record?.isLate && (
                    <Badge variant="warning" size="sm">
                      Late ({selectedDayRecord.record.lateMinutes}m)
                    </Badge>
                  )}
                  {selectedDayRecord.record?.isEarlyExit && (
                    <Badge variant="warning" size="sm">
                      Early Exit ({selectedDayRecord.record.earlyMinutes}m)
                    </Badge>
                  )}
                  {selectedDayRecord.record?.isMissingPunch && (
                    <Badge variant="danger" size="sm">
                      Missing Punch
                    </Badge>
                  )}
                  {selectedDayRecord.record?.isRegularized && (
                    <Badge variant="info" size="sm">
                      Regularized
                    </Badge>
                  )}
                  {!selectedDayRecord.record && (
                    <span>No recorded punch events for this date.</span>
                  )}
                </Inline>
              </Stack>
            </Grid>
          </Stack>
        </Modal>
      )}

      {/* ── Break Selection Modal ─────────────────────────────────── */}
      <Modal
        isOpen={breakModalOpen}
        title="Select Break Type"
        onClose={() => setBreakModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setBreakModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartBreak}
              loading={breakLoading}
              leftIcon={<BezentIcon name="coffee" size={16} />}
            >
              Start Break
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <span>Choose your break type below. Your work timer will pause during your break.</span>
          <Grid columns={3} gap="sm">
            {BREAK_OPTIONS.map((opt) => (
              <Card
                key={opt.value}
                variant={selectedBreakType === opt.value ? 'interactive' : 'flat'}
                onClick={() => setSelectedBreakType(opt.value)}
              >
                <Stack gap="xs" align="center">
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </Stack>
              </Card>
            ))}
          </Grid>
          <Input
            label="Notes (Optional)"
            placeholder="e.g. Lunch with team, client coffee..."
            value={breakNotes}
            onChange={(e) => setBreakNotes(e.target.value)}
          />
        </Stack>
      </Modal>

      {/* ── Regularization Modal (Spec 5.1) ───────────────────────── */}
      <Modal
        isOpen={regularizeOpen}
        title="Attendance Regularization Request"
        onClose={() => setRegularizeOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button id="reg-cancel" variant="secondary" onClick={() => setRegularizeOpen(false)}>
              Cancel
            </Button>
            <Button
              id="reg-submit"
              variant="primary"
              onClick={handleRegularize}
              loading={regLoading}
            >
              Submit Request
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {regError && (
            <Alert variant="error" title="Error">
              {regError}
            </Alert>
          )}
          <span>
            Regularize missing punches, biometric mismatches, or field work. Current monthly quota:{' '}
            <strong>
              {summary.regularizationQuotaUsed} of {summary.regularizationQuotaLimit} used
            </strong>
            .
          </span>
          <FormSection title="Correction Details">
            <FormGrid columns={1}>
              <Input
                label="Date"
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
              />
              <Input
                label="Check-In Time"
                type="time"
                value={regCheckIn}
                onChange={(e) => setRegCheckIn(e.target.value)}
              />
              <Input
                label="Check-Out Time"
                type="time"
                value={regCheckOut}
                onChange={(e) => setRegCheckOut(e.target.value)}
              />
              <Input
                label="Reason"
                placeholder="Detailed reason for regularization (e.g. Client visit, Biometric device offline)"
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}
