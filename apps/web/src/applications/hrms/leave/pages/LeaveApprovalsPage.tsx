import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardDescription,
  Checkbox,
  EmptyState,
  Inline,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuthorization } from '../../../../platform/auth';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { ApprovalQueueItem, ApprovalStats } from '../types/leaveOperations.types';
import {
  formatDays,
  formatRange,
  initialsOf,
  sessionLabel,
  slaLabel,
} from '../components/leaveDisplay';
import { LeaveRequestDrawer } from '../components/LeaveRequestDrawer';

type Scope = 'mine' | 'all';

export interface LeaveApprovalsPageProps {
  initialQueue?: ApprovalQueueItem[];
  initialStats?: ApprovalStats;
}

export function LeaveApprovalsPage({ initialQueue, initialStats }: LeaveApprovalsPageProps = {}) {
  const { canAny } = useAuthorization();
  // Mirrors the API: only HR administrators may view every pending approval.
  const canSeeAll = canAny(['hrms.leave.settings_manage', 'hrms.leave.settings.manage']);
  const [scope, setScope] = useState<Scope>('mine');
  const [queue, setQueue] = useState<ApprovalQueueItem[]>(initialQueue ?? []);
  const [stats, setStats] = useState<ApprovalStats | null>(initialStats ?? null);
  const [loading, setLoading] = useState(!initialQueue);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<ApprovalQueueItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [openRequest, setOpenRequest] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, s] = await Promise.all([
        leaveOperationsApi.queue(scope),
        leaveOperationsApi.approvalStats(),
      ]);
      setQueue(q);
      setStats(s);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (!initialQueue) void load();
  }, [initialQueue, load]);

  const approve = async (item: ApprovalQueueItem) => {
    setBusy(true);
    setError(null);
    try {
      await leaveOperationsApi.approve(item.approvalId);
      setSuccess(`Approved ${item.employeeName}'s ${item.leaveTypeName}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setBusy(false);
    }
  };

  const bulkApprove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await leaveOperationsApi.bulkApprove([...selected]);
      const failed = res.results.filter((r) => !r.ok);
      setSuccess(`Approved ${res.approved} request(s).`);
      if (failed.length) setError(`${failed.length} could not be approved: ${failed[0]!.error}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    setError(null);
    try {
      await leaveOperationsApi.reject(rejecting.approvalId, rejectComment.trim());
      setSuccess(`Rejected ${rejecting.employeeName}'s ${rejecting.leaveTypeName}.`);
      setRejecting(null);
      setRejectComment('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = queue.length > 0 && selected.size === queue.length;

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Leave Approvals"
        subtitle="Requests and cancellations awaiting a decision, with their approval SLA"
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              leftIcon={<BezentIcon name="sync" size={16} />}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              leftIcon={<BezentIcon name="check" size={16} />}
              disabled={selected.size === 0 || busy}
              onClick={() => void bulkApprove()}
            >
              Approve Selected{selected.size ? ` (${selected.size})` : ''}
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {success && (
          <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {stats && (
          <LeaveStatGrid
            stats={[
              {
                label: 'Awaiting Me',
                value: stats.awaitingMe,
                caption: 'Assigned To You',
                tone: 'blue',
              },
              {
                label: 'Overdue',
                value: stats.overdue,
                caption: stats.overdue > 0 ? 'Past SLA' : 'On Track',
                tone: stats.overdue > 0 ? 'red' : 'green',
              },
              {
                label: 'Cancellations',
                value: stats.cancellations,
                caption: 'Cancel Requests',
                tone: 'purple',
              },
              {
                label: 'Approved (24h)',
                value: stats.approvedToday,
                caption: 'Decisions',
                tone: 'green',
              },
            ]}
          />
        )}

        {canSeeAll && (
          <Tabs
            variant="pills"
            activeId={scope}
            onChange={(id) => setScope(id as Scope)}
            items={[
              { id: 'mine', label: 'Assigned to me' },
              { id: 'all', label: 'All pending' },
            ]}
          />
        )}

        <Card padding="none">
          {loading && queue.length === 0 ? (
            <LoadingState label="Loading approvals..." />
          ) : queue.length === 0 ? (
            <EmptyState
              title="You're all caught up"
              description={
                scope === 'mine'
                  ? 'No leave request is waiting for your decision.'
                  : 'No leave request is pending approval.'
              }
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <Checkbox
                      aria-label="Select all"
                      checked={allSelected}
                      indeterminate={selected.size > 0 && !allSelected}
                      onChange={() =>
                        setSelected(
                          allSelected ? new Set() : new Set(queue.map((q) => q.approvalId)),
                        )
                      }
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Leave</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell>Stage</TableHeaderCell>
                  <TableHeaderCell>SLA</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.map((item) => {
                  const sla = slaLabel(item.slaDueAt, item.slaBreachedAt);
                  return (
                    <TableRow key={item.approvalId}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${item.employeeName}`}
                          checked={selected.has(item.approvalId)}
                          onChange={() => toggle(item.approvalId)}
                        />
                      </TableCell>
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <Avatar initials={initialsOf(item.employeeName)} size="sm" />
                          <Stack gap="none">
                            <strong>{item.employeeName}</strong>
                            <CardDescription>{item.employeeNumber}</CardDescription>
                          </Stack>
                        </Inline>
                      </TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <Inline gap="xs" align="center">
                            <span>{item.leaveTypeName}</span>
                            <Badge variant="neutral">{item.leaveTypeCode}</Badge>
                          </Inline>
                          <CardDescription>
                            {formatDays(item.totalDays)} · {sessionLabel(item.session)}
                          </CardDescription>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatRange(item.startDate, item.endDate)}</TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <span>
                            <Badge variant={item.purpose === 'cancellation' ? 'info' : 'neutral'}>
                              {item.purpose === 'cancellation' ? 'Cancellation' : 'Approval'}
                            </Badge>
                          </span>
                          <CardDescription>Level {item.level}</CardDescription>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sla.overdue ? 'danger' : 'success'}>{sla.text}</Badge>
                      </TableCell>
                      <TableCell>
                        <Inline gap="xs">
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => setOpenRequest(item.requestId)}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => setRejecting(item)}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => void approve(item)}
                          >
                            Approve
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </Stack>

      <Modal
        isOpen={rejecting !== null}
        onClose={() => setRejecting(null)}
        size="md"
        title="Reject leave"
        description={
          rejecting
            ? `${rejecting.employeeName} · ${rejecting.leaveTypeName} · ${formatRange(rejecting.startDate, rejecting.endDate)}`
            : undefined
        }
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="secondary" type="button" onClick={() => setRejecting(null)}>
              Back
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={busy || rejectComment.trim().length < 3}
              onClick={() => void confirmReject()}
            >
              Reject
            </Button>
          </Inline>
        }
      >
        <Textarea
          label="Reason for rejection"
          helperText="Shared with the employee."
          value={rejectComment}
          rows={3}
          maxLength={500}
          onChange={(e) => setRejectComment(e.target.value)}
        />
      </Modal>

      <LeaveRequestDrawer
        requestId={openRequest}
        onClose={() => setOpenRequest(null)}
        onChanged={() => void load()}
      />
    </Page>
  );
}

export default LeaveApprovalsPage;
