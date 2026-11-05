import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  EmptyState,
  Inline,
  LoadingState,
  Page,
  PageHeader,
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
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { CalendarEntry, TeamCalendar } from '../types/leaveOperations.types';
import { formatDate, sessionLabel } from '../components/leaveDisplay';

type Option = { id: string; name: string };

const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow' });

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export interface LeaveTeamCalendarPageProps {
  initialData?: TeamCalendar;
}

export function LeaveTeamCalendarPage({ initialData }: LeaveTeamCalendarPageProps = {}) {
  const [month, setMonth] = useState((initialData?.from ?? new Date().toISOString()).slice(0, 7));
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [data, setData] = useState<TeamCalendar | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await leaveOperationsApi.calendar({
          ...monthRange(month),
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the team calendar');
    } finally {
      setLoading(false);
    }
  }, [month, departmentId, locationId]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  useEffect(() => {
    fetchOrganizationMasters()
      .then((m) => {
        setDepartments(m.departments);
        setLocations(m.locations);
      })
      .catch(() => undefined);
  }, []);

  // employeeId|date -> the leave on that day
  const cellIndex = useMemo(() => {
    const index = new Map<string, { entry: CalendarEntry; charged: number }>();
    for (const entry of data?.entries ?? []) {
      for (const day of entry.days) {
        if (day.charged > 0)
          index.set(`${entry.employeeId}|${day.date}`, { entry, charged: day.charged });
      }
    }
    return index;
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const workdays = data.days.filter((d) => !d.isWeekend && !d.holiday);
    const peak = data.days.reduce((best, d) => (d.out > best.out ? d : best), data.days[0]!);
    const avg = workdays.length
      ? Math.round((workdays.reduce((s, d) => s + d.out, 0) / workdays.length) * 10) / 10
      : 0;
    return {
      peak,
      avg,
      pending: new Set(data.entries.filter((e) => e.status === 'pending').map((e) => e.requestId))
        .size,
      overLimit: data.days.filter((d) => d.overLimit).length,
    };
  }, [data]);

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Team Calendar"
        subtitle={
          data?.scope === 'team'
            ? 'Who is off when across your team, with holidays and concurrency warnings'
            : 'Who is off when across the company, with holidays and concurrency warnings'
        }
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              aria-label="Previous month"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <BezentIcon name="chevronLeft" size={16} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
            >
              {MONTH_FMT.format(new Date(`${month}-01T00:00:00`))}
            </Button>
            <Button
              variant="secondary"
              aria-label="Next month"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <BezentIcon name="chevronRight" size={16} />
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        <Toolbar
          left={
            <Inline gap="md" align="center">
              <Select
                aria-label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={[
                  { value: '', label: 'All departments' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
              <Select
                aria-label="Location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                options={[
                  { value: '', label: 'All locations' },
                  ...locations.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
            </Inline>
          }
          right={
            <Inline gap="xs" align="center">
              <Badge variant="success">Approved</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="info">Holiday</Badge>
              <Badge variant="danger">Over limit</Badge>
            </Inline>
          }
        />

        {error && (
          <Alert variant="error" title="Could not load the team calendar">
            {error}
          </Alert>
        )}

        {stats && data && (
          <LeaveStatGrid
            stats={[
              {
                label: 'Peak Day',
                value: stats.peak.out,
                caption: stats.peak.out > 0 ? formatDate(stats.peak.date) : 'No Leave',
                tone: 'blue',
              },
              {
                label: 'Average Out',
                value: stats.avg,
                caption: 'Per Working Day',
                tone: 'purple',
              },
              {
                label: 'Pending Requests',
                value: stats.pending,
                caption: 'Awaiting Approval',
                tone: stats.pending > 0 ? 'red' : 'green',
              },
              {
                label: 'Over-Limit Days',
                value: stats.overLimit,
                caption: stats.overLimit > 0 ? 'Team Limit Exceeded' : 'Within Limits',
                tone: stats.overLimit > 0 ? 'red' : 'green',
              },
            ]}
          />
        )}

        <Card padding="none">
          {loading && !data ? (
            <LoadingState label="Loading team calendar..." />
          ) : !data || data.employees.length === 0 ? (
            <EmptyState
              title="No employees in view"
              description="Adjust the department or location filter to see the team calendar."
            />
          ) : (
            <Table compact hoverable={false}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  {data.days.map((d) => (
                    <TableHeaderCell key={d.date} title={d.holiday?.name}>
                      <Stack gap="none" align="center">
                        <span>{Number(d.date.slice(8))}</span>
                        <CardDescription>
                          {WEEKDAY_FMT.format(new Date(`${d.date}T00:00:00`))}
                        </CardDescription>
                      </Stack>
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Stack gap="none">
                        <strong>{emp.name}</strong>
                        <CardDescription>
                          {emp.departmentName ?? emp.employeeNumber}
                        </CardDescription>
                      </Stack>
                    </TableCell>
                    {data.days.map((d) => {
                      const cell = cellIndex.get(`${emp.id}|${d.date}`);
                      if (cell) {
                        const half = cell.charged < 1;
                        return (
                          <TableCell
                            key={d.date}
                            title={`${cell.entry.leaveTypeName} · ${
                              cell.entry.status === 'pending' ? 'Pending' : 'Approved'
                            } · ${half ? sessionLabel(cell.entry.session) : 'Full day'}`}
                          >
                            <Badge
                              variant={cell.entry.status === 'pending' ? 'warning' : 'success'}
                            >
                              {cell.entry.leaveTypeCode}
                              {half ? '½' : ''}
                            </Badge>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={d.date} title={d.holiday?.name}>
                          {d.holiday ? (
                            <Badge variant="info">H</Badge>
                          ) : d.isWeekend ? (
                            <CardDescription>·</CardDescription>
                          ) : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <strong>Out</strong>
                  </TableCell>
                  {data.days.map((d) => (
                    <TableCell
                      key={d.date}
                      title={`${d.out} on leave${d.pending ? `, ${d.pending} pending` : ''}`}
                    >
                      {d.out > 0 ? (
                        <Badge variant={d.overLimit ? 'danger' : 'neutral'}>{d.out}</Badge>
                      ) : (
                        <CardDescription>–</CardDescription>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </Card>
      </Stack>
    </Page>
  );
}

export default LeaveTeamCalendarPage;
