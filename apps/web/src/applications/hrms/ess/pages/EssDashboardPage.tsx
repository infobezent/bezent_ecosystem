import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
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
  ProgressBar,
  Avatar,
  EmployeeCartoonAvatar,
  Divider,
  Modal,
  Input,
} from '../../../../design-system/components';
import {
  AttendanceMonthlyCalendar,
  EssAttendanceHero,
  type AttendanceSummaryMetrics,
} from '../components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  essApi,
  type EssDashboardData,
  type EssFeedPost,
  type EssAttendanceRecord,
} from '../api/essApi';

export function EssDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<EssDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Punch Loading
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);

  // Payslip privacy toggle
  const [showSalary, setShowSalary] = useState(false);

  // Company Feed category filter
  const [feedCategory, setFeedCategory] = useState<'all' | 'celebrations' | 'people' | 'events'>(
    'all',
  );
  const [localPosts, setLocalPosts] = useState<EssFeedPost[]>([]);

  // Feed comment dialog
  const [commentModalPost, setCommentModalPost] = useState<EssFeedPost | null>(null);
  const [commentText, setCommentText] = useState('');

  // Cartoon avatar preference state
  const [avatarPreference, setAvatarPreference] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bezent_ess_avatar_preference');
    } catch {
      return null;
    }
  });
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleSelectAvatarPreference = (pref: string | null) => {
    setAvatarPreference(pref);
    try {
      if (pref) {
        localStorage.setItem('bezent_ess_avatar_preference', pref);
      } else {
        localStorage.removeItem('bezent_ess_avatar_preference');
      }
    } catch {
      // ignore storage unavailability
    }
    setShowAvatarModal(false);
  };

  // Monthly Attendance Snapshot Month state
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date());
  const [monthSummary, setMonthSummary] = useState<AttendanceSummaryMetrics>({
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercent: 0,
    totalWorkingDays: 0,
  });
  const [monthHistory, setMonthHistory] = useState<EssAttendanceRecord[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await essApi.getDashboard();
      setData(result);
      if (result.companyFeed) {
        setLocalPosts(result.companyFeed);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Sync initial monthly attendance from dashboard data
  useEffect(() => {
    if (data?.monthlyAttendance) {
      setMonthSummary({
        presentDays: data.monthlyAttendance.presentDays,
        lateDays: data.monthlyAttendance.lateDays,
        absentDays: data.monthlyAttendance.absentDays,
        attendancePercent: data.monthlyAttendance.attendancePercent,
        totalWorkingDays: data.monthlyAttendance.totalWorkingDays,
      });
      if (data.monthlyAttendance.history) {
        setMonthHistory(data.monthlyAttendance.history);
      }
    }
  }, [data]);

  const handleMonthChange = async (newDate: Date) => {
    setSelectedMonthDate(newDate);
    setMonthLoading(true);
    try {
      const monthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
      const att = await essApi.getAttendance({ month: monthStr });
      if (att.summary) {
        setMonthSummary({
          presentDays: att.summary.presentDays,
          lateDays: att.summary.lateMarksCount ?? 0,
          absentDays: att.summary.absentDays,
          attendancePercent: att.summary.attendancePercent ?? 0,
          totalWorkingDays: att.summary.totalWorkingDays,
        });
      }
      setMonthHistory(att.history || []);
    } catch {
      // safe fallback on error
    } finally {
      setMonthLoading(false);
    }
  };

  const handlePunchIn = async () => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      await essApi.checkIn({ workLocation: 'office' });
      setPunchSuccess('Checked in successfully!');
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
    setPunchSuccess(null);
    try {
      await essApi.checkOut();
      setPunchSuccess('Checked out successfully!');
      await fetchDashboard();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setPunchLoading(true);
    setPunchError(null);
    try {
      await essApi.startBreak({ breakType: 'tea', notes: 'Short tea break' });
      setPunchSuccess('Started break.');
      await fetchDashboard();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Failed to start break');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setPunchLoading(true);
    setPunchError(null);
    try {
      await essApi.endBreak();
      setPunchSuccess('Break ended. Back to work!');
      await fetchDashboard();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Failed to end break');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleToggleLike = (postId: string) => {
    setLocalPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const wasLiked = !!post.hasLiked;
          return {
            ...post,
            hasLiked: !wasLiked,
            likesCount: wasLiked ? post.likesCount - 1 : post.likesCount + 1,
          };
        }
        return post;
      }),
    );
  };

  const handleAddComment = () => {
    if (!commentModalPost || !commentText.trim()) return;
    setLocalPosts((prev) =>
      prev.map((post) => {
        if (post.id === commentModalPost.id) {
          return {
            ...post,
            commentsCount: post.commentsCount + 1,
          };
        }
        return post;
      }),
    );
    setCommentModalPost(null);
    setCommentText('');
  };

  // Filtered feed posts
  const filteredFeedPosts = useMemo(() => {
    if (feedCategory === 'all') return localPosts;
    if (feedCategory === 'celebrations') {
      return localPosts.filter((p) => p.type === 'birthday' || p.type === 'anniversary');
    }
    if (feedCategory === 'people') {
      return localPosts.filter((p) => p.type === 'new_joiner');
    }
    if (feedCategory === 'events') {
      return localPosts.filter(
        (p) => p.type === 'event' || p.type === 'holiday' || p.type === 'announcement',
      );
    }
    return localPosts;
  }, [localPosts, feedCategory]);

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

  const emp = data.employee;
  const today = data.todayAttendance;
  const briefing = data.dailyBriefing;
  const growth = data.growth;
  const payslip = data.latestPayslip;
  const team = data.myTeam;

  const hasPunchedIn = !!today.checkInTime;
  const hasPunchedOut = !!today.checkOutTime;

  const canCheckIn = !hasPunchedIn;
  const canCheckOut = hasPunchedIn && !hasPunchedOut;
  const checkInDisabledReason = hasPunchedIn
    ? hasPunchedOut
      ? 'Already checked out for today'
      : 'Already checked in today'
    : undefined;
  const checkOutDisabledReason = !hasPunchedIn
    ? 'Check in first to record attendance'
    : hasPunchedOut
      ? 'Already checked out for today'
      : undefined;

  return (
    <Page>
      {punchError && (
        <Alert variant="error" title="Action Error">
          {punchError}
        </Alert>
      )}
      {punchSuccess && (
        <Alert variant="success" title="Success">
          {punchSuccess}
        </Alert>
      )}

      {/* ── 1. Unified Employee Welcome + Attendance Hero Card (Approved Design) ─── */}
      <EssAttendanceHero
        employee={{
          firstName: emp.firstName,
          lastName: emp.lastName,
          gender: emp.gender,
          avatarPreference,
          designationTitle: emp.designationTitle,
          departmentName: emp.departmentName,
          employeeNumber: emp.employeeNumber,
          locationName: emp.locationName,
          employmentStatus: emp.employmentStatus,
        }}
        attendance={{
          date: today.date,
          checkInTime: today.checkInTime,
          checkOutTime: today.checkOutTime,
          workedMinutes: today.workedMinutes,
          breakMinutes: today.breakMinutes,
          isOnBreak: today.isOnBreak,
          currentBreakType: today.currentBreakType,
          currentBreakStartTime: today.currentBreakStartTime,
          status: today.status,
          shift: today.shift,
          workLocation: today.workLocation,
        }}
        briefing={{
          pendingActionsCount: briefing.pendingActionsCount,
          actionsSummary: briefing.actionsSummary,
        }}
        timezone="IST"
        punchLoading={punchLoading}
        canCheckIn={canCheckIn}
        canCheckOut={canCheckOut}
        checkInDisabledReason={checkInDisabledReason}
        checkOutDisabledReason={checkOutDisabledReason}
        onCheckIn={handlePunchIn}
        onCheckOut={handlePunchOut}
        onStartBreak={handleStartBreak}
        onEndBreak={handleEndBreak}
        onAvatarClick={() => setShowAvatarModal(true)}
        onViewProfileClick={() => navigate('/ess/profile')}
        onViewActionsClick={() => navigate('/ess/requests')}
      />

      {/* ── 2. Monthly Attendance Snapshot (Approved V1.0 Layout) ─── */}
      <AttendanceMonthlyCalendar
        initialDate={selectedMonthDate}
        summary={monthSummary}
        history={monthHistory}
        loading={monthLoading}
        onMonthChange={handleMonthChange}
        onViewDetailsClick={() => navigate('/ess/attendance')}
      />

      {/* ── 3. Quick Actions ──────────────────────────────────────── */}
      <Section title="Quick Actions" subtitle="Frequently used shortcuts">
        <Card variant="default">
          <Grid columns={4} gap="sm">
            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/leave')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="leave" size={20} />
                <strong>Apply Leave</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/attendance')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="attendance" size={20} />
                <strong>Regularize</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/payslips')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="payroll" size={20} />
                <strong>Payslip</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/requests')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="helpdesk" size={20} />
                <strong>Helpdesk</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/documents')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="documents" size={20} />
                <strong>Documents</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/profile')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="employees" size={20} />
                <strong>My Job</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/tasks')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="tasks" size={20} />
                <strong>Learning</strong>
              </Stack>
            </Card>

            <Card variant="interactive" padding="sm" onClick={() => navigate('/ess/timesheets')}>
              <Stack gap="xs" align="center">
                <BezentIcon name="timesheets" size={20} />
                <strong>Timesheets</strong>
              </Stack>
            </Card>
          </Grid>
        </Card>
      </Section>

      {/* ── 5. My Action Center & 6. Leave Balance ─────────────────── */}
      <Grid columns={2} gap="md">
        {/* 5. My Action Center */}
        <Section title="My Action Center" subtitle="Items requiring employee attention">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <strong>Pending Action Items</strong>
                <Badge variant="warning" size="sm">
                  {data.actionCenterTasks.length} Pending
                </Badge>
              </Inline>

              <Stack gap="xs">
                {data.actionCenterTasks.map((act) => (
                  <Card key={act.id} variant="flat" padding="sm">
                    <Inline justify="between" align="center" wrap>
                      <Stack gap="xs">
                        <strong>{act.title}</strong>
                        <span>{act.subtitle}</span>
                      </Stack>
                      <Inline gap="sm" align="center">
                        <Badge
                          variant={
                            act.priority === 'urgent'
                              ? 'danger'
                              : act.priority === 'action_required'
                                ? 'warning'
                                : 'info'
                          }
                          size="sm"
                        >
                          {act.priority.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Button variant="secondary" size="sm" onClick={() => navigate(act.link)}>
                          Action
                        </Button>
                      </Inline>
                    </Inline>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Section>

        {/* 6. Leave Balance & Upcoming Leave */}
        <Section title="My Leave" subtitle="Available quotas and next approved leave">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <strong>Leave Entitlements</strong>
                <Button variant="ghost" size="sm" onClick={() => navigate('/ess/leave')}>
                  View Details →
                </Button>
              </Inline>

              <Grid columns={3} gap="sm">
                {data.leaveBalances.slice(0, 3).map((bal) => (
                  <Card key={bal.leaveType} variant="flat" padding="sm">
                    <Stack gap="xs" align="center">
                      <h1>{bal.availableDays}</h1>
                      <span>{bal.leaveType.toUpperCase()} LEAVE</span>
                    </Stack>
                  </Card>
                ))}
              </Grid>

              <Card variant="flat" padding="sm">
                <Inline justify="between" align="center">
                  <span>
                    Next approved leave:{' '}
                    <strong>{data.nextApprovedLeave || 'No upcoming leave'}</strong>
                  </span>
                  <Button variant="primary" size="sm" onClick={() => navigate('/ess/leave')}>
                    Apply Leave
                  </Button>
                </Inline>
              </Card>
            </Stack>
          </Card>
        </Section>
      </Grid>

      {/* ── 7. Latest Payslip & Pay Information ────────────────────── */}
      <Section title="Latest Payslip & Compensation">
        <Card variant="default">
          <Inline justify="between" align="center" wrap>
            <Inline gap="md" align="center">
              <BezentIcon name="payroll" size={32} />
              <Stack gap="xs">
                <Inline gap="sm" align="center">
                  <strong>Latest Payslip — {payslip?.month || 'September 2026'}</strong>
                  <Badge variant="success" size="sm">
                    Available
                  </Badge>
                </Inline>
                <Inline gap="sm" align="baseline">
                  <h2>
                    {showSalary
                      ? `₹ ${payslip?.actualAmount?.toLocaleString('en-IN') || '84,500'}`
                      : '₹ ••••••'}
                  </h2>
                  <span>{showSalary ? 'Net Disbursed' : 'Net pay hidden for privacy'}</span>
                </Inline>
              </Stack>
            </Inline>

            <Inline gap="sm" align="center">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<BezentIcon name="lock" size={16} />}
                onClick={() => setShowSalary(!showSalary)}
              >
                {showSalary ? 'Hide Amount' : 'Secure View'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<BezentIcon name="download" size={16} />}
                onClick={() => navigate('/ess/payslips')}
              >
                Download PDF
              </Button>
            </Inline>
          </Inline>
        </Card>
      </Section>

      {/* ── 8. Company Feed — Employee Connect ─────────────────────── */}
      <Section
        title="Company Feed — Employee Connect"
        subtitle="Celebrate milestones, welcome joiners, and stay updated across the company"
      >
        <Card variant="default">
          <Stack gap="md">
            {/* Feed Category Tabs */}
            <Inline justify="between" align="center" wrap>
              <Inline gap="xs" align="center">
                <Button
                  variant={feedCategory === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFeedCategory('all')}
                >
                  All
                </Button>
                <Button
                  variant={feedCategory === 'celebrations' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFeedCategory('celebrations')}
                >
                  Celebrations
                </Button>
                <Button
                  variant={feedCategory === 'people' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFeedCategory('people')}
                >
                  People
                </Button>
                <Button
                  variant={feedCategory === 'events' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFeedCategory('events')}
                >
                  Events
                </Button>
              </Inline>

              <Button variant="ghost" size="sm" onClick={() => navigate('/ess/feed')}>
                View Full Feed →
              </Button>
            </Inline>

            {/* Posts Stream */}
            <Stack gap="sm">
              {filteredFeedPosts.map((post) => (
                <Card key={post.id} variant="flat">
                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <Avatar initials={post.title[0] || 'C'} size="md" />
                        <Stack gap="xs">
                          <strong>{post.title}</strong>
                          <span>
                            {post.subtitle} • {post.date}
                          </span>
                        </Stack>
                      </Inline>
                      <Badge variant="info" size="sm">
                        {post.badge}
                      </Badge>
                    </Inline>

                    <p>{post.message}</p>

                    <Divider />

                    {/* Interaction Buttons: Like, Comment */}
                    <Inline gap="md" align="center">
                      <Button
                        variant={post.hasLiked ? 'primary' : 'ghost'}
                        size="sm"
                        leftIcon={<BezentIcon name="heart" size={14} />}
                        onClick={() => handleToggleLike(post.id)}
                      >
                        {post.hasLiked ? 'Liked' : 'Like'} ({post.likesCount})
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<BezentIcon name="chat" size={14} />}
                        onClick={() => setCommentModalPost(post)}
                      >
                        Comment ({post.commentsCount})
                      </Button>
                    </Inline>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      </Section>

      {/* ── 9. Upcoming Events & 10. Goals, Performance & Learning ─── */}
      <Grid columns={2} gap="md">
        {/* 9. Upcoming Events */}
        <Section title="Upcoming Events & Holidays">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <strong>Scheduled Events</strong>
                <Button variant="ghost" size="sm" onClick={() => navigate('/ess/leave')}>
                  Calendar →
                </Button>
              </Inline>

              <Stack gap="xs">
                {data.upcomingEvents.map((evt) => (
                  <Card key={evt.id} variant="flat" padding="sm">
                    <Inline gap="md" align="center">
                      <Card variant="default" padding="sm">
                        <Stack gap="xs" align="center">
                          <span>{evt.monthShort}</span>
                          <strong>{evt.dayNumber}</strong>
                        </Stack>
                      </Card>
                      <Stack gap="xs">
                        <strong>{evt.title}</strong>
                        <span>
                          {evt.category} • {evt.teamOrVenue}
                        </span>
                      </Stack>
                    </Inline>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Section>

        {/* 10. Goals, Performance & Learning */}
        <Section title="My Growth">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <strong>Learning & Goals</strong>
                <Button variant="ghost" size="sm" onClick={() => navigate('/ess/tasks')}>
                  View Progress →
                </Button>
              </Inline>

              <Card variant="flat" padding="sm">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <span>Learning Progress</span>
                    <strong>{growth.learningProgressPercent}% completed</strong>
                  </Inline>
                  <ProgressBar
                    value={growth.learningProgressPercent}
                    max={100}
                    variant="primary"
                    size="md"
                  />
                  <span>{growth.activeCoursesCount} active courses in progress</span>
                </Stack>
              </Card>

              <Grid columns={3} gap="sm">
                <Card variant="flat" padding="sm">
                  <Stack gap="xs" align="center">
                    <strong>{growth.activeGoalsCount}</strong>
                    <span>Active Goals</span>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs" align="center">
                    <strong>{growth.pendingReviewsCount}</strong>
                    <span>Pending Reviews</span>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs" align="center">
                    <strong>{growth.nextDeadline || 'Oct 31'}</strong>
                    <span>Next Deadline</span>
                  </Stack>
                </Card>
              </Grid>
            </Stack>
          </Card>
        </Section>
      </Grid>

      {/* ── 11. My Team & 12. My Profile Snapshot ─────────────────── */}
      <Grid columns={2} gap="md">
        {/* 11. My Team (Conditional Widget) */}
        <Section title="My Team">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <Stack gap="xs">
                  <span>Reporting Manager</span>
                  <strong>
                    {team?.reportingManagerName} ({team?.reportingManagerDesignation})
                  </strong>
                </Stack>
                <Badge variant="info" size="sm">
                  {team?.teamMembers?.length || 4} Members
                </Badge>
              </Inline>

              <Divider />

              <Stack gap="xs">
                {team?.teamMembers.map((member) => (
                  <Card key={member.id} variant="flat" padding="sm">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <Avatar initials={member.name[0] || 'T'} size="sm" />
                        <Stack gap="xs">
                          <strong>{member.name}</strong>
                          <span>{member.designation}</span>
                        </Stack>
                      </Inline>

                      <Badge
                        variant={
                          member.status === 'working'
                            ? 'success'
                            : member.status === 'on_break'
                              ? 'warning'
                              : member.status === 'on_leave'
                                ? 'danger'
                                : 'neutral'
                        }
                        size="sm"
                      >
                        {member.status.replace('_', ' ').toUpperCase()} • {member.workLocation}
                      </Badge>
                    </Inline>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Section>

        {/* 12. My Profile Snapshot */}
        <Section title="My Profile Snapshot">
          <Card variant="default">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <Stack gap="xs">
                  <strong>
                    {emp.firstName} {emp.lastName || ''}
                  </strong>
                  <span>
                    {emp.employeeNumber} • {emp.designationTitle || 'Software Engineer'}
                  </span>
                </Stack>
                <Button variant="secondary" size="sm" onClick={() => navigate('/ess/profile')}>
                  View Profile
                </Button>
              </Inline>

              <Card variant="flat" padding="sm">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <span>Profile Completeness</span>
                    <strong>{data.profileCompleteness}%</strong>
                  </Inline>
                  <ProgressBar
                    value={data.profileCompleteness}
                    max={100}
                    variant="success"
                    size="sm"
                  />
                </Stack>
              </Card>

              <Grid columns={2} gap="sm">
                <Stack gap="xs">
                  <span>Department</span>
                  <strong>{emp.departmentName || 'Engineering'}</strong>
                </Stack>
                <Stack gap="xs">
                  <span>Work Location</span>
                  <strong>{emp.locationName || 'Chennai'}</strong>
                </Stack>
                <Stack gap="xs">
                  <span>Employment Type</span>
                  <strong>{emp.employmentType || 'Permanent'}</strong>
                </Stack>
                <Stack gap="xs">
                  <span>Joining Date</span>
                  <strong>
                    {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                  </strong>
                </Stack>
              </Grid>
            </Stack>
          </Card>
        </Section>
      </Grid>

      {/* ── Comment Dialog Modal ──────────────────────────────────── */}
      {commentModalPost && (
        <Modal
          isOpen={true}
          title={`Comment on ${commentModalPost.title}`}
          onClose={() => setCommentModalPost(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setCommentModalPost(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddComment} disabled={!commentText.trim()}>
                Post Comment
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <Card variant="flat" padding="sm">
              <p>{commentModalPost.message}</p>
            </Card>
            <Input
              label="Your Message / Wishes"
              placeholder="Write a congratulatory wish or comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </Stack>
        </Modal>
      )}

      {/* ── Cartoon Avatar Customization Modal ────────────────────── */}
      {showAvatarModal && (
        <Modal
          isOpen={true}
          title="Customize Cartoon Character Avatar"
          onClose={() => setShowAvatarModal(false)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setShowAvatarModal(false)}>
                Close
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <p>
              Choose your preferred cartoon avatar character for the BEZENT ESS Dashboard. By
              default, your verified profile details determine your character.
            </p>

            <Grid columns={3} gap="md">
              {/* Male Character */}
              <Card variant={avatarPreference === 'male' ? 'tint-blue' : 'flat'} padding="sm">
                <Stack gap="sm" align="center">
                  <EmployeeCartoonAvatar
                    avatarVariant="male"
                    size="lg"
                    employeeName="Male Character (Arjun)"
                  />
                  <strong>Male Character</strong>
                  <span>Office Classic</span>
                  <Button
                    variant={avatarPreference === 'male' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSelectAvatarPreference('male')}
                  >
                    {avatarPreference === 'male' ? 'Active' : 'Select'}
                  </Button>
                </Stack>
              </Card>

              {/* Female Character */}
              <Card variant={avatarPreference === 'female' ? 'tint-blue' : 'flat'} padding="sm">
                <Stack gap="sm" align="center">
                  <EmployeeCartoonAvatar
                    avatarVariant="female"
                    size="lg"
                    employeeName="Female Character (Priya)"
                  />
                  <strong>Female Character</strong>
                  <span>Office Modern</span>
                  <Button
                    variant={avatarPreference === 'female' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSelectAvatarPreference('female')}
                  >
                    {avatarPreference === 'female' ? 'Active' : 'Select'}
                  </Button>
                </Stack>
              </Card>

              {/* Neutral Default Character */}
              <Card variant={avatarPreference === 'neutral' ? 'tint-blue' : 'flat'} padding="sm">
                <Stack gap="sm" align="center">
                  <EmployeeCartoonAvatar
                    avatarVariant="neutral"
                    size="lg"
                    employeeName="Neutral Character"
                  />
                  <strong>Neutral Character</strong>
                  <span>Corporate Default</span>
                  <Button
                    variant={avatarPreference === 'neutral' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleSelectAvatarPreference('neutral')}
                  >
                    {avatarPreference === 'neutral' ? 'Active' : 'Select'}
                  </Button>
                </Stack>
              </Card>
            </Grid>

            <Inline justify="between" align="center">
              <span>
                Current Selection:{' '}
                <strong>
                  {avatarPreference
                    ? `Manual (${avatarPreference})`
                    : `Automatic (Profile: ${emp.gender || 'neutral'})`}
                </strong>
              </span>
              {avatarPreference && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAvatarPreference(null)}
                >
                  Reset to Profile Automatic
                </Button>
              )}
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
