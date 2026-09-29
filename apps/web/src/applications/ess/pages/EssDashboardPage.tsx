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
  if (error) return <Alert variant="error" title="Failed to Load Dashboard" description={error} />;
  if (!data) return <EmptyState title="Workspace Unavailable" description="Unable to load employee data. Please try again." />;

  const today = data.todayAttendance;
  const hasPunchedIn = !!today.checkInTime;
  const hasPunchedOut = !!today.checkOutTime;
  const currentYear = new Date().getFullYear();

  const leaveColors: Record<string, string> = {
    annual: 'green',
    sick: 'yellow',
    casual: 'blue',
    unpaid: 'grey',
  };

  return (
    <Page>
      <PageHeader
        title={`Good ${getGreeting()}, ${data.employee.firstName}!`}
        subtitle={`${data.employee.designationTitle ?? data.employee.employmentType} · ${data.employee.departmentName ?? ''} · ${data.employee.locationName ?? ''}`}
      />

      {punchError && (
        <Alert variant="error" title="Punch Error" description={punchError} />
      )}

      {/* Attendance Widget */}
      <Section title="Today's Attendance" subtitle={formatDate(today.date)}>
        <Card>
          <Stack gap="md">
            <Inline gap="lg" alignItems="center" justifyContent="space-between">
              <Stack gap="xs">
                <Inline gap="sm" alignItems="center">
                  <BezentIcon name="attendance" size={20} />
                  <span style={{ fontWeight: 600 }}>
                    {hasPunchedIn ? `Checked in at ${today.checkInTime}` : 'Not checked in yet'}
                  </span>
                </Inline>
                {hasPunchedOut && (
                  <span>Checked out at {today.checkOutTime}</span>
                )}
                <Badge
                  variant={
                    today.status === 'present' ? 'green' :
                    today.status === 'not_checked_in' ? 'grey' :
                    today.status === 'on_leave' ? 'blue' : 'yellow'
                  }
                  label={formatStatus(today.status)}
                />
              </Stack>
              <Inline gap="sm">
                {!hasPunchedIn && (
                  <Button
                    id="ess-check-in-btn"
                    variant="primary"
                    label="Check In"
                    onClick={handlePunchIn}
                    loading={punchLoading}
                    leadingIcon={<BezentIcon name="attendance" size={16} />}
                  />
                )}
                {hasPunchedIn && !hasPunchedOut && (
                  <Button
                    id="ess-check-out-btn"
                    variant="secondary"
                    label="Check Out"
                    onClick={handlePunchOut}
                    loading={punchLoading}
                  />
                )}
                {hasPunchedIn && hasPunchedOut && (
                  <Badge variant="green" label="Attendance Recorded" />
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
                <Badge variant={leaveColors[bal.leaveType] ?? 'grey'} label={capitalise(bal.leaveType)} />
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>{bal.availableDays}</span>
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
              <Inline gap="sm" alignItems="center">
                <BezentIcon name="requests" size={18} />
                <span style={{ fontWeight: 600 }}>Pending Requests</span>
              </Inline>
              <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{data.pendingRequestsCount}</span>
              <Button id="ess-view-requests" variant="ghost" label="View All" size="sm" onClick={() => navigate('/ess/requests')} />
            </Stack>
          </Card>
          <Card>
            <Stack gap="xs">
              <Inline gap="sm" alignItems="center">
                <BezentIcon name="tasks" size={18} />
                <span style={{ fontWeight: 600 }}>Active Tasks</span>
              </Inline>
              <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{data.assignedTasksCount}</span>
              <Button id="ess-view-tasks" variant="ghost" label="View All" size="sm" onClick={() => navigate('/ess/tasks')} />
            </Stack>
          </Card>
          <Card>
            <Stack gap="xs">
              <Inline gap="sm" alignItems="center">
                <BezentIcon name="notifications" size={18} />
                <span style={{ fontWeight: 600 }}>Unread Notifications</span>
              </Inline>
              <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{data.unreadNotificationsCount}</span>
              <Button id="ess-view-notifs" variant="ghost" label="View All" size="sm" onClick={() => navigate('/ess/notifications')} />
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
                <Inline gap="md" alignItems="center" justifyContent="space-between">
                  <Stack gap="xs">
                    <Inline gap="sm" alignItems="center">
                      <BezentIcon name="notifications" size={14} />
                      <span style={{ fontWeight: 600 }}>{notif.title}</span>
                      {!notif.isRead && <Badge variant="blue" label="New" />}
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
                  <span style={{ fontWeight: 600 }}>{h.name}</span>
                  <span>{formatDate(h.date)} · {h.dayOfWeek}</span>
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
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
