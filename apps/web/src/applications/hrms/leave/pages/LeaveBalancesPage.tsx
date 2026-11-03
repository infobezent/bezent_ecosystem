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
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuthorization } from '../../../../platform/auth';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { BalanceRegister } from '../types/leaveOperations.types';
import { initialsOf } from '../components/leaveDisplay';
import { BalanceLedgerDrawer } from '../components/BalanceLedgerDrawer';
import { AdjustBalanceModal } from '../components/AdjustBalanceModal';

type Option = { id: string; name: string };
const PAGE_SIZE = 25;

export interface LeaveBalancesPageProps {
  initialData?: BalanceRegister;
}

export function LeaveBalancesPage({ initialData }: LeaveBalancesPageProps = {}) {
  const { canAny } = useAuthorization();
  const canAdjust = canAny(['hrms.leave.balance_adjust']);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({
    search: '',
    departmentId: '',
    locationId: '',
    negativeOnly: false,
    previousCycle: false,
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BalanceRegister | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [ledgerFor, setLedgerFor] = useState<string | null>(null);
  const [ledgerKey, setLedgerKey] = useState(0);
  const [adjustFor, setAdjustFor] = useState<string | undefined>(undefined);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [currentCycleStart, setCurrentCycleStart] = useState<string | null>(
    initialData?.cycle.start ?? null,
  );

  // The previous cycle is the one containing the day before the current cycle started.
  const cycleStart =
    query.previousCycle && currentCycleStart
      ? new Date(new Date(`${currentCycleStart}T00:00:00Z`).getTime() - 86_400_000)
          .toISOString()
          .slice(0, 10)
      : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveOperationsApi.balances({
        cycleStart,
        search: query.search || undefined,
        departmentId: query.departmentId || undefined,
        locationId: query.locationId || undefined,
        negativeOnly: query.negativeOnly,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(res);
      if (!cycleStart) setCurrentCycleStart(res.cycle.start);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  }, [cycleStart, query, page]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery((q) => (q.search === search ? q : { ...q, search }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchOrganizationMasters()
      .then((m) => {
        setDepartments(m.departments);
        setLocations(m.locations);
      })
      .catch(() => undefined);
  }, []);

  const update = (patch: Partial<typeof query>) => {
    setPage(1);
    setQuery((q) => ({ ...q, ...patch }));
  };

  const m = data?.metrics;
  const total = data?.total ?? 0;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Leave Balances"
        subtitle={
          data
            ? `Available days per employee and leave type · Leave year ${data.cycle.label}`
            : 'Available days per employee and leave type'
        }
        actions={
          canAdjust ? (
            <Button
              variant="primary"
              leftIcon={<BezentIcon name="edit" size={16} />}
              onClick={() => {
                setAdjustFor(undefined);
                setAdjustOpen(true);
              }}
            >
              Adjust Balance
            </Button>
          ) : undefined
        }
      />

      <Stack gap="lg">
        {success && (
          <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {m && (
          <LeaveStatGrid
            stats={[
              { label: 'Employees', value: m.employees, caption: 'In Scope', tone: 'blue' },
              {
                label: 'Days Available',
                value: Math.round(m.totalAvailable * 10) / 10,
                caption: 'Across Tracked Types',
                tone: 'green',
              },
              {
                label: 'Negative Balances',
                value: m.negativeBalances,
                caption: m.negativeBalances > 0 ? 'Need Review' : 'None',
                tone: m.negativeBalances > 0 ? 'red' : 'purple',
              },
              {
                label: 'Carry Forward Expiring',
                value: m.expiringCarryForward,
                caption: 'Next 30 Days',
                tone: m.expiringCarryForward > 0 ? 'red' : 'purple',
              },
            ]}
          />
        )}

        <Card variant="flat" padding="md">
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <SearchInput
                  value={search}
                  placeholder="Search employee name or number..."
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search balances"
                />
                <Select
                  aria-label="Department"
                  value={query.departmentId}
                  onChange={(e) => update({ departmentId: e.target.value })}
                  options={[
                    { value: '', label: 'All departments' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
                <Select
                  aria-label="Location"
                  value={query.locationId}
                  onChange={(e) => update({ locationId: e.target.value })}
                  options={[
                    { value: '', label: 'All locations' },
                    ...locations.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                />
                <Select
                  aria-label="Leave year"
                  value={query.previousCycle ? 'previous' : 'current'}
                  onChange={(e) => update({ previousCycle: e.target.value === 'previous' })}
                  options={[
                    { value: 'current', label: 'Current leave year' },
                    { value: 'previous', label: 'Previous leave year' },
                  ]}
                />
              </Inline>
            }
            right={
              <Checkbox
                label="Negative only"
                checked={query.negativeOnly}
                onChange={(e) => update({ negativeOnly: e.target.checked })}
              />
            }
          />
        </Card>

        {error && (
          <Alert variant="error" title="Could not load balances">
            {error}
          </Alert>
        )}

        <Card padding="none">
          {loading && !data ? (
            <LoadingState label="Loading leave balances..." />
          ) : !data || data.rows.length === 0 ? (
            <EmptyState
              title="No balances to show"
              description="No employee matches these filters for the selected leave year."
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  {data.leaveTypes.map((t) => (
                    <TableHeaderCell key={t.id} title={t.name}>
                      {t.code}
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.employee.id}>
                    <TableCell>
                      <Inline gap="sm" align="center">
                        <Avatar initials={initialsOf(row.employee.name)} size="sm" />
                        <Stack gap="none">
                          <strong>{row.employee.name}</strong>
                          <CardDescription>
                            {row.employee.employeeNumber}
                            {row.employee.departmentName ? ` · ${row.employee.departmentName}` : ''}
                          </CardDescription>
                        </Stack>
                      </Inline>
                    </TableCell>
                    {data.leaveTypes.map((t) => {
                      const cell = row.balances[t.id];
                      return (
                        <TableCell
                          key={t.id}
                          title={
                            cell
                              ? `Entitled ${cell.entitled} · Used ${cell.used} · Pending ${cell.pending}`
                              : 'No balance yet this leave year'
                          }
                        >
                          {cell ? (
                            <Stack gap="none">
                              <span>
                                <Badge variant={cell.available < 0 ? 'danger' : 'neutral'}>
                                  {cell.available} / {cell.entitled}
                                </Badge>
                              </span>
                              {cell.pending > 0 && (
                                <CardDescription>{cell.pending} pending</CardDescription>
                              )}
                            </Stack>
                          ) : (
                            <CardDescription>—</CardDescription>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Inline gap="xs">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setLedgerFor(row.employee.id)}
                        >
                          Ledger
                        </Button>
                        {canAdjust && (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setAdjustFor(row.employee.id);
                              setAdjustOpen(true);
                            }}
                          >
                            Adjust
                          </Button>
                        )}
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {total > PAGE_SIZE && (
          <Inline justify="between" align="center">
            <CardDescription>
              Showing {(page - 1) * PAGE_SIZE + 1}–{lastRow} of {total}
            </CardDescription>
            <Inline gap="sm">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={lastRow >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Inline>
          </Inline>
        )}
      </Stack>

      <BalanceLedgerDrawer
        employeeId={ledgerFor}
        cycleStart={data?.cycle.start}
        refreshKey={ledgerKey}
        onClose={() => setLedgerFor(null)}
      />
      <AdjustBalanceModal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        employeeId={adjustFor}
        employees={data?.rows.map((r) => r.employee) ?? []}
        leaveTypes={data?.leaveTypes ?? []}
        onAdjusted={(msg) => {
          setSuccess(msg);
          setLedgerKey((k) => k + 1);
          void load();
        }}
      />
    </Page>
  );
}

export default LeaveBalancesPage;
