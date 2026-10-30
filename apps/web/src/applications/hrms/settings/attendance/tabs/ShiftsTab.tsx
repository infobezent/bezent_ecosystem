import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
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
  Modal,
  Divider,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchShiftRosterSettings,
  updateShiftRosterSettings,
  createCompanyShift,
  updateCompanyShift,
  deleteCompanyShift,
} from '../../../attendance/api/attendanceApi';
import type {
  CompanyShiftTemplate,
  ShiftRosterSettings,
} from '../../../attendance/types/attendance.types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MATCHING_WINDOW_OPTIONS = [
  { value: '15', label: '± 15 Minutes' },
  { value: '30', label: '± 30 Minutes' },
  { value: '45', label: '± 45 Minutes' },
  { value: '60', label: '± 60 Minutes (Standard)' },
  { value: '90', label: '± 90 Minutes' },
  { value: '120', label: '± 120 Minutes' },
];

export function ShiftsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Shift Settings State
  const [shifts, setShifts] = useState<CompanyShiftTemplate[]>([]);
  const [autoAllocationEnabled, setAutoAllocationEnabled] = useState(true);
  const [matchingWindowMinutes, setMatchingWindowMinutes] = useState(60);
  const [fallbackShiftId, setFallbackShiftId] = useState('shift_gen_std');
  const [allowOvernightSpanning, setAllowOvernightSpanning] = useState(true);

  // Shift Swap Rules
  const [allowSwapRequests, setAllowSwapRequests] = useState(true);
  const [swapCutoffHours, setSwapCutoffHours] = useState(24);
  const [requireManagerApproval, setRequireManagerApproval] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isOvernight, setIsOvernight] = useState(false);
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
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  // Delete Confirmation State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ShiftRosterSettings = await fetchShiftRosterSettings();
      setShifts(data.shifts ?? []);
      setAutoAllocationEnabled(data.autoShiftAllocation?.enabled ?? true);
      setMatchingWindowMinutes(data.autoShiftAllocation?.matchingWindowMinutes ?? 60);
      setFallbackShiftId(data.autoShiftAllocation?.fallbackShiftId ?? 'shift_gen_std');
      setAllowOvernightSpanning(data.autoShiftAllocation?.allowOvernightSpanning ?? true);

      setAllowSwapRequests(data.shiftSwapRules?.allowEmployeeRequests ?? true);
      setSwapCutoffHours(data.shiftSwapRules?.cutoffHours ?? 24);
      setRequireManagerApproval(data.shiftSwapRules?.requireManagerApproval ?? true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load shift settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleOpenCreateModal = () => {
    setEditingShiftId(null);
    setShiftName('');
    setShiftCode('');
    setStartTime('09:00');
    setEndTime('18:00');
    setIsOvernight(false);
    setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setBreakMinutes(60);
    setLunchMinutes(30);
    setGraceMinutes(15);
    setIsActive(true);
    setDescription('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: CompanyShiftTemplate) => {
    setEditingShiftId(shift.id);
    setShiftName(shift.name);
    setShiftCode(shift.code);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setIsOvernight(shift.isOvernight);
    setWorkingDays(shift.workingDays);
    setBreakMinutes(shift.breakMinutes);
    setLunchMinutes(shift.lunchMinutes);
    setGraceMinutes(shift.graceMinutes);
    setIsActive(shift.isActive);
    setDescription(shift.description ?? '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!shiftName.trim()) {
      setModalError('Shift name is required');
      return;
    }
    if (!shiftCode.trim()) {
      setModalError('Shift code is required');
      return;
    }
    if (!startTime || !endTime) {
      setModalError('Start and end times are required');
      return;
    }
    if (workingDays.length === 0) {
      setModalError('Select at least one working day');
      return;
    }

    setModalSaving(true);
    setModalError(null);
    try {
      if (editingShiftId) {
        await updateCompanyShift(editingShiftId, {
          name: shiftName.trim(),
          code: shiftCode.trim().toUpperCase(),
          startTime,
          endTime,
          isOvernight,
          workingDays,
          breakMinutes: Number(breakMinutes),
          lunchMinutes: Number(lunchMinutes),
          graceMinutes: Number(graceMinutes),
          isActive,
          description: description.trim(),
        });
        setSuccess(`Shift '${shiftName}' updated successfully`);
      } else {
        await createCompanyShift({
          name: shiftName.trim(),
          code: shiftCode.trim().toUpperCase(),
          startTime,
          endTime,
          isOvernight,
          workingDays,
          breakMinutes: Number(breakMinutes),
          lunchMinutes: Number(lunchMinutes),
          graceMinutes: Number(graceMinutes),
          isActive,
          description: description.trim(),
        });
        setSuccess(`Shift '${shiftName}' created successfully`);
      }
      setIsModalOpen(false);
      await loadSettings();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save shift');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteCompanyShift(deleteTargetId);
      setSuccess('Shift template deleted successfully');
      setDeleteTargetId(null);
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete shift');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveGlobalRosterRules = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateShiftRosterSettings({
        shifts,
        autoShiftAllocation: {
          enabled: autoAllocationEnabled,
          matchingWindowMinutes: Number(matchingWindowMinutes),
          fallbackShiftId,
          allowOvernightSpanning,
        },
        shiftSwapRules: {
          allowEmployeeRequests: allowSwapRequests,
          cutoffHours: Number(swapCutoffHours),
          requireManagerApproval,
        },
      });
      setSuccess('Shift allocation and roster rules updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save roster rules');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  if (loading) {
    return <LoadingState label="Loading company shift templates & roster settings..." />;
  }

  const activeCount = shifts.filter((s) => s.isActive).length;
  const overnightCount = shifts.filter((s) => s.isOvernight).length;
  const totalAssignedWorkforce = shifts.reduce(
    (acc, curr) => acc + (curr.assignedEmployeesCount ?? 0),
    0,
  );

  return (
    <Stack gap="lg">
      {/* Alert Banners */}
      {error && (
        <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Header & Quick Action */}
      <Card>
        <Inline justify="between" align="center">
          <Stack gap="xs">
            <h2 className="bezent-heading-md">Company Shifts & Rosters</h2>
            <p className="bezent-text-secondary">
              Configure company shift catalogs, working day schedules, break allowances, and
              auto-shift allocation automation.
            </p>
          </Stack>
          <Button variant="primary" onClick={handleOpenCreateModal}>
            <Inline gap="xs" align="center">
              <BezentIcon name="plus" size={14} />
              <span>Create New Shift</span>
            </Inline>
          </Button>
        </Inline>
      </Card>

      {/* Metrics Row */}
      <Grid columns={4} gap="md">
        <Card>
          <Stack gap="xs">
            <span className="bezent-text-secondary">Total Defined Shifts</span>
            <span className="bezent-heading-lg">{shifts.length}</span>
            <Badge variant="neutral">Shift Templates</Badge>
          </Stack>
        </Card>
        <Card>
          <Stack gap="xs">
            <span className="bezent-text-secondary">Active Shifts</span>
            <span className="bezent-heading-lg">{activeCount}</span>
            <Badge variant="success">Operational</Badge>
          </Stack>
        </Card>
        <Card>
          <Stack gap="xs">
            <span className="bezent-text-secondary">Auto-Assignment</span>
            <span className="bezent-heading-lg">{autoAllocationEnabled ? 'Active' : 'Manual'}</span>
            <Badge variant={autoAllocationEnabled ? 'info' : 'warning'}>
              {autoAllocationEnabled
                ? `±${matchingWindowMinutes}m window`
                : 'Fixed assignments only'}
            </Badge>
          </Stack>
        </Card>
        <Card>
          <Stack gap="xs">
            <span className="bezent-text-secondary">Assigned Workforce</span>
            <span className="bezent-heading-lg">{totalAssignedWorkforce}</span>
            <Badge variant="neutral">{overnightCount} Overnight shifts</Badge>
          </Stack>
        </Card>
      </Grid>

      {/* Shifts Catalog Table / Grid */}
      <Card>
        <CardHeader>
          <Inline justify="between" align="center">
            <CardTitle>Configured Shifts Catalog</CardTitle>
            <Badge variant="info">{shifts.length} Templates</Badge>
          </Inline>
        </CardHeader>
        <Stack gap="md">
          {shifts.length === 0 ? (
            <p className="bezent-text-secondary">
              No shifts configured yet. Click &quot;Create New Shift&quot; above to add your first
              company shift template.
            </p>
          ) : (
            shifts.map((shift) => (
              <Card key={shift.id}>
                <Inline justify="between" align="center">
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <span className="bezent-heading-sm">{shift.name}</span>
                      <Badge variant="neutral">{shift.code}</Badge>
                      {shift.isOvernight && <Badge variant="warning">Overnight (+1 Day)</Badge>}
                      <Badge variant={shift.isActive ? 'success' : 'danger'}>
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Inline>
                    <Inline gap="md" align="center">
                      <span className="bezent-text-primary">
                        <strong>Timings:</strong> {shift.startTime} – {shift.endTime}
                      </span>
                      <span className="bezent-text-secondary">
                        <strong>Break:</strong> {shift.breakMinutes}m (incl. {shift.lunchMinutes}m
                        lunch)
                      </span>
                      <span className="bezent-text-secondary">
                        <strong>Grace:</strong> {shift.graceMinutes}m
                      </span>
                      <span className="bezent-text-secondary">
                        <strong>Assigned:</strong> {shift.assignedEmployeesCount ?? 0} employees
                      </span>
                    </Inline>
                    <Inline gap="xs" align="center">
                      <span className="bezent-text-secondary">Working Days:</span>
                      {shift.workingDays.map((day) => (
                        <Badge key={day} variant="neutral">
                          {day.slice(0, 3)}
                        </Badge>
                      ))}
                    </Inline>
                    {shift.description && (
                      <p className="bezent-text-secondary">{shift.description}</p>
                    )}
                  </Stack>

                  <Inline gap="sm">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(shift)}>
                      <Inline gap="xs" align="center">
                        <BezentIcon name="edit" size={14} />
                        <span>Edit</span>
                      </Inline>
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTargetId(shift.id)}>
                      <Inline gap="xs" align="center">
                        <BezentIcon name="trash" size={14} />
                        <span>Delete</span>
                      </Inline>
                    </Button>
                  </Inline>
                </Inline>
              </Card>
            ))
          )}
        </Stack>
      </Card>

      {/* Auto-Shift Allocation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Shift Assignment & Allocation Rules</CardTitle>
        </CardHeader>
        <Stack gap="md">
          <SettingsRow
            label="Enable Dynamic Auto-Shift Allocation"
            info="Automatically matches punches against company shifts based on punch-in timestamp without requiring static manual scheduling."
            control={
              <Switch
                checked={autoAllocationEnabled}
                onChange={(e) => setAutoAllocationEnabled(e.target.checked)}
              />
            }
          />
          <Divider />

          <SettingsRow
            label="Punch-In Matching Window"
            info="How close an employee's check-in punch must be to a shift's scheduled start time to be auto-assigned."
            control={
              <Select
                value={String(matchingWindowMinutes)}
                onChange={(e) => setMatchingWindowMinutes(Number(e.target.value))}
                options={MATCHING_WINDOW_OPTIONS}
              />
            }
          />
          <Divider />

          <SettingsRow
            label="Default Fallback Shift"
            info="The baseline shift assigned when an employee's punch does not match any shift window."
            control={
              <Select
                value={fallbackShiftId}
                onChange={(e) => setFallbackShiftId(e.target.value)}
                options={shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              />
            }
          />
          <Divider />

          <SettingsRow
            label="Allow Overnight Spanning Shifts"
            info="Permit shifts that begin in the evening and cross midnight into the subsequent day boundary."
            control={
              <Switch
                checked={allowOvernightSpanning}
                onChange={(e) => setAllowOvernightSpanning(e.target.checked)}
              />
            }
          />
        </Stack>
      </Card>

      {/* Shift Swap & Request Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Swap & Roster Change Policy</CardTitle>
        </CardHeader>
        <Stack gap="md">
          <SettingsRow
            label="Allow Employee Shift Swap Requests"
            info="Permits employees to request swapping shifts with a colleague or requesting a shift reassignment via Self-Service."
            control={
              <Switch
                checked={allowSwapRequests}
                onChange={(e) => setAllowSwapRequests(e.target.checked)}
              />
            }
          />
          <Divider />

          <SettingsRow
            label="Advance Notice Cutoff (Hours)"
            info="Minimum number of hours prior to shift commencement that a swap request must be submitted."
            control={
              <Input
                type="number"
                min={1}
                max={168}
                value={String(swapCutoffHours)}
                onChange={(e) => setSwapCutoffHours(Number(e.target.value))}
              />
            }
          />
          <Divider />

          <SettingsRow
            label="Require Manager Approval"
            info="Whether the reporting manager must approve the swap request before roster changes become active."
            control={
              <Switch
                checked={requireManagerApproval}
                onChange={(e) => setRequireManagerApproval(e.target.checked)}
              />
            }
          />
        </Stack>
      </Card>

      {/* Global Save Button */}
      <Inline justify="end">
        <Button variant="primary" onClick={handleSaveGlobalRosterRules} loading={saving}>
          <Inline gap="xs" align="center">
            <BezentIcon name="check" size={16} />
            <span>Save Shift & Roster Settings</span>
          </Inline>
        </Button>
      </Inline>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingShiftId ? 'Edit Shift Template' : 'Create New Shift Template'}
        >
          <Stack gap="md">
            {modalError && (
              <Alert variant="danger" dismissible onDismiss={() => setModalError(null)}>
                {modalError}
              </Alert>
            )}

            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span className="bezent-label">Shift Name *</span>
                <Input
                  placeholder="e.g. Morning Shift"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                />
              </Stack>
              <Stack gap="xs">
                <span className="bezent-label">Shift Code *</span>
                <Input
                  placeholder="e.g. MOR-06"
                  value={shiftCode}
                  onChange={(e) => setShiftCode(e.target.value)}
                />
              </Stack>
            </Grid>

            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span className="bezent-label">Start Time (24h) *</span>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Stack>
              <Stack gap="xs">
                <span className="bezent-label">End Time (24h) *</span>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Stack>
            </Grid>

            <Inline align="center" gap="md">
              <Switch checked={isOvernight} onChange={(e) => setIsOvernight(e.target.checked)} />
              <Stack gap="none">
                <span className="bezent-label">Crosses Midnight (Overnight Shift)</span>
                <span className="bezent-text-secondary">
                  Check if this shift ends on the next calendar day.
                </span>
              </Stack>
            </Inline>

            <Stack gap="xs">
              <span className="bezent-label">Working Days *</span>
              <Grid columns={4} gap="sm">
                {DAYS_OF_WEEK.map((day) => (
                  <Inline key={day} gap="xs" align="center">
                    <Checkbox
                      checked={workingDays.includes(day)}
                      onChange={() => toggleWorkingDay(day)}
                    />
                    <span className="bezent-text-primary">{day.slice(0, 3)}</span>
                  </Inline>
                ))}
              </Grid>
            </Stack>

            <Grid columns={3} gap="md">
              <Stack gap="xs">
                <span className="bezent-label">Total Break (Mins)</span>
                <Input
                  type="number"
                  min={0}
                  max={240}
                  value={String(breakMinutes)}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                />
              </Stack>
              <Stack gap="xs">
                <span className="bezent-label">Lunch Break (Mins)</span>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={String(lunchMinutes)}
                  onChange={(e) => setLunchMinutes(Number(e.target.value))}
                />
              </Stack>
              <Stack gap="xs">
                <span className="bezent-label">Grace Period (Mins)</span>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={String(graceMinutes)}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                />
              </Stack>
            </Grid>

            <Inline align="center" gap="md">
              <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="bezent-label">Shift Template Active</span>
            </Inline>

            <Stack gap="xs">
              <span className="bezent-label">Description / Operational Notes</span>
              <Input
                placeholder="Optional shift notes or operational details"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Stack>

            <Inline justify="end" gap="sm">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveModal} loading={modalSaving}>
                {editingShiftId ? 'Update Shift' : 'Create Shift'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <Modal
          isOpen={Boolean(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          title="Delete Shift Template"
        >
          <Stack gap="md">
            <p className="bezent-text-primary">
              Are you sure you want to delete this shift template? Employees currently assigned to
              this shift may need manual reassignment.
            </p>
            <Inline justify="end" gap="sm">
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteShift} loading={deleting}>
                Confirm Delete
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
