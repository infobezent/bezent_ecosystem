import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Page,
  PageHeader,
  Select,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuthorization } from '../../../../platform/auth';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { LeaveStatGrid } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { HolidayCalendarView } from '../types/leaveOperations.types';
import { formatDate } from '../components/leaveDisplay';

const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long' });
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface LeaveHolidayCalendarPageProps {
  initialData?: HolidayCalendarView;
}

export function LeaveHolidayCalendarPage({ initialData }: LeaveHolidayCalendarPageProps = {}) {
  const navigate = useNavigate();
  const { canAny } = useAuthorization();
  const canManage = canAny(['hrms.leave.settings_manage', 'hrms.leave.settings.manage']);
  const [year, setYear] = useState<number | undefined>(initialData?.year);
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [data, setData] = useState<HolidayCalendarView | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await leaveOperationsApi.holidayCalendar({ year, locationId: locationId || undefined }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the holiday calendar');
    } finally {
      setLoading(false);
    }
  }, [year, locationId]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  useEffect(() => {
    fetchOrganizationMasters()
      .then((m) => setLocations(m.locations))
      .catch(() => undefined);
  }, []);

  const shownYear = data?.year ?? year ?? new Date().getFullYear();
  const byMonth = useMemo(() => {
    const groups = new Map<string, HolidayCalendarView['holidays']>();
    for (const h of data?.holidays ?? []) {
      const key = h.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    return [...groups.entries()];
  }, [data]);

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Holiday Calendar"
        subtitle={
          data?.calendar
            ? `${data.calendar.name} · Leave year ${data.cycle.label} · Revision ${data.calendar.revision}`
            : 'Published company holidays for the leave year'
        }
        actions={
          <Inline gap="sm" align="center">
            <Select
              aria-label="Leave year"
              value={String(shownYear)}
              onChange={(e) => setYear(Number(e.target.value))}
              options={[-1, 0, 1].map((d) => {
                const y = new Date().getFullYear() + d;
                return { value: String(y), label: `Leave year ${y}` };
              })}
            />
            <Select
              aria-label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              options={[
                { value: '', label: 'Default calendar' },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            {canManage && (
              <Button
                variant="secondary"
                leftIcon={<BezentIcon name="settings" size={16} />}
                onClick={() => navigate('/hrms/settings?module=leave&tab=holidays')}
              >
                Manage in Settings
              </Button>
            )}
          </Inline>
        }
      />

      <Stack gap="lg">
        {error && (
          <Alert variant="error" title="Could not load the holiday calendar">
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <LoadingState label="Loading holiday calendar..." />
        ) : !data || !data.calendar ? (
          <Card padding="none">
            <EmptyState
              title={`No published calendar for ${shownYear}`}
              description="Working-day leave that touches a holiday is blocked until a calendar is published in Settings → Holidays."
              primaryAction={
                canManage
                  ? {
                      label: 'Open Holiday Settings',
                      onClick: () => navigate('/hrms/settings?module=leave&tab=holidays'),
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <>
            <LeaveStatGrid
              stats={[
                {
                  label: 'Holidays',
                  value: data.metrics.total,
                  caption: `Leave Year ${data.cycle.label}`,
                  tone: 'blue',
                },
                {
                  label: 'Mandatory',
                  value: data.metrics.mandatory,
                  caption: 'Company Closed',
                  tone: 'purple',
                },
                {
                  label: 'Optional',
                  value: data.metrics.optional,
                  caption: `${data.metrics.optionalQuota} Per Employee`,
                  tone: 'green',
                },
                {
                  label: 'Next Holiday',
                  value: data.metrics.next
                    ? DAY_FMT.format(new Date(`${data.metrics.next.date}T00:00:00`))
                    : '—',
                  caption: data.metrics.next?.name ?? 'None Left This Year',
                  tone: 'red',
                },
              ]}
            />

            <Grid columns={3} gap="lg">
              {byMonth.map(([month, items]) => (
                <Card key={month} variant="flat" padding="lg">
                  <CardHeader>
                    <Inline justify="between" align="center">
                      <CardTitle>{MONTH_FMT.format(new Date(`${month}-01T00:00:00`))}</CardTitle>
                      <Badge variant="neutral">{items.length}</Badge>
                    </Inline>
                  </CardHeader>
                  <Stack gap="sm">
                    {items.map((h) => (
                      <Inline key={h.date} justify="between" align="center">
                        <Stack gap="none">
                          {h.isPast ? (
                            <CardDescription>{h.name}</CardDescription>
                          ) : (
                            <strong>{h.name}</strong>
                          )}
                          <CardDescription>
                            {formatDate(h.date)} · {capitalize(h.weekday)}
                          </CardDescription>
                        </Stack>
                        <Stack gap="none" align="end">
                          <Badge variant={h.type === 'optional' ? 'info' : 'neutral'}>
                            {h.type === 'optional' ? 'Optional' : 'Mandatory'}
                          </Badge>
                          {h.type === 'optional' && (
                            <CardDescription>{h.optedCount} opted</CardDescription>
                          )}
                        </Stack>
                      </Inline>
                    ))}
                  </Stack>
                </Card>
              ))}
            </Grid>
          </>
        )}
      </Stack>
    </Page>
  );
}

export default LeaveHolidayCalendarPage;
