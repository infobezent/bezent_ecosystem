import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  Stack,
  Inline,
  Grid,
  Table,
  Badge,
  Button,
  Input,
  Select,
  Switch,
  Checkbox,
  Modal,
  Alert,
  LoadingState,
  EmptyState,
  Tabs,
  Toolbar,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchShifts,
  createShift,
  updateShift,
  setShiftStatus,
  deleteShift,
  fetchShiftAssignments,
  createShiftAssignment,
  endShiftAssignment,
  deleteShiftAssignment,
  type FrontendShift,
  type FrontendShiftAssignment,
  type CreateShiftInput,
  type CreateShiftAssignmentInput,
} from '../api/shiftApi';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface ShiftsPageProps {
  initialShifts?: FrontendShift[];
  initialAssignments?: FrontendShiftAssignment[];
}

export function ShiftsPage({ initialShifts, initialAssignments }: ShiftsPageProps = {}) {
  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments'>('shifts');

  // Shifts state
  const [shifts, setShifts] = useState<FrontendShift[]>(initialShifts ?? []);
  const [shiftsLoading, setShiftsLoading] = useState<boolean>(!initialShifts);
  const [shiftsError, setShiftsError] = useState<string | null>(null);
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Assignments state
  const [assignments, setAssignments] = useState<FrontendShiftAssignment[]>(initialAssignments ?? []);
  const [assignmentsLoading, setAssignmentsLoading] = useState<boolean>(!initialAssignments);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [asgnScopeFilter, setAsgnScopeFilter] = useState<string>('all');
  const [asgnSearch, setAsgnSearch] = useState('');

  // Global notice banner
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal: Shift Create / Edit
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]);
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [color, setColor] = useState('#2563EB');
  const [description, setDescription] = useState('');
  const [isShiftActive, setIsShiftActive] = useState(true);
  const [shiftModalError, setShiftModalError] = useState<string | null>(null);
  const [shiftModalSaving, setShiftModalSaving] = useState(false);

  // Modal: Shift Assignment Create
  const [isAsgnModalOpen, setIsAsgnModalOpen] = useState(false);
  const [asgnShiftId, setAsgnShiftId] = useState('');
  const [asgnScope, setAsgnScope] = useState<'employee' | 'department' | 'location'>('employee');
  const [asgnTargetId, setAsgnTargetId] = useState('');
  const [asgnStartDate, setAsgnStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [asgnEndDate, setAsgnEndDate] = useState('');
  const [asgnNotes, setAsgnNotes] = useState('');
  const [asgnModalError, setAsgnModalError] = useState<string | null>(null);
  const [asgnModalSaving, setAsgnModalSaving] = useState(false);

  // Modal: End Assignment
  const [endingAsgnId, setEndingAsgnId] = useState<string | null>(null);
  const [endAsgnDate, setEndAsgnDate] = useState(new Date().toISOString().slice(0, 10));
  const [endAsgnNotes, setEndAsgnNotes] = useState('');
  const [endAsgnSaving, setEndAsgnSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const loadShifts = useCallback(async () => {
    setShiftsLoading(true);
    setShiftsError(null);
    try {
      const res = await fetchShifts({ limit: 100 });
      setShifts(res.items);
    } catch (err: unknown) {
      setShiftsError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const res = await fetchShiftAssignments({ limit: 100 });
      setAssignments(res.items);
    } catch (err: unknown) {
      setAssignmentsError(err instanceof Error ? err.message : 'Failed to load shift assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialShifts) {
      void loadShifts();
    }
    if (!initialAssignments) {
      void loadAssignments();
    }
  }, [initialShifts, initialAssignments, loadShifts, loadAssignments]);

  // ---------------------------------------------------------------------------
  // Filtered Lists & Metrics
  // ---------------------------------------------------------------------------

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (shiftStatusFilter === 'active' && !s.isActive) return false;
      if (shiftStatusFilter === 'inactive' && s.isActive) return false;
      if (shiftSearch.trim()) {
        const q = shiftSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [shifts, shiftStatusFilter, shiftSearch]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (asgnScopeFilter !== 'all' && a.assignmentScope !== asgnScopeFilter) return false;
      if (asgnSearch.trim()) {
        const q = asgnSearch.toLowerCase();
        return (
          a.targetName.toLowerCase().includes(q) ||
          (a.targetCode && a.targetCode.toLowerCase().includes(q)) ||
          a.shiftName.toLowerCase().includes(q) ||
          a.shiftCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assignments, asgnScopeFilter, asgnSearch]);

  const metrics = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((s) => s.isActive).length;
    const overnight = shifts.filter((s) => s.isOvernight).length;
    const activeAsgns = assignments.filter((a) => a.isActive).length;
    return { total, active, overnight, activeAsgns };
  }, [shifts, assignments]);

  // ---------------------------------------------------------------------------
  // Shift Modal Handlers
  // ---------------------------------------------------------------------------

  const handleOpenCreateShift = () => {
    setEditingShiftId(null);
    setShiftName('');
    setShiftCode('');
    setStartTime('09:00');
    setEndTime('18:00');
    setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setBreakMinutes(60);
    setLunchMinutes(30);
    setGraceMinutes(15);
    setColor('#2563EB');
    setDescription('');
    setIsShiftActive(true);
    setShiftModalError(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift: FrontendShift) => {
    setEditingShiftId(shift.id);
    setShiftName(shift.name);
    setShiftCode(shift.code);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setWorkingDays(shift.workingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setBreakMinutes(shift.breakMinutes ?? 60);
    setLunchMinutes(shift.lunchMinutes ?? 30);
    setGraceMinutes(shift.graceMinutes ?? 15);
    setColor(shift.color || '#2563EB');
    setDescription(shift.description || '');
    setIsShiftActive(shift.isActive);
    setShiftModalError(null);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!shiftName.trim()) {
      setShiftModalError('Shift name is required');
      return;
    }
    if (!shiftCode.trim()) {
      setShiftModalError('Shift code is required');
      return;
    }
    if (startTime === endTime) {
      setShiftModalError('Start and end times cannot be identical');
      return;
    }

    setShiftModalSaving(true);
    setShiftModalError(null);
    try {
      const payload: CreateShiftInput = {
        name: shiftName.trim(),
        code: shiftCode.trim().toUpperCase(),
        startTime,
        endTime,
        workingDays,
        breakMinutes: Number(breakMinutes) || 0,
        lunchMinutes: Number(lunchMinutes) || 0,
        graceMinutes: Number(graceMinutes) || 0,
        color,
        description: description.trim() || undefined,
        isActive: isShiftActive,
      };

      if (editingShiftId) {
        const updated = await updateShift(editingShiftId, payload);
        setShifts((prev) => prev.map((s) => (s.id === editingShiftId ? updated : s)));
        setNotice({ type: 'success', message: `Shift '${updated.name}' updated successfully` });
      } else {
        const created = await createShift(payload);
        setShifts((prev) => [...prev, created]);
        setNotice({ type: 'success', message: `Shift '${created.name}' created successfully` });
      }
      setIsShiftModalOpen(false);
    } catch (err: unknown) {
      setShiftModalError(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setShiftModalSaving(false);
    }
  };

  const handleToggleShiftStatus = async (shift: FrontendShift) => {
    try {
      const updated = await setShiftStatus(shift.id, !shift.isActive);
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? updated : s)));
      setNotice({
        type: 'success',
        message: `Shift '${shift.name}' is now ${updated.isActive ? 'Active' : 'Inactive'}`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to toggle status',
      });
    }
  };

  const handleDeleteShift = async (shift: FrontendShift) => {
    if (!window.confirm(`Are you sure you want to delete shift '${shift.name}'?`)) return;
    try {
      await deleteShift(shift.id);
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      setNotice({ type: 'success', message: `Shift '${shift.name}' deleted successfully` });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete shift',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Assignment Modal Handlers
  // ---------------------------------------------------------------------------

  const handleOpenAssignModal = () => {
    setAsgnShiftId(shifts[0]?.id || '');
    setAsgnScope('employee');
    setAsgnTargetId('');
    setAsgnStartDate(new Date().toISOString().slice(0, 10));
    setAsgnEndDate('');
    setAsgnNotes('');
    setAsgnModalError(null);
    setIsAsgnModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!asgnShiftId) {
      setAsgnModalError('Please select a shift');
      return;
    }
    if (!asgnTargetId.trim()) {
      setAsgnModalError(`Please enter a valid ${asgnScope} ID`);
      return;
    }
    if (!asgnStartDate) {
      setAsgnModalError('Effective start date is required');
      return;
    }

    setAsgnModalSaving(true);
    setAsgnModalError(null);
    try {
      const payload: CreateShiftAssignmentInput = {
        shiftId: asgnShiftId,
        assignmentScope: asgnScope,
        targetId: asgnTargetId.trim(),
        effectiveStartDate: asgnStartDate,
        effectiveEndDate: asgnEndDate.trim() || undefined,
        notes: asgnNotes.trim() || undefined,
      };

      const created = await createShiftAssignment(payload);
      setAssignments((prev) => [created, ...prev]);
      setNotice({ type: 'success', message: 'Shift assignment created successfully' });
      setIsAsgnModalOpen(false);
    } catch (err: unknown) {
      setAsgnModalError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setAsgnModalSaving(false);
    }
  };

  const handleConfirmEndAssignment = async () => {
    if (!endingAsgnId) return;
    if (!endAsgnDate) {
      setNotice({ type: 'error', message: 'Please specify an end date' });
      return;
    }

    setEndAsgnSaving(true);
    try {
      const updated = await endShiftAssignment(endingAsgnId, endAsgnDate, endAsgnNotes);
      setAssignments((prev) => prev.map((a) => (a.id === endingAsgnId ? updated : a)));
      setNotice({ type: 'success', message: 'Assignment ended successfully' });
      setEndingAsgnId(null);
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to end assignment',
      });
    } finally {
      setEndAsgnSaving(false);
    }
  };

  const handleDeleteAssignment = async (asgn: FrontendShiftAssignment) => {
    if (!window.confirm('Are you sure you want to delete this shift assignment?')) return;
    try {
      await deleteShiftAssignment(asgn.id);
      setAssignments((prev) => prev.filter((a) => a.id !== asgn.id));
      setNotice({ type: 'success', message: 'Assignment deleted successfully' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete assignment',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Page>
      <Stack gap="lg">
        <PageHeader
          title="Shift Management & Rotations"
          subtitle="Manage company work shifts, rotating schedules, and department or employee assignments."
          actions={
            <Inline gap="sm">
              {activeTab === 'shifts' ? (
                <Button variant="primary" onClick={handleOpenCreateShift}>
                  + Create Shift
                </Button>
              ) : (
                <Button variant="primary" onClick={handleOpenAssignModal}>
                  + Assign Shift
                </Button>
              )}
            </Inline>
          }
        />

        {notice && (
          <Alert variant={notice.type === 'success' ? 'success' : 'danger'}>
            <Inline justify="between" align="center">
              <span>{notice.message}</span>
              <Button size="sm" variant="secondary" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            </Inline>
          </Alert>
        )}

        {/* Top KPI Metrics Bar */}
        <Grid columns={4} gap="md">
          <Card>
            <CardHeader>
              <Stack gap="xs">
                <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  Total Shifts
                </span>
                <CardTitle className="text-2xl font-bold">{metrics.total}</CardTitle>
              </Stack>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Stack gap="xs">
                <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  Active Shifts
                </span>
                <CardTitle className="text-2xl font-bold text-emerald-600">{metrics.active}</CardTitle>
              </Stack>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Stack gap="xs">
                <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  Active Assignments
                </span>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  {metrics.activeAsgns}
                </CardTitle>
              </Stack>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Stack gap="xs">
                <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  Overnight Shifts
                </span>
                <CardTitle className="text-2xl font-bold text-purple-600">
                  {metrics.overnight}
                </CardTitle>
              </Stack>
            </CardHeader>
          </Card>
        </Grid>

        {/* Tab Switcher */}
        <Tabs
          items={[
            { id: 'shifts', label: `Shift Definitions (${shifts.length})` },
            { id: 'assignments', label: `Shift Assignments (${assignments.length})` },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'shifts' | 'assignments')}
        />

        {/* TAB 1: SHIFT DEFINITIONS */}
        {activeTab === 'shifts' && (
          <Stack gap="md">
            <Toolbar>
              <Inline gap="sm" align="center" justify="between" className="w-full">
                <Inline gap="sm" align="center">
                  <Input
                    placeholder="Search shift by name or code…"
                    value={shiftSearch}
                    onChange={(e) => setShiftSearch(e.target.value)}
                  />
                  <Select
                    value={shiftStatusFilter}
                    onChange={(e) => setShiftStatusFilter(e.target.value as any)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </Select>
                </Inline>
                <Button variant="secondary" onClick={() => void loadShifts()}>
                  Refresh
                </Button>
              </Inline>
            </Toolbar>

            {shiftsLoading ? (
              <LoadingState label="Loading shifts from database…" />
            ) : shiftsError ? (
              <Alert variant="danger">
                <Inline justify="between" align="center">
                  <span>{shiftsError}</span>
                  <Button size="sm" variant="secondary" onClick={() => void loadShifts()}>
                    Retry
                  </Button>
                </Inline>
              </Alert>
            ) : filteredShifts.length === 0 ? (
              <EmptyState
                title="No shifts found"
                description="Create a work shift template to configure employee working hours, break allowances, and grace periods."
                primaryAction={{
                  label: 'Create First Shift',
                  onClick: handleOpenCreateShift,
                }}
              />
            ) : (
              <Card>
                <Table>
                  <thead>
                    <tr>
                      <th>Shift Name & Code</th>
                      <th>Timings</th>
                      <th>Working Days</th>
                      <th>Breaks / Grace</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map((shift) => (
                      <tr key={shift.id}>
                        <td>
                          <Stack gap="xs">
                            <Inline gap="xs" align="center">
                              <span className="font-semibold text-slate-900">{shift.name}</span>
                              <Badge variant="neutral">{shift.code}</Badge>
                            </Inline>
                            {shift.description && (
                              <span className="text-xs text-slate-500">{shift.description}</span>
                            )}
                          </Stack>
                        </td>
                        <td>
                          <span className="font-medium">
                            {shift.startTime} – {shift.endTime}
                          </span>
                        </td>
                        <td>
                          <Inline gap="xs" wrap>
                            {(shift.workingDays ?? []).map((day) => (
                              <Badge key={day} variant="neutral" size="sm">
                                {day.slice(0, 3)}
                              </Badge>
                            ))}
                          </Inline>
                        </td>
                        <td>
                          <span className="text-xs text-slate-600">
                            Break: {shift.breakMinutes}m | Grace: {shift.graceMinutes}m
                          </span>
                        </td>
                        <td>
                          {shift.isOvernight ? (
                            <Badge variant="info">Overnight</Badge>
                          ) : (
                            <Badge variant="neutral">Day Shift</Badge>
                          )}
                        </td>
                        <td>
                          <Inline gap="xs" align="center">
                            <Switch
                              checked={shift.isActive}
                              onChange={() => void handleToggleShiftStatus(shift)}
                            />
                            <span className="text-xs text-slate-600">
                              {shift.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </Inline>
                        </td>
                        <td>
                          <Inline gap="xs">
                            <Button size="sm" variant="secondary" onClick={() => handleOpenEditShift(shift)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => void handleDeleteShift(shift)}>
                              Delete
                            </Button>
                          </Inline>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </Stack>
        )}

        {/* TAB 2: SHIFT ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <Stack gap="md">
            <Toolbar>
              <Inline gap="sm" align="center" justify="between" className="w-full">
                <Inline gap="sm" align="center">
                  <Input
                    placeholder="Search by target or shift…"
                    value={asgnSearch}
                    onChange={(e) => setAsgnSearch(e.target.value)}
                  />
                  <Select
                    value={asgnScopeFilter}
                    onChange={(e) => setAsgnScopeFilter(e.target.value)}
                  >
                    <option value="all">All Scopes</option>
                    <option value="employee">Employee Specific</option>
                    <option value="department">Department Level</option>
                    <option value="location">Work Location Level</option>
                  </Select>
                </Inline>
                <Button variant="secondary" onClick={() => void loadAssignments()}>
                  Refresh
                </Button>
              </Inline>
            </Toolbar>

            {assignmentsLoading ? (
              <LoadingState label="Loading shift assignments…" />
            ) : assignmentsError ? (
              <Alert variant="danger">
                <Inline justify="between" align="center">
                  <span>{assignmentsError}</span>
                  <Button size="sm" variant="secondary" onClick={() => void loadAssignments()}>
                    Retry
                  </Button>
                </Inline>
              </Alert>
            ) : filteredAssignments.length === 0 ? (
              <EmptyState
                title="No shift assignments found"
                description="Assign shifts to individual employees, departments, or entire work locations with effective date periods."
                primaryAction={{
                  label: 'Assign First Shift',
                  onClick: handleOpenAssignModal,
                }}
              />
            ) : (
              <Card>
                <Table>
                  <thead>
                    <tr>
                      <th>Target & Scope</th>
                      <th>Assigned Shift</th>
                      <th>Timings</th>
                      <th>Effective Period</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((asgn) => (
                      <tr key={asgn.id}>
                        <td>
                          <Stack gap="xs">
                            <Inline gap="xs" align="center">
                              <span className="font-semibold text-slate-900">{asgn.targetName}</span>
                              {asgn.targetCode && (
                                <Badge variant="neutral">{asgn.targetCode}</Badge>
                              )}
                            </Inline>
                            <Badge
                              variant={
                                asgn.assignmentScope === 'employee'
                                  ? 'info'
                                  : asgn.assignmentScope === 'department'
                                    ? 'neutral'
                                    : 'warning'
                              }
                              size="sm"
                            >
                              {asgn.assignmentScope.toUpperCase()}
                            </Badge>
                          </Stack>
                        </td>
                        <td>
                          <Stack gap="xs">
                            <span className="font-medium text-slate-800">{asgn.shiftName}</span>
                            <span className="text-xs text-slate-500">{asgn.shiftCode}</span>
                          </Stack>
                        </td>
                        <td>
                          <Inline gap="xs" align="center">
                            <span>
                              {asgn.shiftStartTime} – {asgn.shiftEndTime}
                            </span>
                            {asgn.shiftIsOvernight && <Badge variant="info" size="sm">+1d</Badge>}
                          </Inline>
                        </td>
                        <td>
                          <span className="text-xs text-slate-700">
                            {asgn.effectiveStartDate} ➔ {asgn.effectiveEndDate || 'Indefinite'}
                          </span>
                        </td>
                        <td>
                          {asgn.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Expired</Badge>
                          )}
                        </td>
                        <td>
                          <Inline gap="xs">
                            {asgn.isActive && !asgn.effectiveEndDate && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEndingAsgnId(asgn.id);
                                  setEndAsgnDate(new Date().toISOString().slice(0, 10));
                                }}
                              >
                                End
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void handleDeleteAssignment(asgn)}
                            >
                              Delete
                            </Button>
                          </Inline>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </Stack>
        )}
      </Stack>

      {/* MODAL: CREATE / EDIT SHIFT */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title={editingShiftId ? 'Edit Shift Template' : 'Create New Shift Template'}
      >
        <Stack gap="md">
          {shiftModalError && <Alert variant="danger">{shiftModalError}</Alert>}

          <Grid columns={2} gap="sm">
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Shift Name *</label>
              <Input
                placeholder="e.g. Morning Shift"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
              />
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Shift Code *</label>
              <Input
                placeholder="e.g. MOR-06"
                value={shiftCode}
                onChange={(e) => setShiftCode(e.target.value)}
              />
            </Stack>
          </Grid>

          <Grid columns={2} gap="sm">
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Start Time (HH:mm) *</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">End Time (HH:mm) *</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Stack>
          </Grid>

          <Grid columns={3} gap="sm">
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Break Allowance (min)</label>
              <Input
                type="number"
                value={String(breakMinutes)}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
              />
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Lunch Break (min)</label>
              <Input
                type="number"
                value={String(lunchMinutes)}
                onChange={(e) => setLunchMinutes(Number(e.target.value))}
              />
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Grace Period (min)</label>
              <Input
                type="number"
                value={String(graceMinutes)}
                onChange={(e) => setGraceMinutes(Number(e.target.value))}
              />
            </Stack>
          </Grid>

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Working Days</label>
            <Inline gap="sm" wrap>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = workingDays.includes(day);
                return (
                  <Checkbox
                    key={day}
                    label={day.slice(0, 3)}
                    checked={isSelected}
                    onChange={(checked) => {
                      if (checked) {
                        setWorkingDays([...workingDays, day]);
                      } else {
                        setWorkingDays(workingDays.filter((d) => d !== day));
                      }
                    }}
                  />
                );
              })}
            </Inline>
          </Stack>

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <Input
              placeholder="e.g. Standard morning operations shift"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>

          <Inline gap="xs" align="center">
            <Switch checked={isShiftActive} onChange={() => setIsShiftActive(!isShiftActive)} />
            <span className="text-xs text-slate-700">Shift is active and available for assignment</span>
          </Inline>

          <Divider />

          <Inline justify="end" gap="sm">
            <Button variant="secondary" onClick={() => setIsShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveShift()} disabled={shiftModalSaving}>
              {shiftModalSaving ? 'Saving…' : 'Save Shift'}
            </Button>
          </Inline>
        </Stack>
      </Modal>

      {/* MODAL: ASSIGN SHIFT */}
      <Modal
        isOpen={isAsgnModalOpen}
        onClose={() => setIsAsgnModalOpen(false)}
        title="Assign Work Shift"
      >
        <Stack gap="md">
          {asgnModalError && <Alert variant="danger">{asgnModalError}</Alert>}

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Select Shift *</label>
            <Select value={asgnShiftId} onChange={(e) => setAsgnShiftId(e.target.value)}>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — {s.startTime} to {s.endTime}
                </option>
              ))}
            </Select>
          </Stack>

          <Grid columns={2} gap="sm">
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Assignment Scope *</label>
              <Select
                value={asgnScope}
                onChange={(e) => setAsgnScope(e.target.value as any)}
              >
                <option value="employee">Individual Employee</option>
                <option value="department">Department</option>
                <option value="location">Work Location</option>
              </Select>
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">
                {asgnScope === 'employee'
                  ? 'Employee ID *'
                  : asgnScope === 'department'
                    ? 'Department ID *'
                    : 'Location ID *'}
              </label>
              <Input
                placeholder={
                  asgnScope === 'employee'
                    ? 'e.g. emp_1001'
                    : asgnScope === 'department'
                      ? 'e.g. dept_eng'
                      : 'e.g. loc_blr'
                }
                value={asgnTargetId}
                onChange={(e) => setAsgnTargetId(e.target.value)}
              />
            </Stack>
          </Grid>

          <Grid columns={2} gap="sm">
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Effective Start Date *</label>
              <Input
                type="date"
                value={asgnStartDate}
                onChange={(e) => setAsgnStartDate(e.target.value)}
              />
            </Stack>
            <Stack gap="xs">
              <label className="text-xs font-semibold text-slate-700">Effective End Date (Optional)</label>
              <Input
                type="date"
                value={asgnEndDate}
                onChange={(e) => setAsgnEndDate(e.target.value)}
              />
            </Stack>
          </Grid>

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Notes / Reason</label>
            <Input
              placeholder="e.g. Assigned for Q4 Project Roster"
              value={asgnNotes}
              onChange={(e) => setAsgnNotes(e.target.value)}
            />
          </Stack>

          <Divider />

          <Inline justify="end" gap="sm">
            <Button variant="secondary" onClick={() => setIsAsgnModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveAssignment()} disabled={asgnModalSaving}>
              {asgnModalSaving ? 'Saving…' : 'Create Assignment'}
            </Button>
          </Inline>
        </Stack>
      </Modal>

      {/* MODAL: END ASSIGNMENT */}
      <Modal
        isOpen={Boolean(endingAsgnId)}
        onClose={() => setEndingAsgnId(null)}
        title="End Shift Assignment"
      >
        <Stack gap="md">
          <p className="text-sm text-slate-600">
            Specify the effective end date for this shift assignment. Historical attendance prior to
            this date will not be modified.
          </p>

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Effective End Date *</label>
            <Input
              type="date"
              value={endAsgnDate}
              onChange={(e) => setEndAsgnDate(e.target.value)}
            />
          </Stack>

          <Stack gap="xs">
            <label className="text-xs font-semibold text-slate-700">Notes</label>
            <Input
              placeholder="e.g. Schedule ended due to department transfer"
              value={endAsgnNotes}
              onChange={(e) => setEndAsgnNotes(e.target.value)}
            />
          </Stack>

          <Divider />

          <Inline justify="end" gap="sm">
            <Button variant="secondary" onClick={() => setEndingAsgnId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmEndAssignment()}
              disabled={endAsgnSaving}
            >
              {endAsgnSaving ? 'Ending…' : 'Confirm End Assignment'}
            </Button>
          </Inline>
        </Stack>
      </Modal>
    </Page>
  );
}

export default ShiftsPage;
