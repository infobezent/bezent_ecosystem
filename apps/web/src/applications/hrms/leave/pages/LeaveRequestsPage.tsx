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
  Grid,
  Inline,
  LoadingState,
  LocaleDatePicker,
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
import type {
  LeaveRequestList,
  LeaveRequestQuery,
  LeaveRequestStatus,
} from '../types/leaveOperations.types';
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  formatDate,
  formatDays,
  formatRange,
  initialsOf,
  sessionLabel,
} from '../components/leaveDisplay';
import { LeaveRequestDrawer } from '../components/LeaveRequestDrawer';
import { ApplyOnBehalfModal } from '../components/ApplyOnBehalfModal';

type Option = { id: string; name: string };
const PAGE_SIZE = 20;
const EMPTY_FILTERS: LeaveRequestQuery = {
  status: '',
  departmentId: '',
  locationId: '',
  from: '',
  to: '',
  search: '',
  appliedByHr: false,
};

export interface LeaveRequestsPageProps {
  initialData?: LeaveRequestList;
}

export function LeaveRequestsPage({ initialData }: LeaveRequestsPageProps = {}) {
  const { canAny } = useAuthorization();
  const canApplyOnBehalf = canAny(['hrms.leave.apply_on_behalf']);
  const [filters, setFilters] = useState<LeaveRequestQuery>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaveRequestList | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await leaveOperationsApi.requests({ ...filters, page, pageSize: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  // Debounce free-text search into the filters.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setFilters((f) => (f.search === search ? f : { ...f, search }));
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

  const setFilter = (patch: Partial<LeaveRequestQuery>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };
  const hasFilters =
    JSON.stringify({ ...filters, search: '' }) !==
      JSON.stringify({ ...EMPTY_FILTERS, search: '' }) || search !== '';
  const clearFilters = () => {
    setSearch('');
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Leave Requests"
        subtitle="Every leave request with its status, approval stage and day-by-day calculation"
        actions={
          canApplyOnBehalf ? (
            <Button
              variant="primary"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setApplyOpen(true)}
            >
              Apply on Behalf
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

        {counts && (
          <LeaveStatGrid
            stats={[
              {
                label: 'Pending',
                value: counts.pending + counts.cancellation_pending,
                caption:
                  counts.cancellation_pending > 0
                    ? `${counts.cancellation_pending} Cancellation`
                    : 'Awaiting Approval',
                tone: 'red',
              },
              { label: 'Approved', value: counts.approved, caption: 'Confirmed', tone: 'green' },
              { label: 'Rejected', value: counts.rejected, caption: 'Declined', tone: 'purple' },
              { label: 'Cancelled', value: counts.cancelled, caption: 'Withdrawn', tone: 'blue' },
            ]}
          />
        )}

        <Card variant="flat" padding="md">
          <Stack gap="md">
            <Toolbar
              left={
                <Inline gap="md" align="center">
                  <SearchInput
                    value={search}
                    placeholder="Search employee name or number..."
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search leave requests"
                  />
                  <Select
                    aria-label="Status"
                    value={filters.status ?? ''}
                    onChange={(e) =>
                      setFilter({ status: e.target.value as LeaveRequestStatus | '' })
                    }
                    options={[
                      { value: '', label: 'All statuses' },
                      ...(Object.keys(STATUS_LABELS) as LeaveRequestStatus[]).map((s) => ({
                        value: s,
                        label: STATUS_LABELS[s],
                      })),
                    ]}
                  />
                  <Select
                    aria-label="Department"
                    value={filters.departmentId ?? ''}
                    onChange={(e) => setFilter({ departmentId: e.target.value })}
                    options={[
                      { value: '', label: 'All departments' },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                  <Select
                    aria-label="Location"
                    value={filters.locationId ?? ''}
                    onChange={(e) => setFilter({ locationId: e.target.value })}
                    options={[
                      { value: '', label: 'All locations' },
                      ...locations.map((l) => ({ value: l.id, label: l.name })),
                    ]}
                  />
                </Inline>
              }
              right={
                hasFilters ? (
                  <Button variant="secondary" size="sm" type="button" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
            <Grid columns={4} gap="md">
              <LocaleDatePicker
                placeholder="From"
                value={filters.from ?? ''}
                onChange={(d) => setFilter({ from: d })}
              />
              <LocaleDatePicker
                placeholder="To"
                value={filters.to ?? ''}
                minDate={filters.from || undefined}
                onChange={(d) => setFilter({ to: d })}
              />
              <Checkbox
                label="Applied by HR only"
                checked={!!filters.appliedByHr}
                onChange={(e) => setFilter({ appliedByHr: e.target.checked })}
              />
            </Grid>
          </Stack>
        </Card>

        {error && (
          <Alert variant="error" title="Could not load leave requests">
            {error}
          </Alert>
        )}

        <Card padding="none">
          {loading && !data ? (
            <LoadingState label="Loading leave requests..." />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title={hasFilters ? 'No matching requests' : 'No leave requests yet'}
              description={
                hasFilters
                  ? 'No leave request matches these filters.'
                  : 'Requests appear here as employees apply from ESS or HR applies on their behalf.'
              }
              primaryAction={
                hasFilters ? { label: 'Clear Filters', onClick: clearFilters } : undefined
              }
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Leave Type</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell>Days</TableHeaderCell>
                  <TableHeaderCell>Applied</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Inline gap="sm" align="center">
                        <Avatar initials={initialsOf(r.employeeName)} size="sm" />
                        <Stack gap="none">
                          <strong>{r.employeeName}</strong>
                          <CardDescription>
                            {r.employeeNumber}
                            {r.departmentName ? ` · ${r.departmentName}` : ''}
                          </CardDescription>
                        </Stack>
                      </Inline>
                    </TableCell>
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <span>{r.leaveTypeName}</span>
                        <Badge variant="neutral">{r.leaveTypeCode}</Badge>
                      </Inline>
                    </TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <span>{formatRange(r.startDate, r.endDate)}</span>
                        {r.session && <CardDescription>{sessionLabel(r.session)}</CardDescription>}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDays(r.totalDays)}</TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <span>{formatDate(r.submittedAt.slice(0, 10))}</span>
                        {r.appliedOnBehalf && <CardDescription>By HR</CardDescription>}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <span>
                          <Badge variant={STATUS_VARIANTS[r.status]}>
                            {STATUS_LABELS[r.status]}
                          </Badge>
                        </span>
                        {(r.status === 'pending' || r.status === 'cancellation_pending') &&
                          r.currentLevel && (
                            <CardDescription>Level {r.currentLevel}</CardDescription>
                          )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => setOpenRequest(r.id)}
                      >
                        View
                      </Button>
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
              Showing {firstRow}–{lastRow} of {total}
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

      <LeaveRequestDrawer
        requestId={openRequest}
        onClose={() => setOpenRequest(null)}
        onChanged={() => void load()}
        canCancel={canApplyOnBehalf}
      />
      <ApplyOnBehalfModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApplied={(msg) => {
          setSuccess(msg);
          void load();
        }}
        canBackdateOverride={canAny(['hrms.leave.backdated_override'])}
        canPayrollOverride={canAny(['hrms.leave.payroll_override'])}
      />
    </Page>
  );
}

export default LeaveRequestsPage;
