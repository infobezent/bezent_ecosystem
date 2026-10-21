import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
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
  EmptyState,
  ProgressBar,
  Select,
  Input,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { essApi, type EssTimesheet, type EssAttendanceRecord } from '../api/essApi';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Timesheets' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted (Pending Review)' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startMonth = monday.toLocaleDateString([], { month: 'short' });
  const endMonth = sunday.toLocaleDateString([], { month: 'short' });
  const year = sunday.getFullYear();

  if (startMonth === endMonth) {
    return `${monday.getDate()} – ${sunday.getDate()} ${startMonth} ${year}`;
  }
  return `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth} ${year}`;
}

export interface EssTimesheetsPageProps {
  initialTimesheets?: EssTimesheet[];
  initialAttendance?: EssAttendanceRecord[];
  initialLoading?: boolean;
  initialMonday?: Date;
}

export function EssTimesheetsPage({
  initialTimesheets,
  initialAttendance,
  initialLoading,
  initialMonday,
}: EssTimesheetsPageProps = {}) {
  const [timesheets, setTimesheets] = useState<EssTimesheet[]>(() => initialTimesheets ?? []);
  const [attendanceRecords, setAttendanceRecords] = useState<EssAttendanceRecord[]>(
    () => initialAttendance ?? [],
  );
  const [loading, setLoading] = useState<boolean>(() =>
    initialLoading !== undefined ? initialLoading : initialTimesheets ? false : true,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active week selection
  const [activeMonday, setActiveMonday] = useState<Date>(() =>
    initialMonday ? getMonday(initialMonday) : getMonday(new Date()),
  );

  // Status Filter for bottom history
  const [statusFilter, setStatusFilter] = useState('all');

  // Submit action loading
  const [submitLoading, setSubmitLoading] = useState(false);

  // Add Entry Modal state
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(() => formatDateStr(new Date()));
  const [formProject, setFormProject] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formHours, setFormHours] = useState('8');

  // Edit Entry Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EssTimesheet | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editTask, setEditTask] = useState('');
  const [editHours, setEditHours] = useState('8');

  // Delete Confirmation Modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<EssTimesheet | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tsData, attData] = await Promise.all([
        essApi.getTimesheets(),
        essApi.getAttendance().catch(() => ({ history: [] })),
      ]);
      setTimesheets(tsData.timesheets || []);
      setAttendanceRecords(attData.history || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoading === false) return;
    loadData();
  }, [loadData, initialLoading]);

  // Week Days array (Monday to Sunday)
  const weekDays = useMemo(() => {
    const todayStr = formatDateStr(new Date());
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(activeMonday);
      d.setDate(activeMonday.getDate() + i);
      const dateStr = formatDateStr(d);
      days.push({
        dateStr,
        dayName: dayNames[i]!,
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [activeMonday]);

  const weekDateSet = useMemo(() => new Set(weekDays.map((d) => d.dateStr)), [weekDays]);

  // Filter timesheets for active week
  const weekTimesheets = useMemo(() => {
    return timesheets.filter((t) => weekDateSet.has(t.date));
  }, [timesheets, weekDateSet]);

  // Unique project/task rows for active week
  const projectRows = useMemo(() => {
    const map = new Map<
      string,
      {
        projectName: string;
        taskDescription: string;
        entriesByDate: Map<string, EssTimesheet>;
        totalHours: number;
      }
    >();

    for (const ts of weekTimesheets) {
      const key = `${ts.projectName}|||${ts.taskDescription}`;
      let row = map.get(key);
      if (!row) {
        row = {
          projectName: ts.projectName,
          taskDescription: ts.taskDescription,
          entriesByDate: new Map(),
          totalHours: 0,
        };
        map.set(key, row);
      }
      row.entriesByDate.set(ts.date, ts);
      row.totalHours += Number(ts.hours) || 0;
    }

    return Array.from(map.values());
  }, [weekTimesheets]);

  // Daily column totals
  const colTotals = useMemo(() => {
    return weekDays.map((d) => {
      return weekTimesheets
        .filter((t) => t.date === d.dateStr)
        .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    });
  }, [weekDays, weekTimesheets]);

  // Weekly grand total hours
  const grandTotalHours = useMemo(() => {
    return colTotals.reduce((a, b) => a + b, 0);
  }, [colTotals]);

  // Overall Weekly Summary Metrics (active week)
  const draftHours = useMemo(() => {
    return weekTimesheets
      .filter((t) => t.status === 'draft')
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  }, [weekTimesheets]);

  const draftCount = useMemo(() => {
    return weekTimesheets.filter((t) => t.status === 'draft').length;
  }, [weekTimesheets]);

  const submittedHours = useMemo(() => {
    return weekTimesheets
      .filter((t) => t.status === 'submitted')
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  }, [weekTimesheets]);

  const approvedHours = useMemo(() => {
    return weekTimesheets
      .filter((t) => t.status === 'approved')
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  }, [weekTimesheets]);

  // Attendance comparison for active week
  const attendanceComparison = useMemo(() => {
    let totalMinutes = 0;
    for (const rec of attendanceRecords) {
      if (weekDateSet.has(rec.date)) {
        totalMinutes += rec.workedMinutes || 0;
      }
    }
    const attHours = Math.round((totalMinutes / 60) * 10) / 10;
    const diff = Math.round((grandTotalHours - attHours) * 10) / 10;
    return {
      attendanceHours: attHours,
      timesheetHours: grandTotalHours,
      diff,
    };
  }, [attendanceRecords, weekDateSet, grandTotalHours]);

  // Filtered History list (bottom table)
  const filteredHistory = useMemo(() => {
    if (statusFilter === 'all') return timesheets;
    return timesheets.filter((t) => t.status === statusFilter);
  }, [timesheets, statusFilter]);

  // Known projects for suggestions
  const knownProjects = useMemo(() => {
    return Array.from(new Set(timesheets.map((t) => t.projectName).filter(Boolean)));
  }, [timesheets]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(activeMonday);
    prev.setDate(activeMonday.getDate() - 7);
    setActiveMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(activeMonday);
    next.setDate(activeMonday.getDate() + 7);
    setActiveMonday(next);
  };

  const handleCurrentWeek = () => {
    setActiveMonday(getMonday(new Date()));
  };

  // Add Entry Handlers
  const handleOpenAdd = (defaultDate?: string, defaultProject?: string, defaultTask?: string) => {
    setFormDate(defaultDate || formatDateStr(new Date()));
    setFormProject(defaultProject || '');
    setFormTask(defaultTask || '');
    setFormHours('8');
    setLogError(null);
    setLogOpen(true);
  };

  const handleSaveEntry = async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const numHours = Number(formHours);
      if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
        throw new Error('Please enter valid hours between 1 and 24');
      }
      if (!formProject.trim()) {
        throw new Error('Project name is required');
      }
      if (!formTask.trim()) {
        throw new Error('Task description is required');
      }

      await essApi.logTimesheet({
        date: formDate,
        projectName: formProject.trim(),
        taskDescription: formTask.trim(),
        hours: numHours,
      });

      setSuccessMsg('Timesheet entry logged as draft.');
      setLogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setLogError(err instanceof Error ? err.message : 'Failed to log timesheet entry');
    } finally {
      setLogLoading(false);
    }
  };

  // Edit Entry Handlers
  const handleOpenEdit = (entry: EssTimesheet) => {
    if (entry.status !== 'draft') return;
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditProject(entry.projectName);
    setEditTask(entry.taskDescription);
    setEditHours(String(entry.hours));
    setEditError(null);
    setEditOpen(true);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const numHours = Number(editHours);
      if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
        throw new Error('Please enter valid hours between 1 and 24');
      }
      if (!editProject.trim()) {
        throw new Error('Project name is required');
      }
      if (!editTask.trim()) {
        throw new Error('Task description is required');
      }

      await essApi.updateTimesheet(editingEntry.id, {
        date: editDate,
        projectName: editProject.trim(),
        taskDescription: editTask.trim(),
        hours: numHours,
      });

      setSuccessMsg('Timesheet entry updated successfully.');
      setEditOpen(false);
      setEditingEntry(null);
      await loadData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update timesheet entry');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Entry Handlers
  const handleOpenDelete = (entry: EssTimesheet) => {
    if (entry.status !== 'draft') return;
    setDeletingEntry(entry);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    setDeleteLoading(true);
    try {
      await essApi.deleteTimesheet(deletingEntry.id);
      setSuccessMsg('Draft timesheet entry deleted.');
      setDeleteOpen(false);
      setDeletingEntry(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete timesheet entry');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Submit Drafts Handler
  const handleSubmitWeekDrafts = async () => {
    const draftIds = weekTimesheets.filter((t) => t.status === 'draft').map((t) => t.id);
    if (draftIds.length === 0) return;

    setSubmitLoading(true);
    setError(null);
    try {
      const res = await essApi.submitTimesheets(draftIds);
      setSuccessMsg(`${res.submittedCount} timesheet draft(s) submitted for approval.`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit timesheets');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading your timesheets workspace..." />;

  const weeklyTarget = 40;
  const progressPct = Math.min(100, Math.round((grandTotalHours / weeklyTarget) * 100));

  return (
    <Page>
      <PageHeader
        title="My Timesheets"
        subtitle="Track your project work, manage weekly hours, and submit timesheets."
        actions={
          <Inline gap="sm">
            {draftCount > 0 && (
              <Button
                id="ess-submit-timesheets-btn"
                variant="secondary"
                onClick={handleSubmitWeekDrafts}
                loading={submitLoading}
              >
                {`Submit Timesheet (${draftCount} Draft${draftCount > 1 ? 's' : ''})`}
              </Button>
            )}
            <Button
              id="ess-log-hours-btn"
              variant="primary"
              leftIcon={<BezentIcon name="timesheets" size={16} />}
              onClick={() => handleOpenAdd()}
            >
              Add Time Entry
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {/* ── Week Navigation Bar ───────────────────────────────────── */}
      <div className="ess-timesheets-week-bar">
        <div className="ess-timesheets-week-nav">
          <IconButton label="Previous Week" onClick={handlePrevWeek} disabled={loading}>
            <BezentIcon name="chevronLeft" size={18} />
          </IconButton>
          <span className="ess-timesheets-week-title">{formatWeekRange(activeMonday)}</span>
          <IconButton label="Next Week" onClick={handleNextWeek} disabled={loading}>
            <BezentIcon name="chevronRight" size={18} />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={handleCurrentWeek} disabled={loading}>
            Current Week
          </Button>
        </div>

        <Inline gap="sm" align="center">
          <span className="ess-timesheets-weekly-logged-stat">
            Weekly Logged: <strong>{grandTotalHours}h</strong> / {weeklyTarget}h
          </span>
        </Inline>
      </div>

      {/* ── Weekly Summary KPIs ────────────────────────────────────── */}
      <Section title="Weekly Summary">
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span className="ess-timesheets-kpi-sub">Total Logged</span>
              <Inline gap="xs" align="baseline">
                <strong className="ess-timesheets-kpi-val">{grandTotalHours}h</strong>
                <span className="ess-timesheets-kpi-target">/ {weeklyTarget}h target</span>
              </Inline>
              <ProgressBar
                value={grandTotalHours}
                max={weeklyTarget}
                variant={progressPct >= 100 ? 'success' : 'primary'}
                size="sm"
              />
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span className="ess-timesheets-kpi-sub">Draft Hours</span>
              <strong className="ess-timesheets-kpi-val">{draftHours}h</strong>
              <span className="ess-timesheets-kpi-target">
                {draftCount} entry(ies) ready to submit
              </span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span className="ess-timesheets-kpi-sub">Pending Review</span>
              <strong className="ess-timesheets-kpi-val">{submittedHours}h</strong>
              <span className="ess-timesheets-kpi-target">Awaiting approval</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span className="ess-timesheets-kpi-sub">Approved Hours</span>
              <strong className="ess-timesheets-kpi-val">{approvedHours}h</strong>
              <span className="ess-timesheets-kpi-target">Confirmed for payroll</span>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Attendance Comparison ──────────────────────────────────── */}
      <Section title="Attendance vs Timesheet Reconciliation">
        <div className="ess-timesheets-compare-box">
          <div className="ess-timesheets-compare-metric">
            <span className="ess-timesheets-compare-label">Attendance Worked Hours</span>
            <span className="ess-timesheets-compare-val">
              {attendanceComparison.attendanceHours}h
            </span>
          </div>

          <div className="ess-timesheets-compare-metric">
            <span className="ess-timesheets-compare-label">Timesheet Project Hours</span>
            <span className="ess-timesheets-compare-val">
              {attendanceComparison.timesheetHours}h
            </span>
          </div>

          <div className="ess-timesheets-compare-metric">
            <span className="ess-timesheets-compare-label">Allocation Difference</span>
            <div>
              <span
                className={`ess-timesheets-variance-badge ${
                  attendanceComparison.diff === 0
                    ? 'ess-timesheets-variance--match'
                    : attendanceComparison.diff > 0
                      ? 'ess-timesheets-variance--over'
                      : 'ess-timesheets-variance--under'
                }`}
              >
                {attendanceComparison.diff > 0
                  ? `+${attendanceComparison.diff}h`
                  : `${attendanceComparison.diff}h`}
              </span>
            </div>
          </div>

          <div className="ess-timesheets-compare-desc-wrap">
            <span className="ess-timesheets-compare-desc">
              Attendance reflects clock-in/out shift durations. Timesheets reflect project task
              allocation. Discrepancies may occur due to breaks or non-project activities.
            </span>
          </div>
        </div>
      </Section>

      {/* ── Weekly Timesheet Grid ─────────────────────────────────── */}
      <Section title="Weekly Timesheet Grid">
        {projectRows.length === 0 ? (
          <EmptyState
            title="No Time Entries For This Week"
            description="You have not logged any project time entries for this week yet."
            primaryAction={{
              label: 'Add Time Entry',
              onClick: () => handleOpenAdd(),
            }}
          />
        ) : (
          <>
            {/* Desktop 7-Column Table */}
            <div className="ess-timesheets-grid-wrapper">
              <table className="ess-timesheets-grid-table">
                <thead>
                  <tr>
                    <th>Project &amp; Task</th>
                    {weekDays.map((d) => (
                      <th key={d.dateStr} className={d.isToday ? 'is-today' : ''}>
                        {d.dayName} {d.dayNum}
                      </th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((row) => (
                    <tr key={`${row.projectName}-${row.taskDescription}`}>
                      <td>
                        <span className="ess-timesheets-project-title">{row.projectName}</span>
                        <span className="ess-timesheets-task-sub">{row.taskDescription}</span>
                      </td>
                      {weekDays.map((d) => {
                        const entry = row.entriesByDate.get(d.dateStr);
                        if (!entry) {
                          return (
                            <td key={d.dateStr} className={d.isToday ? 'is-today' : ''}>
                              <span
                                className="ess-timesheets-empty-cell"
                                title={`Add entry for ${d.dayName} (${row.projectName})`}
                                onClick={() =>
                                  handleOpenAdd(d.dateStr, row.projectName, row.taskDescription)
                                }
                              >
                                —
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={d.dateStr} className={d.isToday ? 'is-today' : ''}>
                            <button
                              type="button"
                              className={`ess-timesheets-hour-pill ess-timesheets-hour-pill--${entry.status}`}
                              title={`${entry.projectName} - ${entry.hours}h (${entry.status})`}
                              onClick={() => {
                                if (entry.status === 'draft') {
                                  handleOpenEdit(entry);
                                }
                              }}
                            >
                              {entry.hours}h
                            </button>
                          </td>
                        );
                      })}
                      <td>
                        <span className="ess-timesheets-row-total">{row.totalHours}h</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="ess-timesheets-footer-row">
                    <td>
                      <strong>Total Logged</strong>
                    </td>
                    {colTotals.map((tot, idx) => (
                      <td key={weekDays[idx]?.dateStr || idx}>
                        <strong>{tot > 0 ? `${tot}h` : '0h'}</strong>
                      </td>
                    ))}
                    <td>
                      <strong className="ess-timesheets-grand-total">{grandTotalHours}h</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Daily Cards Stack */}
            <div className="ess-timesheets-mobile-cards">
              {weekDays.map((d, idx) => {
                const dayEntries = weekTimesheets.filter((t) => t.date === d.dateStr);
                const dayTotal = colTotals[idx] || 0;

                return (
                  <div key={d.dateStr} className="ess-timesheets-day-card">
                    <div className="ess-timesheets-day-card-header">
                      <span className="ess-timesheets-day-name">
                        {d.dayName}, {d.dayNum} {d.isToday ? '(Today)' : ''}
                      </span>
                      <span className="ess-timesheets-day-total">{dayTotal}h</span>
                    </div>

                    {dayEntries.length === 0 ? (
                      <span className="ess-timesheets-mobile-no-entries">No project entries</span>
                    ) : (
                      <Stack gap="xs">
                        {dayEntries.map((e) => (
                          <Inline key={e.id} justify="between" align="center">
                            <Stack gap="none">
                              <strong className="ess-timesheets-mobile-entry-title">
                                {e.projectName}
                              </strong>
                              <span className="ess-timesheets-mobile-entry-sub">
                                {e.taskDescription}
                              </span>
                            </Stack>
                            <Inline gap="xs" align="center">
                              <Badge
                                variant={
                                  e.status === 'approved'
                                    ? 'success'
                                    : e.status === 'submitted'
                                      ? 'info'
                                      : e.status === 'rejected'
                                        ? 'danger'
                                        : 'neutral'
                                }
                              >
                                {e.hours}h
                              </Badge>
                              {e.status === 'draft' && (
                                <IconButton label="Edit" onClick={() => handleOpenEdit(e)}>
                                  <BezentIcon name="edit" size={14} />
                                </IconButton>
                              )}
                            </Inline>
                          </Inline>
                        ))}
                      </Stack>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Section>

      {/* ── All Time Entries Ledger ───────────────────────────────── */}
      <Section title="Time Entry Records">
        <Stack gap="md">
          <Toolbar
            left={
              <Inline gap="sm" align="center">
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </Inline>
            }
            right={
              <span className="ess-timesheets-count-info">
                Showing <strong>{filteredHistory.length}</strong> record(s)
              </span>
            }
          />

          {filteredHistory.length === 0 ? (
            <EmptyState
              title="No Records Found"
              description={
                statusFilter === 'all'
                  ? 'No timesheet entries have been logged yet.'
                  : `No timesheet records with status "${statusFilter}".`
              }
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Project</TableHeaderCell>
                    <TableHeaderCell>Task Description</TableHeaderCell>
                    <TableHeaderCell>Hours</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((ts) => (
                    <TableRow key={ts.id}>
                      <TableCell>{ts.date}</TableCell>
                      <TableCell>
                        <strong>{ts.projectName}</strong>
                      </TableCell>
                      <TableCell>{ts.taskDescription}</TableCell>
                      <TableCell>
                        <strong>{ts.hours}h</strong>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ts.status === 'approved'
                              ? 'success'
                              : ts.status === 'submitted'
                                ? 'info'
                                : ts.status === 'rejected'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ts.status === 'draft' ? (
                          <Inline gap="xs">
                            <IconButton label="Edit Entry" onClick={() => handleOpenEdit(ts)}>
                              <BezentIcon name="edit" size={14} />
                            </IconButton>
                            <IconButton label="Delete Entry" onClick={() => handleOpenDelete(ts)}>
                              <BezentIcon name="delete" size={14} />
                            </IconButton>
                          </Inline>
                        ) : (
                          <span className="ess-timesheets-finalized-text">Finalized</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      </Section>

      {/* ── Add Entry Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={logOpen}
        title="Log Work Hours"
        onClose={() => setLogOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEntry}
              loading={logLoading}
              disabled={!formProject.trim() || !formTask.trim()}
            >
              Save Draft
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {logError && (
            <Alert variant="error" title="Validation Error">
              {logError}
            </Alert>
          )}
          <FormSection title="Entry Details">
            <FormGrid columns={1}>
              <Input
                label="Work Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <Input
                label="Project Name"
                placeholder="e.g. BEZENT Core HRMS, Client Portal..."
                value={formProject}
                onChange={(e) => setFormProject(e.target.value)}
              />
              {knownProjects.length > 0 && !formProject && (
                <div className="ess-timesheets-recent-projects-wrap">
                  <span className="ess-timesheets-recent-label">Recent Projects: </span>
                  {knownProjects.slice(0, 4).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="ess-timesheets-project-chip-btn"
                      onClick={() => setFormProject(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <Input
                label="Task Description"
                placeholder="Describe your project work or deliverables..."
                value={formTask}
                onChange={(e) => setFormTask(e.target.value)}
              />
              <Input
                label="Hours (1–24)"
                type="number"
                min={1}
                max={24}
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Edit Entry Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={editOpen}
        title="Edit Draft Entry"
        onClose={() => setEditOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateEntry}
              loading={editLoading}
              disabled={!editProject.trim() || !editTask.trim()}
            >
              Update Entry
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {editError && (
            <Alert variant="error" title="Validation Error">
              {editError}
            </Alert>
          )}
          <FormSection title="Modify Entry Details">
            <FormGrid columns={1}>
              <Input
                label="Work Date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <Input
                label="Project Name"
                value={editProject}
                onChange={(e) => setEditProject(e.target.value)}
              />
              <Input
                label="Task Description"
                value={editTask}
                onChange={(e) => setEditTask(e.target.value)}
              />
              <Input
                label="Hours (1–24)"
                type="number"
                min={1}
                max={24}
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      <Modal
        isOpen={deleteOpen}
        title="Delete Draft Entry"
        onClose={() => setDeleteOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} loading={deleteLoading}>
              Delete Entry
            </Button>
          </Inline>
        }
      >
        <p className="ess-timesheets-delete-msg">
          Are you sure you want to delete this draft entry for{' '}
          <strong>{deletingEntry?.projectName}</strong> on {deletingEntry?.date} (
          {deletingEntry?.hours}h)? This action cannot be undone.
        </p>
      </Modal>
    </Page>
  );
}
