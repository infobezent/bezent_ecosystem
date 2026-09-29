import { useState, useEffect, useCallback } from 'react';
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
import { essApi, type EssLeaveBalanceItem, type EssLeaveRequest } from '../api/essApi';

type LeaveWorkspace = {
  balances: EssLeaveBalanceItem[];
  requests: EssLeaveRequest[];
  holidays: Array<{ name: string; date: string; dayOfWeek: string }>;
};

export function EssLeavePage() {
  const [workspace, setWorkspace] = useState<LeaveWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'casual' | 'unpaid'>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getLeave();
      setWorkspace(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApplyLeave = async () => {
    setApplyLoading(true);
    setApplyError(null);
    try {
      await essApi.applyLeave({ leaveType, startDate, endDate, reason });
      setSuccessMsg('Leave application submitted successfully.');
      setApplyOpen(false);
      setStartDate(''); setEndDate(''); setReason('');
      await load();
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Failed to apply for leave');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    setCancellingId(id);
    try {
      await essApi.cancelLeave(id);
      setSuccessMsg('Leave request cancelled.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel leave');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading leave workspace..." />;
  if (error) return <Alert variant="error" title="Error" description={error} />;
  if (!workspace) return null;

  const balanceColors: Record<string, 'green' | 'yellow' | 'blue' | 'grey'> = {
    annual: 'green', sick: 'yellow', casual: 'blue', unpaid: 'grey',
  };

  return (
    <Page>
      <PageHeader
        title="Leave"
        subtitle="Leave balances, requests and holiday calendar"
        actions={
          <Button
            id="ess-apply-leave-btn"
            variant="primary"
            label="Apply for Leave"
            leadingIcon={<BezentIcon name="leave" size={16} />}
            onClick={() => setApplyOpen(true)}
          />
        }
      />

      {successMsg && <Alert variant="success" title="Success" description={successMsg} />}

      {/* Leave Balances */}
      <Section title="Leave Balances" subtitle={`Year ${new Date().getFullYear()}`}>
        <Grid columns={4} gap="md">
          {workspace.balances.map((bal) => (
            <Card key={bal.leaveType}>
              <Stack gap="sm">
                <Badge variant={balanceColors[bal.leaveType] ?? 'grey'} label={capitalise(bal.leaveType)} />
                <Inline gap="sm" alignItems="baseline">
                  <span style={{ fontSize: '2rem', fontWeight: 700 }}>{bal.availableDays}</span>
                  <span>/ {bal.totalDays} days</span>
                </Inline>
                <Grid columns={2} gap="xs">
                  <span>Used: {bal.usedDays}</span>
                  <span>Pending: {bal.pendingDays}</span>
                </Grid>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Leave Requests */}
      <Section title="My Leave Requests">
        {workspace.requests.length === 0 ? (
          <EmptyState
            title="No Leave Requests"
            description="You have not applied for any leaves yet."
            primaryAction={{ label: 'Apply for Leave', onClick: () => setApplyOpen(true) }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>From</TableHeaderCell>
                <TableHeaderCell>To</TableHeaderCell>
                <TableHeaderCell>Days</TableHeaderCell>
                <TableHeaderCell>Reason</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspace.requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell><Badge variant={balanceColors[req.leaveType] ?? 'grey'} label={capitalise(req.leaveType)} /></TableCell>
                  <TableCell>{req.startDate}</TableCell>
                  <TableCell>{req.endDate}</TableCell>
                  <TableCell>{req.totalDays}</TableCell>
                  <TableCell>{req.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={req.status === 'approved' ? 'green' : req.status === 'rejected' ? 'red' : req.status === 'cancelled' ? 'grey' : 'yellow'}
                      label={capitalise(req.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Button
                        id={`cancel-leave-${req.id}`}
                        variant="ghost"
                        label="Cancel"
                        size="sm"
                        onClick={() => handleCancelLeave(req.id)}
                        loading={cancellingId === req.id}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Holiday Calendar */}
      <Section title="Holiday Calendar">
        <Grid columns={3} gap="sm">
          {workspace.holidays.map((h) => (
            <Card key={h.date}>
              <Inline gap="md" alignItems="center">
                <BezentIcon name="calendar" size={18} />
                <Stack gap="xs">
                  <span style={{ fontWeight: 600 }}>{h.name}</span>
                  <span>{h.date} · {h.dayOfWeek}</span>
                </Stack>
              </Inline>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyOpen}
        title="Apply for Leave"
        onClose={() => setApplyOpen(false)}
        footer={
          <Inline gap="sm">
            <Button id="leave-cancel" variant="secondary" label="Cancel" onClick={() => setApplyOpen(false)} />
            <Button id="leave-submit" variant="primary" label="Submit Application" onClick={handleApplyLeave} loading={applyLoading} />
          </Inline>
        }
      >
        <Stack gap="md">
          {applyError && <Alert variant="error" title="Error" description={applyError} />}
          <FormSection title="Leave Details">
            <FormGrid columns={1}>
              <label>
                Leave Type
                <select value={leaveType} onChange={e => setLeaveType(e.target.value as typeof leaveType)}>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </label>
              <Grid columns={2} gap="sm">
                <label>Start Date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
                <label>End Date<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
              </Grid>
              <label>
                Reason
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Provide reason for leave..." />
              </label>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
