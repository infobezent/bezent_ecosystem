import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Divider,
  Grid,
  Inline,
  LoadingState,
  Modal,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { LeaveRequestDetail } from '../types/leaveOperations.types';
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  formatDate,
  formatDateTime,
  formatDays,
  formatRange,
  initialsOf,
  sessionLabel,
} from './leaveDisplay';

export interface LeaveRequestDrawerProps {
  requestId: string | null;
  onClose: () => void;
  /** Called after the request changed (approved, rejected, cancelled). */
  onChanged?: () => void;
  canCancel?: boolean;
  /** Pre-loaded detail (tests / storybook); skips the fetch. */
  initialDetail?: LeaveRequestDetail;
}

const ACTION_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'neutral' | 'info' }
> = {
  pending: { label: 'Awaiting decision', variant: 'warning' },
  waiting: { label: 'Not reached yet', variant: 'neutral' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  escalated: { label: 'Escalated', variant: 'info' },
  skipped: { label: 'Skipped', variant: 'neutral' },
  cancelled: { label: 'Closed', variant: 'neutral' },
};

type Pending = 'approve' | 'reject' | 'cancel' | null;

export function LeaveRequestDrawer({
  requestId,
  onClose,
  onChanged,
  canCancel = false,
  initialDetail,
}: LeaveRequestDrawerProps) {
  const [detail, setDetail] = useState<LeaveRequestDetail | null>(initialDetail ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Pending>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await leaveOperationsApi.request(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave request');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMode(null);
    setComment('');
    if (requestId && !initialDetail) void load(requestId);
  }, [requestId, initialDetail, load]);

  const act = async () => {
    if (!detail || !mode) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'approve') {
        await leaveOperationsApi.approve(detail.myPendingApprovalId!, comment.trim() || undefined);
      } else if (mode === 'reject') {
        await leaveOperationsApi.reject(detail.myPendingApprovalId!, comment.trim());
      } else {
        await leaveOperationsApi.cancel(detail.id, comment.trim());
      }
      setMode(null);
      setComment('');
      onChanged?.();
      await load(detail.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const cancellable =
    canCancel && !!detail && (detail.status === 'pending' || detail.status === 'approved');
  const needsComment = mode === 'reject' || mode === 'cancel';

  const footer = detail ? (
    mode ? (
      <Inline justify="end" gap="sm">
        <Button variant="secondary" type="button" onClick={() => setMode(null)} disabled={busy}>
          Back
        </Button>
        <Button
          variant={mode === 'approve' ? 'primary' : 'danger'}
          type="button"
          onClick={() => void act()}
          disabled={busy || (needsComment && comment.trim().length < 3)}
        >
          {busy
            ? 'Saving...'
            : mode === 'approve'
              ? 'Confirm Approval'
              : mode === 'reject'
                ? 'Confirm Rejection'
                : 'Cancel Leave'}
        </Button>
      </Inline>
    ) : (
      <Inline justify="end" gap="sm">
        {cancellable && (
          <Button variant="secondary" type="button" onClick={() => setMode('cancel')}>
            Cancel Leave
          </Button>
        )}
        {detail.myPendingApprovalId && (
          <>
            <Button variant="danger" type="button" onClick={() => setMode('reject')}>
              Reject
            </Button>
            <Button variant="primary" type="button" onClick={() => setMode('approve')}>
              Approve
            </Button>
          </>
        )}
      </Inline>
    )
  ) : undefined;

  return (
    <Modal
      isOpen={requestId !== null}
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={
        detail ? `${detail.leaveType.name} · ${formatDays(detail.totalDays)}` : 'Leave Request'
      }
      description={detail ? formatRange(detail.startDate, detail.endDate) : undefined}
      footer={footer}
    >
      {loading && !detail ? (
        <LoadingState label="Loading leave request..." />
      ) : !detail ? (
        error && <Alert variant="error">{error}</Alert>
      ) : (
        <Stack gap="lg">
          {error && <Alert variant="error">{error}</Alert>}

          {mode && (
            <Card variant={mode === 'approve' ? 'tint-green' : 'tint-amber'} padding="md">
              <Textarea
                label={
                  mode === 'approve'
                    ? 'Comment (optional)'
                    : mode === 'reject'
                      ? 'Reason for rejection'
                      : 'Reason for cancellation'
                }
                value={comment}
                maxLength={500}
                rows={3}
                onChange={(e) => setComment(e.target.value)}
                helperText={
                  mode === 'cancel'
                    ? 'The employee is notified and any reserved or used days are returned.'
                    : undefined
                }
              />
            </Card>
          )}

          {/* Employee & status */}
          <Card variant="flat" padding="md">
            <Inline justify="between" align="center">
              <Inline gap="md" align="center">
                <Avatar initials={initialsOf(detail.employee.name)} size="md" />
                <Stack gap="none">
                  <CardTitle>{detail.employee.name}</CardTitle>
                  <CardDescription>
                    {detail.employee.employeeNumber}
                    {detail.employee.departmentName ? ` · ${detail.employee.departmentName}` : ''}
                    {detail.employee.locationName ? ` · ${detail.employee.locationName}` : ''}
                  </CardDescription>
                </Stack>
              </Inline>
              <Badge variant={STATUS_VARIANTS[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
            </Inline>
          </Card>

          {/* Request summary */}
          <Grid columns={2} gap="md">
            <Stack gap="none">
              <CardDescription>Leave type</CardDescription>
              <Inline gap="xs" align="center">
                <strong>{detail.leaveType.name}</strong>
                <Badge variant="neutral">{detail.leaveType.code}</Badge>
              </Inline>
            </Stack>
            <Stack gap="none">
              <CardDescription>Duration</CardDescription>
              <strong>
                {formatDays(detail.totalDays)} · {sessionLabel(detail.session)}
              </strong>
            </Stack>
            <Stack gap="none">
              <CardDescription>Applied</CardDescription>
              <span>
                {formatDateTime(detail.submittedAt)}
                {detail.submittedBy ? ` by ${detail.submittedBy}` : ''}
              </span>
              {detail.appliedOnBehalf && (
                <span>
                  <Badge variant="info">Applied on behalf</Badge>
                </span>
              )}
            </Stack>
            <Stack gap="none">
              <CardDescription>Settings version</CardDescription>
              <span>
                {detail.calculation ? `v${detail.calculation.versionNumber}` : '—'}
                {detail.calculation
                  ? ` · ${detail.calculation.dayCountingMethod === 'working_days' ? 'Working days' : 'Calendar days'}`
                  : ''}
              </span>
            </Stack>
          </Grid>

          <Stack gap="xs">
            <CardDescription>Reason</CardDescription>
            <span>{detail.reason}</span>
          </Stack>

          {detail.rejectionReason && (
            <Alert variant="error" title="Rejected">
              {detail.rejectionReason}
            </Alert>
          )}
          {detail.cancellationReason && (
            <Alert variant="warning" title="Cancellation">
              {detail.cancellationReason}
              {detail.cancelledBy ? ` — ${detail.cancelledBy}` : ''}
              {detail.cancelledAt ? `, ${formatDateTime(detail.cancelledAt)}` : ''}
            </Alert>
          )}
          {detail.calculation?.warnings.map((w) => (
            <Alert key={w} variant="warning">
              {w}
            </Alert>
          ))}

          <Divider spacing="sm" />

          {/* Day-by-day breakdown */}
          {detail.calculation && detail.calculation.scheduleBreakdown.length > 0 && (
            <Stack gap="sm">
              <CardTitle>Day breakdown</CardTitle>
              {detail.calculation.scheduleBreakdown.map((day) => (
                <Inline key={day.date} justify="between" align="center">
                  <span>{formatDate(day.date)}</span>
                  <Inline gap="xs" align="center">
                    {day.isHoliday && <Badge variant="info">Holiday</Badge>}
                    {day.isWeeklyOff && <Badge variant="neutral">Weekly off</Badge>}
                    <Badge variant={day.chargedDays > 0 ? 'success' : 'neutral'}>
                      {day.chargedDays > 0 ? `Charged ${day.chargedDays}` : 'Not charged'}
                    </Badge>
                  </Inline>
                </Inline>
              ))}
            </Stack>
          )}

          <Divider spacing="sm" />

          {/* Approval timeline */}
          <Stack gap="sm">
            <CardTitle>Approval timeline</CardTitle>
            {detail.approvals.length === 0 ? (
              <CardDescription>No approval was needed for this request.</CardDescription>
            ) : (
              detail.approvals.map((step) => {
                const meta = ACTION_LABELS[step.action] ?? {
                  label: step.action,
                  variant: 'neutral' as const,
                };
                return (
                  <Card key={step.id} variant="flat" padding="sm">
                    <Stack gap="xs">
                      <Inline justify="between" align="center">
                        <strong>
                          {step.purpose === 'cancellation' ? 'Cancellation' : `Level ${step.level}`}
                          {step.approverName ? ` · ${step.approverName}` : ''}
                        </strong>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </Inline>
                      {step.actedAt && (
                        <CardDescription>
                          {formatDateTime(step.actedAt)}
                          {step.actedBy ? ` by ${step.actedBy}` : ''}
                        </CardDescription>
                      )}
                      {step.action === 'pending' && step.slaDueAt && (
                        <CardDescription>
                          {step.slaBreachedAt
                            ? 'SLA breached'
                            : `Due ${formatDateTime(step.slaDueAt)}`}
                        </CardDescription>
                      )}
                      {step.comment && <span>“{step.comment}”</span>}
                    </Stack>
                  </Card>
                );
              })
            )}
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}

export default LeaveRequestDrawer;
