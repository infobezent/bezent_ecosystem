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
import { essApi, type EssTimesheet } from '../api/essApi';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Timesheets' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted (Pending Review)' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function EssTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<EssTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('all');

  // Log form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [projectName, setProjectName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [hours, setHours] = useState('8');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getTimesheets();
      setTimesheets(data.timesheets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogHours = async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const numHours = Number(hours);
      if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
        throw new Error('Please enter valid hours between 1 and 24');
      }
      await essApi.logTimesheet({ date, projectName, taskDescription, hours: numHours });
      setSuccessMsg('Timesheet entry logged successfully as draft.');
      setLogOpen(false);
      setProjectName('');
      setTaskDescription('');
      setHours('8');
      await load();
    } catch (err: unknown) {
      setLogError(err instanceof Error ? err.message : 'Failed to log timesheet');
    } finally {
      setLogLoading(false);
    }
  };

  const handleSubmitAll = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      const result = await essApi.submitTimesheets();
      setSuccessMsg(`${result.submittedCount} timesheet draft(s) submitted for approval.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit timesheets');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Metrics
  const totalHoursLogged = useMemo(
    () => timesheets.reduce((acc, t) => acc + (Number(t.hours) || 0), 0),
    [timesheets],
  );

  const draftCount = useMemo(
    () => timesheets.filter((t) => t.status === 'draft').length,
    [timesheets],
  );

  const submittedCount = useMemo(
    () => timesheets.filter((t) => t.status === 'submitted').length,
    [timesheets],
  );

  const approvedCount = useMemo(
    () => timesheets.filter((t) => t.status === 'approved').length,
    [timesheets],
  );

  // Filtered List
  const filteredTimesheets = useMemo(() => {
    if (statusFilter === 'all') return timesheets;
    return timesheets.filter((t) => t.status === statusFilter);
  }, [timesheets, statusFilter]);

  if (loading) return <LoadingState label="Loading timesheets..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  const weeklyTarget = 40;
  const progressPct = Math.min(100, Math.round((totalHoursLogged / weeklyTarget) * 100));

  return (
    <Page>
      <PageHeader
        title="Timesheets"
        subtitle="Log project work hours, track approval status, and submit weekly timesheets"
        actions={
          <Inline gap="sm">
            {draftCount > 0 && (
              <Button
                id="ess-submit-timesheets-btn"
                variant="secondary"
                onClick={handleSubmitAll}
                loading={submitLoading}
              >{`Submit All Drafts (${draftCount})`}</Button>
            )}
            <Button
              id="ess-log-hours-btn"
              variant="primary"
              leftIcon={<BezentIcon name="timesheets" size={16} />}
              onClick={() => setLogOpen(true)}
            >
              Log Hours
            </Button>
          </Inline>
        }
      />

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {/* ── Summary & Progress ────────────────────────────────────── */}
      <Section title="Weekly Timesheet Overview">
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span>Total Hours Logged</span>
              <Inline gap="xs" align="baseline">
                <strong>{totalHoursLogged}h</strong>
                <span>/ {weeklyTarget}h target</span>
              </Inline>
              <ProgressBar
                value={totalHoursLogged}
                max={weeklyTarget}
                variant={progressPct >= 100 ? 'success' : 'primary'}
                size="sm"
              />
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Draft Entries</span>
              <strong>{draftCount}</strong>
              <span>Ready for submission</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Pending Review</span>
              <strong>{submittedCount}</strong>
              <span>Awaiting manager sign-off</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Approved Entries</span>
              <strong>{approvedCount}</strong>
              <span>Confirmed for payroll</span>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Timesheet Table ───────────────────────────────────────── */}
      <Section title="Time Log History">
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
              <span>
                Showing <strong>{filteredTimesheets.length}</strong> entry(ies)
              </span>
            }
          />

          {filteredTimesheets.length === 0 ? (
            <EmptyState
              title="No Time Entries Found"
              description={
                statusFilter === 'all'
                  ? 'Log your first timesheet entry to begin tracking work hours.'
                  : `No timesheets found with status "${statusFilter}".`
              }
              primaryAction={{ label: 'Log Hours', onClick: () => setLogOpen(true) }}
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTimesheets.map((ts) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      </Section>

      {/* ── Log Hours Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={logOpen}
        title="Log Work Hours"
        onClose={() => setLogOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button id="log-cancel" variant="secondary" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button
              id="log-submit"
              variant="primary"
              onClick={handleLogHours}
              loading={logLoading}
              disabled={!projectName.trim() || !taskDescription.trim()}
            >
              Log Hours
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {logError && (
            <Alert variant="error" title="Error">
              {logError}
            </Alert>
          )}
          <FormSection title="Entry Details">
            <FormGrid columns={1}>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="Project Name"
                placeholder="e.g., BEZENT Enterprise Suite, HRMS Core"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <Input
                label="Task Description"
                placeholder="Describe the tasks completed (e.g. API implementation, UI testing)..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
              <Input
                label="Hours (1–24)"
                type="number"
                min={1}
                max={24}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}
