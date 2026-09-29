import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  EmptyState,
  type BadgeVariant,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssDashboardData } from '../api/essApi';

export function EssDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<EssDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await essApi.getDashboard();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePunchIn = async () => {
    setPunchLoading(true);
    setPunchError(null);
    try {
      await essApi.checkIn({ workLocation: 'office' });
      await fetchDashboard();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setPunchLoading(true);
    setPunchError(null);
    try {
      await essApi.checkOut();
      await fetchDashboard();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading your workspace..." />;
  if (error)
    return (
      <Alert variant="error" title="Failed to Load Dashboard">
        {error}
      </Alert>
    );
  if (!data)
    return (
      <EmptyState
        title="Workspace Unavailable"
        description="Unable to load employee data. Please try again."
      />
    );

  const today = data.todayAttendance;
  const hasPunchedIn = !!today.checkInTime;
  const hasPunchedOut = !!today.checkOutTime;
  const currentYear = new Date().getFullYear();

  const leaveColors: Record<string, BadgeVariant> = {
    annual: 'success',
    sick: 'warning',
    casual: 'info',
    unpaid: 'neutral',
  };

  return (
    <Page>
      <PageHeader
        title={`Good ${getGreeting()}, ${data.employee.firstName}!`}
        subtitle={`${data.employee.designationTitle ?? data.employee.employmentType} · ${data.employee.departmentName ?? ''} · ${data.employee.locationName ?? ''}`}
      />

      {punchError && (
        <Alert variant="error" title="Punch Error">
          {punchError}
        </Alert>
      )}

      {/* Attendance Widget */}
      <Section title="Today's Attendance" subtitle={formatDate(today.date)}>
        <Card>
          <Stack gap="md">
            <Inline gap="lg" align="center" justify="between">
              <Stack gap="xs">
                <Inline gap="sm" align="center">
                  <BezentIcon name="attendance" size={20} />
                  <strong>
                    {hasPunchedIn ? `Checked in at ${today.checkInTime}` : 'Not checked in yet'}
                  </strong>
                </Inline>
                {hasPunchedOut && <span>Checked out at {today.checkOutTime}</span>}
                <Badge
                  variant={
                    today.status === 'present'
                      ? 'success'
                      : today.status === 'not_checked_in'
                        ? 'neutral'
                        : today.status === 'on_leave'
                          ? 'info'
                          : 'warning'
                  }
                >
                  {formatStatus(today.status)}
                </Badge>
              </Stack>
              <Inline gap="sm">
                {!hasPunchedIn && (
                  <Button
                    id="ess-check-in-btn"
                    variant="primary"
                    onClick={handlePunchIn}
                    loading={punchLoading}
                    leftIcon={<BezentIcon name="attendance" size={16} />}
                  >
                    Check In
                  </Button>
                )}
                {hasPunchedIn && !hasPunchedOut && (
                  <Button
                    id="ess-check-out-btn"
                    variant="secondary"
                    onClick={handlePunchOut}
                    loading={punchLoading}
                  >
                    Check Out
                  </Button>
                )}
                {hasPunchedIn && hasPunchedOut && (
                  <Badge variant="success">Attendance Recorded</Badge>
                )}
              </Inline>
            </Inline>
          </Stack>
        </Card>
      </Section>

      {/* Leave Balances */}
      <Section title={`Leave Balances — ${currentYear}`}>
        <Grid columns={4} gap="md">
          {data.leaveBalances.map((bal) => (
            <Card key={bal.leaveType}>
              <Stack gap="xs">
                <Badge variant={leaveColors[bal.leaveType] ?? 'neutral'}>
                  {capitalise(bal.leaveType)}
                </Badge>
                <strong>{bal.availableDays}</strong>
                <span>Available of {bal.totalDays} days</span>
                {bal.pendingDays > 0 && <span>{bal.pendingDays} pending</span>}
              </Stack>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Stats Row */}
      <Section title="My Overview">
        <Grid columns={3} gap="md">
          <Card>
            <Stack gap="xs">
              <Inline gap="sm" align="center">
                <BezentIcon name="requests" size={18} />
                <strong>Pending Requests</strong>
              </Inline>
              <strong>{data.pendingRequestsCount}</strong>
              <Button
                id="ess-view-requests"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ess/requests')}
              >
                View All
              </Button>
            </Stack>
          </Card>
          <Card>
            <Stack gap="xs">
              <Inline gap="sm" align="center">
                <BezentIcon name="tasks" size={18} />
                <strong>Active Tasks</strong>
              </Inline>
              <strong>{data.assignedTasksCount}</strong>
              <Button
                id="ess-view-tasks"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ess/tasks')}
              >
                View All
              </Button>
            </Stack>
          </Card>
          <Card>
            <Stack gap="xs">
              <Inline gap="sm" align="center">
                <BezentIcon name="notifications" size={18} />
                <strong>Unread Notifications</strong>
              </Inline>
              <strong>{data.unreadNotificationsCount}</strong>
              <Button
                id="ess-view-notifs"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ess/notifications')}
              >
                View All
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* Recent Notifications */}
      {data.recentNotifications.length > 0 && (
        <Section title="Recent Notifications">
          <Stack gap="sm">
            {data.recentNotifications.map((notif) => (
              <Card key={notif.id}>
                <Inline gap="md" align="center" justify="between">
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="notifications" size={14} />
                      <strong>{notif.title}</strong>
                      {!notif.isRead && <Badge variant="info">New</Badge>}
                    </Inline>
                    <span>{notif.message}</span>
                  </Stack>
                  <span>{timeAgo(notif.createdAt)}</span>
                </Inline>
              </Card>
            ))}
          </Stack>
        </Section>
      )}

      {/* Upcoming Holidays */}
      {data.upcomingHolidays.length > 0 && (
        <Section title="Upcoming Holidays">
          <Grid columns={3} gap="sm">
            {data.upcomingHolidays.slice(0, 3).map((h) => (
              <Card key={h.date}>
                <Stack gap="xs">
                  <strong>{h.name}</strong>
                  <span>
                    {formatDate(h.date)} · {h.dayOfWeek}
                  </span>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Section>
      )}
    </Page>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
