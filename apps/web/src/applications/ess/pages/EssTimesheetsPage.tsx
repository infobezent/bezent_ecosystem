import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Stack,
  Inline,
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
  EmptyState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssTimesheet } from '../api/essApi';

export function EssTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<EssTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Log form state
  const [date, setDate] = useState('');
  const [projectName, setProjectName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [hours, setHours] = useState('');

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
      await essApi.logTimesheet({ date, projectName, taskDescription, hours: Number(hours) });
      setSuccessMsg('Timesheet entry logged successfully.');
      setLogOpen(false);
      setDate('');
      setProjectName('');
      setTaskDescription('');
      setHours('');
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

  const draftCount = timesheets.filter((t) => t.status === 'draft').length;

  if (loading) return <LoadingState label="Loading timesheets..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  return (
    <Page>
      <PageHeader
        title="Timesheets"
        subtitle="Log work hours by project and submit for approval"
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

      <Section title="Time Log">
        {timesheets.length === 0 ? (
          <EmptyState
            title="No Time Entries"
            description="Log your first timesheet entry to begin tracking work hours."
            primaryAction={{ label: 'Log Hours', onClick: () => setLogOpen(true) }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Project</TableHeaderCell>
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Hours</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((ts) => (
                <TableRow key={ts.id}>
                  <TableCell>{ts.date}</TableCell>
                  <TableCell>{ts.projectName}</TableCell>
                  <TableCell>{ts.taskDescription}</TableCell>
                  <TableCell>{ts.hours}h</TableCell>
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
        )}
      </Section>

      {/* Log Hours Modal */}
      <Modal
        isOpen={logOpen}
        title="Log Work Hours"
        onClose={() => setLogOpen(false)}
        footer={
          <Inline gap="sm">
            <Button id="log-cancel" variant="secondary" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button id="log-submit" variant="primary" onClick={handleLogHours} loading={logLoading}>
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
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                Project Name
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., BEZENT Core Platform"
                />
              </label>
              <label>
                Task Description
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="What did you work on?"
                />
              </label>
              <label>
                Hours (1–24)
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g., 8"
                />
              </label>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}
