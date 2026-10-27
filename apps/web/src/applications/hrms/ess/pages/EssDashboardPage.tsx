import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  Alert,
  LoadingState,
  EmptyState,
  ProgressBar,
  EmployeeCartoonAvatar,
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
import { useEssAttendance } from '../hooks';

export function EssDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<EssDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const {
    today: attendanceToday,
    canCheckIn,
    canCheckOut,
    checkInDisabledReason,
    checkOutDisabledReason,
    punchLoading,
    punchError,
    punchSuccess,
    handleCheckIn,
    handleCheckOut,
    handleStartBreak,
    handleEndBreak,
  } = useEssAttendance({
    todayAttendance: data?.todayAttendance,
    onRefresh: fetchDashboard,
  });

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
      return localPosts.filter(
        (p) => p.type === 'birthday' || p.type === 'anniversary' || p.type === 'milestone_poster',
      );
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
  const today = attendanceToday;
  const briefing = data.dailyBriefing;
  const growth = data.growth;
  const payslip = data.latestPayslip;
  const team = data.myTeam;

  return (
    <Page>
      <div className="ess-dashboard-content">
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
          timezone={
            attendanceToday?.timezone ||
            data?.todayAttendance?.timezone ||
            attendanceToday?.shift?.effectiveTimezone ||
            data?.todayAttendance?.shift?.effectiveTimezone ||
            'IST'
          }
          punchLoading={punchLoading}
          canCheckIn={canCheckIn}
          canCheckOut={canCheckOut}
          checkInDisabledReason={checkInDisabledReason}
          checkOutDisabledReason={checkOutDisabledReason}
          onCheckIn={() => handleCheckIn('office')}
          onCheckOut={handleCheckOut}
          onStartBreak={() => handleStartBreak('tea')}
          onEndBreak={handleEndBreak}
          onAvatarClick={() => setShowAvatarModal(true)}
          onViewProfileClick={() => navigate('/ess/profile')}
          onViewActionsClick={() => navigate('/ess/requests')}
        />

        {/* ── 2. Quick Actions ──────────────────────────────────────── */}
        <div className="ess-section-block">
          <div className="ess-section-header">
            <h2 className="ess-section-title">Quick Actions</h2>
            <p className="ess-section-subtitle">Frequently used shortcuts</p>
          </div>
          <div className="ess-quick-actions-card">
            <div className="ess-quick-actions-grid">
              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--blue"
                onClick={() => navigate('/ess/leave')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="leave" size={20} />
                </div>
                <span className="ess-quick-action-label">Apply Leave</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--mint"
                onClick={() => navigate('/ess/attendance')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="attendance" size={20} />
                </div>
                <span className="ess-quick-action-label">Regularize</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--lavender"
                onClick={() => navigate('/ess/payslips')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="payroll" size={20} />
                </div>
                <span className="ess-quick-action-label">Payslip</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--peach"
                onClick={() => navigate('/ess/requests')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="helpdesk" size={20} />
                </div>
                <span className="ess-quick-action-label">Helpdesk</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--teal"
                onClick={() => navigate('/ess/documents')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="documents" size={20} />
                </div>
                <span className="ess-quick-action-label">Documents</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--rose"
                onClick={() => navigate('/ess/profile')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="employees" size={20} />
                </div>
                <span className="ess-quick-action-label">My Job</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--indigo"
                onClick={() => navigate('/ess/tasks')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="tasks" size={20} />
                </div>
                <span className="ess-quick-action-label">Learning</span>
              </button>

              <button
                type="button"
                className="ess-quick-action-tile ess-quick-action-tile--plum"
                onClick={() => navigate('/ess/timesheets')}
              >
                <div className="ess-quick-action-icon-wrap">
                  <BezentIcon name="timesheets" size={20} />
                </div>
                <span className="ess-quick-action-label">Timesheets</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. Monthly Attendance Snapshot (Approved V1.0 Layout) ─── */}
        <AttendanceMonthlyCalendar
          initialDate={selectedMonthDate}
          summary={monthSummary}
          history={monthHistory}
          loading={monthLoading}
          onMonthChange={handleMonthChange}
          onViewDetailsClick={() => navigate('/ess/attendance')}
        />

        {/* ── 5. My Action Center & 6. Leave Balance ─────────────────── */}
        <div className="ess-dashboard-row-2col">
          {/* 5. My Action Center */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">My Action Center</h2>
                <p className="ess-panel-subtitle">Items requiring employee attention</p>
              </div>
              <div className="ess-action-center-badge">
                <span className="ess-action-center-badge-dot" />
                <span>{data.actionCenterTasks.length} Pending</span>
              </div>
            </div>

            <div className="ess-action-items-list">
              {data.actionCenterTasks.map((act) => (
                <div key={act.id} className="ess-action-item-card">
                  <div className="ess-action-item-info">
                    <div className="ess-action-item-title">{act.title}</div>
                    <div className="ess-action-item-desc">{act.subtitle}</div>
                  </div>
                  <div className="ess-action-item-controls">
                    <span
                      className={`ess-action-priority-badge ess-action-priority-badge--${act.priority}`}
                    >
                      {act.priority.replace('_', ' ').toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className="ess-action-item-btn"
                      onClick={() => navigate(act.link)}
                    >
                      Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Leave Balance & Upcoming Leave */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">My Leave</h2>
                <p className="ess-panel-subtitle">Available quotas and next approved leave</p>
              </div>
              <button
                type="button"
                className="ess-panel-header-link"
                onClick={() => navigate('/ess/leave')}
              >
                View Details →
              </button>
            </div>

            <div className="ess-leave-quotas-grid">
              {data.leaveBalances.slice(0, 3).map((bal, idx) => {
                const colorVariant = idx === 0 ? 'blue' : idx === 1 ? 'mint' : 'lavender';
                return (
                  <div
                    key={bal.leaveType}
                    className={`ess-leave-quota-card ess-leave-quota-card--${colorVariant}`}
                  >
                    <div className="ess-leave-quota-number">{bal.availableDays}</div>
                    <div className="ess-leave-quota-label">{bal.leaveType.toUpperCase()} LEAVE</div>
                    <div className="ess-leave-quota-sub">Days Available</div>
                  </div>
                );
              })}
            </div>

            <div className="ess-next-leave-card">
              <div className="ess-next-leave-info">
                <div className="ess-next-leave-icon">
                  <BezentIcon name="calendar" size={16} />
                </div>
                <div className="ess-next-leave-text">
                  Next approved leave:{' '}
                  <strong>{data.nextApprovedLeave || 'No upcoming leave'}</strong>
                </div>
              </div>
              <button
                type="button"
                className="ess-apply-leave-btn"
                onClick={() => navigate('/ess/leave')}
              >
                Apply Leave
              </button>
            </div>
          </div>
        </div>

        {/* ── 7. Latest Payslip & Pay Information ────────────────────── */}
        <div className="ess-panel-card ess-payslip-panel">
          <div className="ess-payslip-content">
            <div className="ess-payslip-left">
              <div className="ess-payslip-icon-wrap">
                <BezentIcon name="payroll" size={28} />
              </div>
              <div className="ess-payslip-info">
                <div className="ess-payslip-header-row">
                  <h2 className="ess-payslip-title">
                    Latest Payslip — {payslip?.month || 'September 2026'}
                  </h2>
                  <span className="ess-payslip-status-badge">Available</span>
                </div>
                <div className="ess-payslip-amount-row">
                  <span className="ess-payslip-amount">
                    {showSalary
                      ? `₹ ${payslip?.actualAmount?.toLocaleString('en-IN') || '84,500'}`
                      : '₹ ••••••'}
                  </span>
                  <span className="ess-payslip-amount-sub">
                    {showSalary ? 'Net Disbursed' : 'Net pay hidden for privacy'}
                  </span>
                </div>
              </div>
            </div>

            <div className="ess-payslip-actions">
              <button
                type="button"
                className="ess-btn-secondary"
                onClick={() => setShowSalary(!showSalary)}
              >
                <BezentIcon name="lock" size={15} />
                <span>{showSalary ? 'Hide Amount' : 'Secure View'}</span>
              </button>
              <button
                type="button"
                className="ess-btn-primary"
                onClick={() => navigate('/ess/payslips')}
              >
                <BezentIcon name="download" size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 8. Company Feed — Employee Connect ─────────────────────── */}
        <div className="ess-panel-card">
          <div className="ess-panel-header">
            <div className="ess-panel-header-titles">
              <h2 className="ess-panel-title">Company Feed — Employee Connect</h2>
              <p className="ess-panel-subtitle">
                Celebrate milestones, welcome joiners, and stay updated across the company
              </p>
            </div>
            <button
              type="button"
              className="ess-panel-header-link"
              onClick={() => navigate('/ess/feed')}
            >
              View Full Feed →
            </button>
          </div>

          {/* Feed Category Filter Bar */}
          <div className="ess-feed-filter-bar">
            <button
              type="button"
              className={`ess-feed-filter-btn ${feedCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setFeedCategory('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`ess-feed-filter-btn ${feedCategory === 'celebrations' ? 'is-active' : ''}`}
              onClick={() => setFeedCategory('celebrations')}
            >
              Celebrations
            </button>
            <button
              type="button"
              className={`ess-feed-filter-btn ${feedCategory === 'people' ? 'is-active' : ''}`}
              onClick={() => setFeedCategory('people')}
            >
              People
            </button>
            <button
              type="button"
              className={`ess-feed-filter-btn ${feedCategory === 'events' ? 'is-active' : ''}`}
              onClick={() => setFeedCategory('events')}
            >
              Events
            </button>
          </div>

          {/* Posts Stream */}
          <div className="ess-feed-stream">
            {filteredFeedPosts.map((post) => (
              <div key={post.id} className="ess-feed-post-card">
                <div className="ess-feed-post-header">
                  <div className="ess-feed-post-author">
                    <div className="ess-feed-post-avatar">{post.title[0] || 'C'}</div>
                    <div className="ess-feed-post-meta">
                      <span className="ess-feed-post-title">{post.title}</span>
                      <span className="ess-feed-post-sub">
                        {post.subtitle} • {post.date}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`ess-feed-post-badge ${post.type === 'milestone_poster' ? 'ess-feed-post-badge--amber' : ''}`}
                  >
                    {post.badge}
                  </span>
                </div>

                <p className="ess-feed-post-message">{post.message}</p>

                {post.type === 'milestone_poster' && post.posterData && (
                  <Card variant="tint-amber" padding="md">
                    <Inline gap="md" align="center">
                      <BezentIcon name="award" size={28} />
                      <Stack gap="xs">
                        <strong>{post.posterData.milestoneTitle}</strong>
                        <span>
                          {post.posterData.employeeName} has achieved{' '}
                          <strong>
                            {post.posterData.hours?.toLocaleString() || '100,000'} lifetime working
                            hours
                          </strong>
                          !
                        </span>
                        {post.posterData.quote && (
                          <span className="bezent-text-muted">
                            &ldquo;{post.posterData.quote}&rdquo;
                          </span>
                        )}
                      </Stack>
                    </Inline>
                  </Card>
                )}

                <div className="ess-feed-post-footer">
                  <button
                    type="button"
                    className={`ess-feed-action-btn ${post.hasLiked ? 'is-liked' : ''}`}
                    onClick={() => handleToggleLike(post.id)}
                  >
                    <BezentIcon name="heart" size={14} />
                    <span>
                      {post.hasLiked ? 'Liked' : 'Like'} ({post.likesCount})
                    </span>
                  </button>

                  <button
                    type="button"
                    className="ess-feed-action-btn"
                    onClick={() => setCommentModalPost(post)}
                  >
                    <BezentIcon name="chat" size={14} />
                    <span>Comment ({post.commentsCount})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 9. Upcoming Events & 10. Goals, Performance & Learning ─── */}
        <div className="ess-dashboard-row-2col">
          {/* 9. Upcoming Events */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">Upcoming Events & Holidays</h2>
                <p className="ess-panel-subtitle">Scheduled Events</p>
              </div>
              <button
                type="button"
                className="ess-panel-header-link"
                onClick={() => navigate('/ess/leave')}
              >
                Calendar →
              </button>
            </div>

            <div className="ess-events-list">
              {data.upcomingEvents.map((evt) => (
                <div key={evt.id} className="ess-event-card">
                  <div className="ess-event-date-tile">
                    <span className="ess-event-date-month">{evt.monthShort}</span>
                    <span className="ess-event-date-day">{evt.dayNumber}</span>
                  </div>
                  <div className="ess-event-details">
                    <span className="ess-event-title">{evt.title}</span>
                    <span className="ess-event-venue">
                      {evt.category} • {evt.teamOrVenue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 10. Goals, Performance & Learning */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">My Growth</h2>
                <p className="ess-panel-subtitle">Learning & Goals</p>
              </div>
              <button
                type="button"
                className="ess-panel-header-link"
                onClick={() => navigate('/ess/tasks')}
              >
                View Progress →
              </button>
            </div>

            <div className="ess-learning-card">
              <div className="ess-learning-header">
                <span className="ess-learning-label">Learning Progress</span>
                <span className="ess-learning-percent">
                  {growth.learningProgressPercent}% completed
                </span>
              </div>
              <ProgressBar
                value={growth.learningProgressPercent}
                max={100}
                variant="primary"
                size="md"
              />
              <span className="ess-learning-sub">
                {growth.activeCoursesCount} active courses in progress
              </span>
            </div>

            <div className="ess-growth-metrics-grid">
              <div className="ess-growth-metric-tile ess-growth-metric-tile--blue">
                <span className="ess-growth-metric-val">{growth.activeGoalsCount}</span>
                <span className="ess-growth-metric-lbl">Active Goals</span>
              </div>
              <div className="ess-growth-metric-tile ess-growth-metric-tile--lavender">
                <span className="ess-growth-metric-val">{growth.pendingReviewsCount}</span>
                <span className="ess-growth-metric-lbl">Pending Reviews</span>
              </div>
              <div className="ess-growth-metric-tile ess-growth-metric-tile--mint">
                <span className="ess-growth-metric-val">{growth.nextDeadline || 'Oct 31'}</span>
                <span className="ess-growth-metric-lbl">Next Deadline</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 11. My Team & 12. My Profile Snapshot ─────────────────── */}
        <div className="ess-dashboard-row-2col">
          {/* 11. My Team */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">My Team</h2>
                <p className="ess-panel-subtitle">
                  Reporting Manager: {team?.reportingManagerName} (
                  {team?.reportingManagerDesignation})
                </p>
              </div>
              <div className="ess-team-count-badge">{team?.teamMembers?.length || 4} Members</div>
            </div>

            <div className="ess-team-members-list">
              {team?.teamMembers.map((member) => (
                <div key={member.id} className="ess-team-member-card">
                  <div className="ess-team-member-identity">
                    <div className="ess-team-member-avatar">{member.name[0] || 'T'}</div>
                    <div className="ess-team-member-info">
                      <span className="ess-team-member-name">{member.name}</span>
                      <span className="ess-team-member-role">{member.designation}</span>
                    </div>
                  </div>

                  <div className={`ess-team-status-badge ess-team-status-badge--${member.status}`}>
                    <span className="ess-team-status-dot" />
                    <span>
                      {member.status.replace('_', ' ').toUpperCase()} • {member.workLocation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 12. My Profile Snapshot */}
          <div className="ess-panel-card">
            <div className="ess-panel-header">
              <div className="ess-panel-header-titles">
                <h2 className="ess-panel-title">
                  {emp.firstName} {emp.lastName || ''}
                </h2>
                <p className="ess-panel-subtitle">
                  {emp.employeeNumber} • {emp.designationTitle || 'Software Engineer'}
                </p>
              </div>
              <button
                type="button"
                className="ess-panel-header-btn"
                onClick={() => navigate('/ess/profile')}
              >
                View Profile
              </button>
            </div>

            <div className="ess-profile-completeness-card">
              <div className="ess-profile-completeness-header">
                <span className="ess-profile-completeness-label">Profile Completeness</span>
                <span className="ess-profile-completeness-val">{data.profileCompleteness}%</span>
              </div>
              <ProgressBar value={data.profileCompleteness} max={100} variant="success" size="sm" />
            </div>

            <div className="ess-profile-info-grid">
              <div className="ess-profile-info-item">
                <span className="ess-profile-info-label">Department</span>
                <span className="ess-profile-info-value">
                  {emp.departmentName || 'Engineering'}
                </span>
              </div>
              <div className="ess-profile-info-item">
                <span className="ess-profile-info-label">Work Location</span>
                <span className="ess-profile-info-value">{emp.locationName || 'Chennai'}</span>
              </div>
              <div className="ess-profile-info-item">
                <span className="ess-profile-info-label">Employment Type</span>
                <span className="ess-profile-info-value">{emp.employmentType || 'Permanent'}</span>
              </div>
              <div className="ess-profile-info-item">
                <span className="ess-profile-info-label">Joining Date</span>
                <span className="ess-profile-info-value">
                  {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
