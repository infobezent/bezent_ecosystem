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
  Alert,
  LoadingState,
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
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  essApi,
  type EssAttendanceRecord,
  type EssAttendanceView,
  type EssMonthlyAttendanceSummary,
  type EssTodayAttendance,
  type EssAttendanceSummaryCounters,
  type EssAttendanceRegularizationDto,
} from '../api/essApi';
import { useEssAttendance, formatDisplayTime, formatMinutes } from '../hooks';
import {
  AttendanceMonthlyCalendar,
  AttendanceSummaryMetricsCards,
} from '../components/AttendanceMonthlyCalendar';

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

export function EssAttendancePage() {
  const [workspace, setWorkspace] = useState<AttendanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month and Date Selection State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Punch actions
  const [selectedLocation, setSelectedLocation] = useState<string>('office');

  // Break Modal
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<'tea' | 'lunch' | 'personal'>('tea');
  const [breakNotes, setBreakNotes] = useState('');

  // Regularization list and modal
  const [regularizations, setRegularizations] = useState<EssAttendanceRegularizationDto[]>([]);
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
      const monthStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;
      const [data, regData] = await Promise.all([
        essApi.getAttendance({ month: monthStr }),
        essApi.getAttendanceRegularizations().catch(() => []),
      ]);
      setWorkspace(data);
      setRegularizations(regData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [calendarDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMonthChange = async (newDate: Date) => {
    setCalendarDate(newDate);
    const monthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    try {
      const data = await essApi.getAttendance({ month: monthStr });
      setWorkspace((prev) => {
        if (!prev) return data;
        return {
          ...prev,
          summary: data.summary ?? prev.summary,
          history: data.history,
          monthlySummary: data.monthlySummary ?? prev.monthlySummary,
        };
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly attendance');
    }
  };

  const {
    now,
    today,
    isShiftAssigned,
    shiftName,
    shiftTimes,
    hasPunchedIn,
    hasPunchedOut,
    isOnBreak,
    statusLabel,
    grossMinutes,
    liveBreakMinutes,
    netWorkedMinutes,
    requiredShiftMinutes,
    progressPercent,
    canCheckIn,
    canCheckOut,
    canStartBreak,
    canEndBreak,
    checkInDisabledReason,
    checkOutDisabledReason,
    punchLoading,
    punchError,
    punchSuccess,
    handleCheckIn: performCheckIn,
    handleCheckOut: performCheckOut,
    handleStartBreak: performStartBreak,
    handleEndBreak: performEndBreak,
  } = useEssAttendance({
    todayAttendance: workspace?.today,
    onRefresh: load,
  });

  const handleCheckIn = async () => {
    await performCheckIn(selectedLocation);
  };

  const handleCheckOut = async () => {
    await performCheckOut();
  };

  const handleStartBreak = async () => {
    const success = await performStartBreak(selectedBreakType, breakNotes);
    if (success) {
      setBreakModalOpen(false);
      setBreakNotes('');
    }
  };

  const handleEndBreak = async () => {
    await performEndBreak();
  };

  // Selected date record details
  const selectedRecord = useMemo(() => {
    if (!workspace?.history || !selectedDateStr) return null;
    return workspace.history.find((h) => h.date === selectedDateStr) ?? null;
  }, [workspace?.history, selectedDateStr]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isSelectedDateToday = selectedDateStr === todayStr;

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDateStr) return '';
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return selectedDateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateStr]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDateStr) return 0;
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getDay();
  }, [selectedDateStr]);

  const isSelectedWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;
  const isSelectedFuture = selectedDateStr > todayStr;

  // Active regularization for selected date
  const activeRegForSelectedDay = useMemo(() => {
    if (!selectedDateStr) return null;
    return (
      regularizations.find(
        (r) =>
          r.workday === selectedDateStr &&
          ['submitted', 'under_review', 'awaiting_info', 'approved'].includes(r.approvalStatus),
      ) ?? null
    );
  }, [selectedDateStr, regularizations]);

  const activeRegForModalDate = useMemo(() => {
    if (!regDate) return null;
    return (
      regularizations.find(
        (r) =>
          r.workday === regDate &&
          ['submitted', 'under_review', 'awaiting_info', 'approved'].includes(r.approvalStatus),
      ) ?? null
    );
  }, [regDate, regularizations]);

  const handleRegularize = async () => {
    if (!regDate || !regReason.trim()) {
      setRegError('Workday date and reason are required.');
      return;
    }
    if (activeRegForModalDate) {
      setRegError(
        `A regularization request (${activeRegForModalDate.requestNumber}) is already active for ${regDate}.`,
      );
      return;
    }
    setRegLoading(true);
    setRegError(null);
    try {
      await essApi.regularizeAttendance({
        date: regDate,
        workday: regDate,
        checkInTime: regCheckIn,
        checkOutTime: regCheckOut,
        proposedCheckIn: regCheckIn,
        proposedCheckOut: regCheckOut,
        reason: regReason.trim(),
        requestType: 'punch_correction',
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

  if (loading) return <LoadingState label="Loading attendance..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  if (!workspace) return null;

  const summary = workspace.summary ?? {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    lateMarksCount: 0,
    regularizationQuotaUsed: 0,
    regularizationQuotaLimit: 3,
    workedMinutes: 0,
    missingPunchesCount: 0,
    attendancePercent: 0,
    totalWorkingDays: 0,
  };

  return (
    <Page>
      <PageHeader
        title="Attendance & Time"
        subtitle="Your attendance, working hours, and daily records"
        actions={
          <Button
            id="ess-attendance-regularize-btn"
            variant="secondary"
            leftIcon={<BezentIcon name="edit" size={16} />}
            onClick={() => {
              setRegDate(today.date);
              setRegError(null);
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
          Your attendance regularization request has been submitted for manager review.
        </Alert>
      )}

      {/* ── Compact Today Attendance Panel (Option B) ─────────────── */}
      <div className="ess-attendance-today-card">
        <div className="ess-today-workspace__main-row">
          {/* Clock and Status Group */}
          <div className="ess-today-workspace__identity">
            <div className="ess-today-workspace__icon-box">
              <BezentIcon name="attendance" size={22} />
            </div>
            <div className="ess-today-workspace__clock-info">
              <div className="ess-today-workspace__time-row">
                <span className="ess-today-workspace__time">
                  {now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="ess-today-workspace__date">
                  {now.toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="ess-today-workspace__status-row">
                <Badge
                  variant={
                    isOnBreak
                      ? 'warning'
                      : hasPunchedOut
                        ? 'neutral'
                        : hasPunchedIn
                          ? 'success'
                          : 'neutral'
                  }
                  size="sm"
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Shift & Timing Pillars Group */}
          <div className="ess-today-workspace__pillars">
            <div className="ess-today-pillar">
              <span className="ess-today-pillar__label">Shift Schedule</span>
              <span className="ess-today-pillar__value">
                {!isShiftAssigned ? 'Open Attendance' : shiftTimes || shiftName}
              </span>
            </div>
            <div className="ess-today-pillar">
              <span className="ess-today-pillar__label">Check In</span>
              <span className="ess-today-pillar__value">
                {formatDisplayTime(today.checkInTime)}
              </span>
            </div>
            <div className="ess-today-pillar">
              <span className="ess-today-pillar__label">Check Out</span>
              <span className="ess-today-pillar__value">
                {formatDisplayTime(today.checkOutTime)}
              </span>
            </div>
            <div className="ess-today-pillar">
              <span className="ess-today-pillar__label">Gross / Net</span>
              <span className="ess-today-pillar__value">
                {formatMinutes(grossMinutes)} / {formatMinutes(netWorkedMinutes)}
              </span>
            </div>
            <div className="ess-today-pillar">
              <span className="ess-today-pillar__label">Break</span>
              <span className="ess-today-pillar__value">{formatMinutes(liveBreakMinutes)}</span>
            </div>
          </div>

          {/* Actions Group */}
          <div className="ess-today-workspace__actions">
            {!hasPunchedIn && (
              <div className="ess-today-workspace__mode-select">
                <Select
                  aria-label="Work Mode"
                  size="sm"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  options={WORK_LOCATION_OPTIONS}
                />
              </div>
            )}

            {!hasPunchedIn && (
              <Button
                id="att-check-in"
                variant="primary"
                onClick={handleCheckIn}
                disabled={!canCheckIn || punchLoading}
                loading={punchLoading}
                title={checkInDisabledReason}
                leftIcon={<BezentIcon name="check" size={16} />}
              >
                Check In
              </Button>
            )}

            {hasPunchedIn && !hasPunchedOut && (
              <>
                {!isOnBreak ? (
                  <Button
                    id="att-take-break"
                    variant="secondary"
                    size="sm"
                    onClick={() => setBreakModalOpen(true)}
                    disabled={!canStartBreak || punchLoading}
                    loading={punchLoading}
                    leftIcon={<BezentIcon name="coffee" size={15} />}
                  >
                    Take Break
                  </Button>
                ) : (
                  <Button
                    id="att-end-break"
                    variant="primary"
                    size="sm"
                    onClick={handleEndBreak}
                    disabled={!canEndBreak || punchLoading}
                    loading={punchLoading}
                    leftIcon={<BezentIcon name="check" size={15} />}
                  >
                    End Break
                  </Button>
                )}

                <Button
                  id="att-check-out"
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckOut}
                  disabled={!canCheckOut || punchLoading}
                  loading={punchLoading}
                  title={checkOutDisabledReason}
                  leftIcon={<BezentIcon name="close" size={15} />}
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
          </div>
        </div>

        {isShiftAssigned && (
          <div className="ess-today-workspace__progress-strip">
            <div className="ess-today-workspace__progress-header">
              <span>Shift Target Progress</span>
              <span className="ess-today-progress-stat">
                {formatMinutes(netWorkedMinutes)} of {formatMinutes(requiredShiftMinutes)} (
                {progressPercent}%)
              </span>
            </div>
            <ProgressBar
              value={netWorkedMinutes}
              max={requiredShiftMinutes}
              variant={progressPercent >= 100 ? 'success' : 'primary'}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* ── Monthly Summary Metrics Strip (Option B) ─────────────── */}
      <AttendanceSummaryMetricsCards
        summary={{
          presentDays: summary.presentDays,
          absentDays: summary.absentDays,
          halfDays: summary.halfDays,
          lateDays: summary.lateMarksCount,
          lateMarksCount: summary.lateMarksCount,
          workedMinutes: summary.workedMinutes,
          missingPunchesCount: summary.missingPunchesCount,
          attendancePercent: summary.attendancePercent ?? 0,
          totalWorkingDays: summary.totalWorkingDays,
        }}
      />

      {/* ── Calendar & Daily Details Two-Column Workspace (Option B) ── */}
      <div className="ess-attendance-workspace-layout">
        <div className="ess-attendance-workspace-layout__calendar">
          <AttendanceMonthlyCalendar
            initialDate={calendarDate}
            summary={{
              presentDays: summary.presentDays,
              absentDays: summary.absentDays,
              halfDays: summary.halfDays,
              lateDays: summary.lateMarksCount,
              lateMarksCount: summary.lateMarksCount,
              workedMinutes: summary.workedMinutes,
              missingPunchesCount: summary.missingPunchesCount,
              attendancePercent: summary.attendancePercent ?? 0,
              totalWorkingDays: summary.totalWorkingDays,
            }}
            history={workspace.history}
            selectedDateStr={selectedDateStr}
            onSelectDate={(newDateStr) => setSelectedDateStr(newDateStr)}
            onMonthChange={handleMonthChange}
            loading={loading}
            hideHeader={true}
            hideInlineDetails={true}
            hideSummaryCards={true}
          />
        </div>

        <div className="ess-attendance-workspace-layout__details">
          <Card variant="default">
            <div className="ess-daily-details-panel">
              <div className="ess-daily-details__header">
                <div className="ess-daily-details__title-group">
                  <span className="ess-daily-details__title">{selectedDateFormatted}</span>
                  <span className="ess-daily-details__subtitle">
                    {isSelectedDateToday
                      ? "Today's live attendance details"
                      : 'Daily shift and attendance record'}
                  </span>
                </div>
                {activeRegForSelectedDay ? (
                  <Badge variant="warning" size="sm">
                    REGULARIZATION PENDING
                  </Badge>
                ) : selectedRecord ? (
                  <Badge
                    variant={
                      selectedRecord.isMissingPunch
                        ? 'danger'
                        : selectedRecord.isLate
                          ? 'warning'
                          : selectedRecord.status === 'present'
                            ? 'success'
                            : selectedRecord.status === 'half_day'
                              ? 'warning'
                              : selectedRecord.status === 'on_leave'
                                ? 'info'
                                : selectedRecord.status === 'holiday'
                                  ? 'neutral'
                                  : 'danger'
                    }
                    size="sm"
                  >
                    {selectedRecord.isMissingPunch
                      ? 'MISSING PUNCH'
                      : selectedRecord.isLate
                        ? 'LATE ARRIVAL'
                        : selectedRecord.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                ) : isSelectedWeekend ? (
                  <Badge variant="neutral" size="sm">
                    REST DAY
                  </Badge>
                ) : isSelectedFuture ? (
                  <Badge variant="neutral" size="sm">
                    UPCOMING
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm">
                    NO PUNCH
                  </Badge>
                )}
              </div>

              {activeRegForSelectedDay && (
                <Alert variant="warning" title="Active Regularization Request">
                  Request <strong>{activeRegForSelectedDay.requestNumber}</strong> is currently{' '}
                  <strong>{activeRegForSelectedDay.approvalStatus.toUpperCase()}</strong>{' '}
                  (Application status: {activeRegForSelectedDay.applicationStatus.toUpperCase()}).
                  {activeRegForSelectedDay.decisionRemarks && (
                    <div>Remarks: {activeRegForSelectedDay.decisionRemarks}</div>
                  )}
                </Alert>
              )}

              {selectedRecord ? (
                <Stack gap="md">
                  <div className="ess-daily-details__grid">
                    <div className="ess-daily-details__metric">
                      <span className="ess-daily-details__metric-label">Check In</span>
                      <span className="ess-daily-details__metric-value">
                        {formatDisplayTime(selectedRecord.checkInTime)}
                      </span>
                    </div>
                    <div className="ess-daily-details__metric">
                      <span className="ess-daily-details__metric-label">Check Out</span>
                      <span className="ess-daily-details__metric-value">
                        {formatDisplayTime(selectedRecord.checkOutTime)}
                      </span>
                    </div>
                    <div className="ess-daily-details__metric">
                      <span className="ess-daily-details__metric-label">Worked Time</span>
                      <span className="ess-daily-details__metric-value">
                        {selectedRecord.workedMinutes !== undefined
                          ? formatMinutes(selectedRecord.workedMinutes)
                          : '0m'}
                      </span>
                    </div>
                    <div className="ess-daily-details__metric">
                      <span className="ess-daily-details__metric-label">Break Duration</span>
                      <span className="ess-daily-details__metric-value">
                        {selectedRecord.breakMinutes !== undefined
                          ? formatMinutes(selectedRecord.breakMinutes)
                          : '0m'}
                      </span>
                    </div>
                  </div>

                  <div className="ess-daily-details__meta-list">
                    <div className="ess-daily-details__meta-item">
                      <span className="ess-daily-details__meta-label">Work Location:</span>
                      <strong>{selectedRecord.workLocation.toUpperCase()}</strong>
                    </div>
                    {selectedRecord.shiftScheduleRef && (
                      <div className="ess-daily-details__meta-item">
                        <span className="ess-daily-details__meta-label">Shift:</span>
                        <strong>{selectedRecord.shiftScheduleRef}</strong>
                      </div>
                    )}
                  </div>

                  <div className="ess-daily-details__flags">
                    {selectedRecord.isLate && (
                      <Badge variant="warning" size="sm">
                        Late ({selectedRecord.lateMinutes}m)
                      </Badge>
                    )}
                    {selectedRecord.isEarlyExit && (
                      <Badge variant="warning" size="sm">
                        Early Exit ({selectedRecord.earlyMinutes}m)
                      </Badge>
                    )}
                    {selectedRecord.isMissingPunch && (
                      <Badge variant="danger" size="sm">
                        Missing Punch
                      </Badge>
                    )}
                    {selectedRecord.isRegularized && (
                      <Badge variant="info" size="sm">
                        Regularized
                      </Badge>
                    )}
                    {!selectedRecord.isLate &&
                      !selectedRecord.isEarlyExit &&
                      !selectedRecord.isMissingPunch &&
                      !selectedRecord.isRegularized && (
                        <Badge variant="neutral" size="sm">
                          Standard Shift
                        </Badge>
                      )}
                  </div>

                  {selectedRecord.notes && (
                    <Stack gap="xs">
                      <span className="ess-daily-details__meta-label">Notes</span>
                      <div>{selectedRecord.notes}</div>
                    </Stack>
                  )}

                  {isSelectedDateToday && today.punches && today.punches.length > 0 && (
                    <div className="ess-daily-details__timeline">
                      <span className="ess-daily-details__meta-label">Punches Timeline</span>
                      <Table compact>
                        <TableHead>
                          <TableRow>
                            <TableHeaderCell>Time</TableHeaderCell>
                            <TableHeaderCell>Action</TableHeaderCell>
                            <TableHeaderCell>Location / Mode</TableHeaderCell>
                            <TableHeaderCell>Source</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {today.punches.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                <strong>{formatDisplayTime(p.punchTime)}</strong>
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="ess-daily-details__actions">
                    <Button
                      id="daily-detail-regularize-btn"
                      variant="secondary"
                      size="sm"
                      disabled={Boolean(activeRegForSelectedDay)}
                      leftIcon={<BezentIcon name="edit" size={15} />}
                      onClick={() => {
                        setRegDate(selectedDateStr);
                        setRegCheckIn(selectedRecord.checkInTime || '09:00');
                        setRegCheckOut(selectedRecord.checkOutTime || '18:00');
                        setRegError(null);
                        setRegularizeOpen(true);
                      }}
                    >
                      {activeRegForSelectedDay ? 'Regularization Pending' : 'Regularize This Day'}
                    </Button>
                  </div>
                </Stack>
              ) : isSelectedWeekend ? (
                <div className="ess-attendance-compact-contextual">
                  <div className="ess-attendance-compact-contextual__meta">
                    <div className="ess-attendance-compact-contextual__icon">
                      <BezentIcon name="calendar" size={18} />
                    </div>
                    <div className="ess-attendance-compact-contextual__texts">
                      <span className="ess-attendance-compact-contextual__title">Weekly Off</span>
                      <span className="ess-attendance-compact-contextual__desc">
                        Scheduled rest day • No shift attendance required for this date
                      </span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    REST DAY
                  </Badge>
                </div>
              ) : isSelectedFuture ? (
                <div className="ess-attendance-compact-contextual">
                  <div className="ess-attendance-compact-contextual__meta">
                    <div className="ess-attendance-compact-contextual__icon">
                      <BezentIcon name="clock" size={18} />
                    </div>
                    <div className="ess-attendance-compact-contextual__texts">
                      <span className="ess-attendance-compact-contextual__title">
                        Scheduled Workday
                      </span>
                      <span className="ess-attendance-compact-contextual__desc">
                        This workday has not occurred yet. Punches will become active on this date.
                      </span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    UPCOMING
                  </Badge>
                </div>
              ) : (
                <div className="ess-attendance-compact-contextual">
                  <div className="ess-attendance-compact-contextual__meta">
                    <div className="ess-attendance-compact-contextual__icon">
                      <BezentIcon name="alert" size={18} />
                    </div>
                    <div className="ess-attendance-compact-contextual__texts">
                      <span className="ess-attendance-compact-contextual__title">
                        No Attendance Recorded
                      </span>
                      <span className="ess-attendance-compact-contextual__desc">
                        No attendance punch or activity was recorded for this past workday.
                      </span>
                    </div>
                  </div>
                  <Button
                    id="daily-detail-regularize-btn"
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(activeRegForSelectedDay)}
                    leftIcon={<BezentIcon name="edit" size={15} />}
                    onClick={() => {
                      if (activeRegForSelectedDay) return;
                      setRegDate(selectedDateStr);
                      setRegCheckIn('09:00');
                      setRegCheckOut('18:00');
                      setRegError(null);
                      setRegularizeOpen(true);
                    }}
                  >
                    {activeRegForSelectedDay ? 'Regularization Pending' : 'Regularize Attendance'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Attendance Regularizations Section ──────────────────────── */}
      <Section
        title="Attendance Regularizations"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BezentIcon name="plus" size={16} />}
            onClick={() => {
              setRegDate(selectedDateStr || today.date);
              setRegReason('');
              setRegError(null);
              setRegularizeOpen(true);
            }}
          >
            New Request
          </Button>
        }
      >
        <Card variant="flat">
          {regularizations.length === 0 ? (
            <div className="ess-attendance-compact-empty">
              <div className="ess-attendance-compact-empty__icon">
                <BezentIcon name="edit" size={18} />
              </div>
              <div className="ess-attendance-compact-empty__content">
                <span className="ess-attendance-compact-empty__title">
                  No Regularization Requests
                </span>
                <span className="ess-attendance-compact-empty__desc">
                  You have not submitted any attendance regularizations. Click &quot;New
                  Request&quot; to regularize any missed punches or attendance exceptions.
                </span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Request #</TableHeaderCell>
                  <TableHeaderCell>Workday</TableHeaderCell>
                  <TableHeaderCell>Correction</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                  <TableHeaderCell>Approval Status</TableHeaderCell>
                  <TableHeaderCell>Application Status</TableHeaderCell>
                  <TableHeaderCell>Decision Remarks</TableHeaderCell>
                  <TableHeaderCell>Submitted</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regularizations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <strong>{reg.requestNumber}</strong>
                    </TableCell>
                    <TableCell>{reg.workday}</TableCell>
                    <TableCell>
                      {reg.proposedCheckIn || reg.proposedCheckOut
                        ? `${reg.proposedCheckIn || '--:--'} – ${reg.proposedCheckOut || '--:--'}`
                        : reg.proposedCorrection || '—'}
                    </TableCell>
                    <TableCell>{reg.reason}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reg.approvalStatus === 'approved'
                            ? 'success'
                            : reg.approvalStatus === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {reg.approvalStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reg.applicationStatus === 'applied'
                            ? 'success'
                            : reg.applicationStatus === 'failed'
                              ? 'danger'
                              : 'neutral'
                        }
                        size="sm"
                      >
                        {reg.applicationStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{reg.decisionRemarks || '—'}</TableCell>
                    <TableCell>
                      {reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </Section>

      {/* ── Break Selection Modal ─────────────────────────────────── */}
      <Modal
        isOpen={breakModalOpen}
        title="Select Break Type"
        onClose={() => setBreakModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              id="att-break-cancel"
              variant="secondary"
              onClick={() => setBreakModalOpen(false)}
              disabled={punchLoading}
            >
              Cancel
            </Button>
            <Button
              id="att-break-submit"
              variant="primary"
              onClick={handleStartBreak}
              loading={punchLoading}
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

      {/* ── Regularization Modal (Phase 3 Integration) ─────────────── */}
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
              disabled={Boolean(activeRegForModalDate) || !regDate || !regReason.trim()}
            >
              Submit Request
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {activeRegForModalDate && (
            <Alert variant="warning" title="Active Request Exists">
              A regularization request ({activeRegForModalDate.requestNumber}) is already{' '}
              <strong>{activeRegForModalDate.approvalStatus.toUpperCase()}</strong> for {regDate}.
              Duplicate submissions are not permitted.
            </Alert>
          )}
          {regError && (
            <Alert variant="error" title="Submission Error">
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
