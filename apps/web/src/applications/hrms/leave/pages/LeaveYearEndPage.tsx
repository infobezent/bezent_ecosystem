import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Grid,
  Inline,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuthorization } from '../../../../platform/auth';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { YearEndView } from '../types/leaveOperations.types';
import { formatDate, formatDateTime } from '../components/leaveDisplay';

const dayBefore = (iso: string) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

export interface LeaveYearEndPageProps {
  initialData?: YearEndView;
}

export function LeaveYearEndPage({ initialData }: LeaveYearEndPageProps = {}) {
  const { canAny } = useAuthorization();
  const canClose = canAny(['hrms.leave.year_end_process']);
  const [which, setWhich] = useState<'current' | 'previous'>('current');
  const [currentStart, setCurrentStart] = useState<string | null>(initialData?.cycle.start ?? null);
  const [data, setData] = useState<YearEndView | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const cycleStart = which === 'previous' && currentStart ? dayBefore(currentStart) : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveOperationsApi.yearEnd(cycleStart);
      setData(res);
      if (!cycleStart) setCurrentStart(res.cycle.start);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load year-end data');
    } finally {
      setLoading(false);
    }
  }, [cycleStart]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (r) =>
        !term ||
        r.employeeName.toLowerCase().includes(term) ||
        r.employeeNumber.toLowerCase().includes(term),
    );
  }, [data, search]);

  const closeYear = async () => {
    if (!data) return;
    setClosing(true);
    setError(null);
    try {
      const res = await leaveOperationsApi.closeYear(data.cycle.start);
      setSuccess(
        `Leave year ${data.cycle.label} closed: ${res.carriedForward} day(s) carried forward, ${res.lapsed} lapsed, ${res.encashed} encashed.`,
      );
      setConfirmOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close the leave year');
    } finally {
      setClosing(false);
    }
  };

  const closedRun = data?.runs.find((r) => r.cycleStartDate === data.cycle.start);

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Year-End & Encashment"
        subtitle="Carry forward, lapse and encashment when a leave year closes"
        actions={
          <Inline gap="sm" align="center">
            <Select
              aria-label="Leave year"
              value={which}
              onChange={(e) => setWhich(e.target.value as 'current' | 'previous')}
              options={[
                { value: 'current', label: 'Current leave year' },
                { value: 'previous', label: 'Previous leave year' },
              ]}
            />
            <Button
              variant="secondary"
              leftIcon={<BezentIcon name="sync" size={16} />}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
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

        {loading && !data ? (
          <LoadingState label="Loading year-end data..." />
        ) : !data ? null : (
          <>
            {/* Status */}
            <Card
              variant={
                data.alreadyClosed ? 'tint-green' : data.canClose ? 'tint-amber' : 'tint-blue'
              }
              padding="lg"
            >
              <Inline justify="between" align="center">
                <Stack gap="xs">
                  <CardTitle>
                    Leave year {data.cycle.label} ·{' '}
                    {data.alreadyClosed
                      ? 'Closed'
                      : data.canClose
                        ? 'Ready to close'
                        : 'In progress'}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(data.cycle.start)} – {formatDate(data.cycle.end)}.{' '}
                    {data.alreadyClosed
                      ? `Closed ${closedRun ? `${formatDateTime(closedRun.createdAt)} by ${closedRun.closedBy}` : ''}. Balances moved to ${data.nextCycle.label}.`
                      : data.canClose
                        ? `The year has ended. It closes automatically on the next sweep, or close it now.`
                        : `Closes automatically on ${formatDate(data.autoCloseOn)}. The figures below are a live preview.`}
                  </CardDescription>
                </Stack>
                {data.canClose && canClose && (
                  <Button variant="primary" type="button" onClick={() => setConfirmOpen(true)}>
                    Close Leave Year
                  </Button>
                )}
              </Inline>
            </Card>

            <LeaveStatGrid
              stats={[
                {
                  label: 'Employees',
                  value: data.totals.employees,
                  caption: 'With Balances',
                  tone: 'blue',
                },
                {
                  label: 'Carry Forward',
                  value: data.totals.carryForward,
                  caption: `Days Into ${data.nextCycle.label}`,
                  tone: 'green',
                },
                {
                  label: 'Lapse',
                  value: data.totals.lapse,
                  caption: 'Days Forfeited',
                  tone: data.totals.lapse > 0 ? 'red' : 'purple',
                },
                {
                  label: 'Encashment',
                  value: data.totals.encash,
                  caption: 'Days To Payroll',
                  tone: 'purple',
                },
              ]}
            />

            {/* Preview */}
            <Card variant="flat" padding="lg">
              <CardHeader>
                <Inline justify="between" align="center">
                  <Stack gap="none">
                    <CardTitle>{data.alreadyClosed ? 'Close result' : 'Close preview'}</CardTitle>
                    <CardDescription>
                      Per employee and leave type, from the accrual & carry-forward rules.
                    </CardDescription>
                  </Stack>
                  <SearchInput
                    value={search}
                    placeholder="Search employee..."
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search year-end rows"
                  />
                </Inline>
              </CardHeader>
              {rows.length === 0 ? (
                <EmptyState
                  title="No balances to close"
                  description="No tracked leave balances exist for this leave year."
                />
              ) : (
                <Table compact>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Leave Type</TableHeaderCell>
                      <TableHeaderCell>Available</TableHeaderCell>
                      <TableHeaderCell>Carry Forward</TableHeaderCell>
                      <TableHeaderCell>Lapse</TableHeaderCell>
                      <TableHeaderCell>Encash</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={`${r.employeeId}-${r.leaveTypeId}`}>
                        <TableCell>
                          <Stack gap="none">
                            <strong>{r.employeeName}</strong>
                            <CardDescription>{r.employeeNumber}</CardDescription>
                          </Stack>
                        </TableCell>
                        <TableCell>{r.leaveTypeName}</TableCell>
                        <TableCell>{r.available}</TableCell>
                        <TableCell>
                          {r.carryForward > 0 ? (
                            <Badge variant="success">{r.carryForward}</Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {r.lapse > 0 ? <Badge variant="warning">{r.lapse}</Badge> : '—'}
                        </TableCell>
                        <TableCell>
                          {r.encash > 0 ? <Badge variant="info">{r.encash}</Badge> : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Grid columns={2} gap="lg">
              {/* Run history */}
              <Card variant="flat" padding="lg">
                <CardHeader>
                  <Stack gap="none">
                    <CardTitle>Run history</CardTitle>
                    <CardDescription>Every leave year closed so far.</CardDescription>
                  </Stack>
                </CardHeader>
                {data.runs.length === 0 ? (
                  <CardDescription>No leave year has been closed yet.</CardDescription>
                ) : (
                  <Stack gap="sm">
                    {data.runs.map((run) => (
                      <Card key={run.id} variant="flat" padding="sm">
                        <Inline justify="between" align="center">
                          <Stack gap="none">
                            <strong>
                              {formatDate(run.cycleStartDate)} – {formatDate(run.cycleEndDate)}
                            </strong>
                            <CardDescription>
                              {formatDateTime(run.createdAt)} · {run.closedBy}
                            </CardDescription>
                          </Stack>
                          <CardDescription>
                            {run.summary.balances ?? 0} balances · CF{' '}
                            {run.summary.carriedForward ?? 0} · lapse {run.summary.lapsed ?? 0} ·
                            enc {run.summary.encashed ?? 0}
                          </CardDescription>
                        </Inline>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Card>

              {/* Encashment handover */}
              <Card variant="flat" padding="lg">
                <CardHeader>
                  <Stack gap="none">
                    <CardTitle>Encashment handover</CardTitle>
                    <CardDescription>Days sent to payroll for this leave year.</CardDescription>
                  </Stack>
                </CardHeader>
                {data.encashments.length === 0 ? (
                  <CardDescription>Nothing has been handed over to payroll.</CardDescription>
                ) : (
                  <Stack gap="sm">
                    {data.encashments.map((e) => (
                      <Inline key={e.id} justify="between" align="center">
                        <Stack gap="none">
                          <strong>{e.employeeName}</strong>
                          <CardDescription>
                            {e.leaveTypeName} · {e.days} day(s) · {e.basis} pay
                          </CardDescription>
                        </Stack>
                        <Badge variant={e.status === 'processed' ? 'success' : 'warning'}>
                          {e.status === 'processed' ? 'Paid' : 'Pending payroll'}
                        </Badge>
                      </Inline>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid>
          </>
        )}
      </Stack>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="md"
        title={data ? `Close leave year ${data.cycle.label}?` : 'Close leave year'}
        description="This cannot be undone. Balances are carried forward, lapsed or encashed exactly as previewed."
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="secondary" type="button" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={closing}
              onClick={() => void closeYear()}
            >
              {closing ? 'Closing...' : 'Close Leave Year'}
            </Button>
          </Inline>
        }
      >
        {data && (
          <Stack gap="xs">
            <CardDescription>
              {data.totals.employees} employee(s) · {data.totals.carryForward} day(s) carried into{' '}
              {data.nextCycle.label} · {data.totals.lapse} lapsed · {data.totals.encash} encashed.
            </CardDescription>
          </Stack>
        )}
      </Modal>
    </Page>
  );
}

export default LeaveYearEndPage;
