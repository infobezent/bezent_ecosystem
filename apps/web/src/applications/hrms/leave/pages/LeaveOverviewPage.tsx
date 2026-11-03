import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Grid,
  Inline,
  LoadingState,
  LocaleDatePicker,
  Page,
  PageHeader,
  ProgressBar,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { LeaveOverview, LeaveOverviewAttention } from '../types/leaveOperations.types';
import { formatDate, formatRange, initialsOf, sessionLabel } from '../components/leaveDisplay';
import { LeaveRequestDrawer } from '../components/LeaveRequestDrawer';

type Option = { id: string; name: string };

const todayIso = () => new Date().toISOString().slice(0, 10);

export interface LeaveOverviewPageProps {
  initialData?: LeaveOverview;
}

export function LeaveOverviewPage({ initialData }: LeaveOverviewPageProps = {}) {
  const navigate = useNavigate();
  const [date, setDate] = useState(initialData?.date ?? todayIso());
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [data, setData] = useState<LeaveOverview | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await leaveOperationsApi.overview({
          date,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave overview');
    } finally {
      setLoading(false);
    }
  }, [date, departmentId, locationId]);

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

  const openAttention = (item: LeaveOverviewAttention) => {
    if (item.target.page === 'settings') {
      navigate(`/hrms/settings?module=leave&tab=${item.target.tab ?? 'general'}`);
    } else {
      navigate(`/hrms/leave/${item.target.page}`);
    }
  };

  const m = data?.metrics;
  const maxMix = Math.max(1, ...(data?.leaveMix.map((x) => x.days) ?? [1]));

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Leave Overview"
        subtitle={
          data?.scope === 'team'
            ? 'Who is out, what needs action, and upcoming leave across your team'
            : 'Who is out, what needs action, and upcoming leave across the company'
        }
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
              variant="secondary"
              leftIcon={<BezentIcon name="requests" size={16} />}
              onClick={() => navigate('/hrms/leave/requests')}
            >
              Leave Requests
            </Button>
            <Button
              variant="primary"
              leftIcon={<BezentIcon name="approvals" size={16} />}
              onClick={() => navigate('/hrms/leave/approvals')}
            >
              Approvals
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        <Toolbar
          left={
            <Inline gap="md" align="center">
              <LocaleDatePicker value={date} onChange={(d) => setDate(d || todayIso())} />
              <Button variant="outline" type="button" onClick={() => setDate(todayIso())}>
                Today
              </Button>
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
        />

        {error && (
          <Alert variant="error" title="Could not load the overview">
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <LoadingState label="Loading leave overview..." />
        ) : data && m ? (
          <>
            <LeaveStatGrid
              stats={[
                {
                  label: 'On Leave Today',
                  value: m.onLeaveToday,
                  caption:
                    m.workforce > 0
                      ? `${Math.round((m.onLeaveToday / m.workforce) * 100)}% of ${m.workforce}`
                      : 'No workforce',
                  tone: 'blue',
                },
                {
                  label: 'Pending Approvals',
                  value: m.pendingApprovals,
                  caption: m.overdueApprovals > 0 ? `${m.overdueApprovals} Overdue` : 'On Track',
                  tone: m.overdueApprovals > 0 ? 'red' : 'green',
                },
                {
                  label: 'Starting This Week',
                  value: m.upcomingWeek,
                  caption: 'Next 7 Days',
                  tone: 'purple',
                },
                {
                  label: 'LOP This Month',
                  value: m.lopDaysThisMonth,
                  caption: 'Days For Payroll',
                  tone: m.lopDaysThisMonth > 0 ? 'red' : 'purple',
                },
              ]}
            />

            <Grid columns={2} gap="lg">
              {/* Who's out */}
              <Card variant="flat" padding="lg">
                <CardHeader>
                  <Inline justify="between" align="center">
                    <Stack gap="none">
                      <CardTitle>Who&apos;s out on {formatDate(data.date)}</CardTitle>
                      <CardDescription>Approved leave covering the selected day.</CardDescription>
                    </Stack>
                    <Badge variant="info">{data.outToday.length}</Badge>
                  </Inline>
                </CardHeader>
                {data.outToday.length === 0 ? (
                  <CardDescription>
                    Everyone is in — no approved leave covers this day.
                  </CardDescription>
                ) : (
                  <Stack gap="sm">
                    {data.outToday.map((p) => (
                      <Card key={p.requestId} variant="flat" padding="sm">
                        <Inline justify="between" align="center">
                          <Inline gap="sm" align="center">
                            <Avatar initials={initialsOf(p.employeeName)} size="sm" />
                            <Stack gap="none">
                              <strong>{p.employeeName}</strong>
                              <CardDescription>
                                {p.departmentName ?? p.employeeNumber} · back{' '}
                                {formatDate(p.returnsOn)}
                              </CardDescription>
                            </Stack>
                          </Inline>
                          <Inline gap="xs" align="center">
                            <Badge variant="neutral">{p.leaveTypeCode}</Badge>
                            {p.session && <Badge variant="info">{sessionLabel(p.session)}</Badge>}
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => setOpenRequest(p.requestId)}
                            >
                              View
                            </Button>
                          </Inline>
                        </Inline>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Card>

              {/* Needs attention */}
              <Card variant="flat" padding="lg">
                <CardHeader>
                  <Inline justify="between" align="center">
                    <Stack gap="none">
                      <CardTitle>Needs attention</CardTitle>
                      <CardDescription>Items that block employees or breach SLAs.</CardDescription>
                    </Stack>
                    <Badge variant={data.attention.length ? 'warning' : 'success'}>
                      {data.attention.length ? data.attention.length : 'All clear'}
                    </Badge>
                  </Inline>
                </CardHeader>
                {data.attention.length === 0 ? (
                  <CardDescription>
                    Nothing needs attention — approvals are on time and leave setup is complete.
                  </CardDescription>
                ) : (
                  <Stack gap="sm">
                    {data.attention.map((a) => (
                      <Card
                        key={a.id}
                        variant={a.severity === 'warning' ? 'tint-amber' : 'tint-blue'}
                        padding="sm"
                      >
                        <Inline justify="between" align="center">
                          <Stack gap="none">
                            <strong>{a.title}</strong>
                            <CardDescription>{a.detail}</CardDescription>
                          </Stack>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => openAttention(a)}
                          >
                            Review
                          </Button>
                        </Inline>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid>

            <Grid columns={2} gap="lg">
              {/* Upcoming leave */}
              <Card variant="flat" padding="lg">
                <CardHeader>
                  <Stack gap="none">
                    <CardTitle>Upcoming leave</CardTitle>
                    <CardDescription>Approved leave starting in the next 14 days.</CardDescription>
                  </Stack>
                </CardHeader>
                {data.upcoming.length === 0 ? (
                  <CardDescription>No upcoming leave in the next two weeks.</CardDescription>
                ) : (
                  <Stack gap="sm">
                    {data.upcoming.map((p) => (
                      <Inline key={p.requestId} justify="between" align="center">
                        <Inline gap="sm" align="center">
                          <Avatar initials={initialsOf(p.employeeName)} size="sm" />
                          <Stack gap="none">
                            <strong>{p.employeeName}</strong>
                            <CardDescription>{formatRange(p.startDate, p.endDate)}</CardDescription>
                          </Stack>
                        </Inline>
                        <Badge variant="neutral">{p.leaveTypeCode}</Badge>
                      </Inline>
                    ))}
                  </Stack>
                )}
              </Card>

              <Stack gap="lg">
                {/* Leave mix */}
                <Card variant="flat" padding="lg">
                  <CardHeader>
                    <Stack gap="none">
                      <CardTitle>Leave mix this month</CardTitle>
                      <CardDescription>Days taken by leave type.</CardDescription>
                    </Stack>
                  </CardHeader>
                  {data.leaveMix.length === 0 ? (
                    <CardDescription>No leave taken this month yet.</CardDescription>
                  ) : (
                    <Stack gap="sm">
                      {data.leaveMix.map((x) => (
                        <Stack key={x.leaveTypeId} gap="xs">
                          <Inline justify="between" align="center">
                            <span>{x.name}</span>
                            <strong>{x.days} d</strong>
                          </Inline>
                          <ProgressBar value={x.days} max={maxMix} aria-label={`${x.name} days`} />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Card>

                {/* Holidays */}
                <Card variant="flat" padding="lg">
                  <CardHeader>
                    <Stack gap="none">
                      <CardTitle>Upcoming holidays</CardTitle>
                      <CardDescription>From the published holiday calendar.</CardDescription>
                    </Stack>
                  </CardHeader>
                  {data.upcomingHolidays.length === 0 ? (
                    <CardDescription>No more holidays this leave year.</CardDescription>
                  ) : (
                    <Stack gap="sm">
                      {data.upcomingHolidays.map((h) => (
                        <Inline key={h.date} justify="between" align="center">
                          <Stack gap="none">
                            <strong>{h.name}</strong>
                            <CardDescription>{formatDate(h.date)}</CardDescription>
                          </Stack>
                          <Badge variant={h.type === 'optional' ? 'info' : 'neutral'}>
                            {h.type === 'optional' ? 'Optional' : 'Holiday'}
                          </Badge>
                        </Inline>
                      ))}
                    </Stack>
                  )}
                </Card>
              </Stack>
            </Grid>
          </>
        ) : null}
      </Stack>

      <LeaveRequestDrawer
        requestId={openRequest}
        onClose={() => setOpenRequest(null)}
        onChanged={() => void load()}
      />
    </Page>
  );
}

export default LeaveOverviewPage;
