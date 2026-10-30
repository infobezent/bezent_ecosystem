import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Toolbar,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Grid,
  Stack,
  Inline,
  Button,
  Badge,
  Input,
  Select,
  LoadingState,
  Alert,
  EmptyState,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import { fetchAttendanceOverview } from '../api/attendanceApi';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

const DEPT_PIE_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export function AttendanceOverviewPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trendRange, setTrendRange] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<AttendanceOverviewKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (date: string, range: '7d' | '30d', isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const overview = await fetchAttendanceOverview(date, { trendRange: range });
        setData(overview);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance overview');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadData(selectedDate, trendRange);
  }, [selectedDate, trendRange, loadData]);

  const handleRefresh = () => {
    loadData(selectedDate, trendRange, true);
  };

  const todayKpis = data?.todayKpis;
  const trends = data?.trends;
  const departments = data?.departments;
  const actionQueue = data?.actionQueue;
  const processingHealth = data?.processingHealth;
  const monthlyReadiness = data?.monthlyReadiness;
  const scope = data?.scope;

  const deptItems = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    if (data?.departmentBreakdown && data.departmentBreakdown.length > 0) {
      return data.departmentBreakdown.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        eligibleEmployees: d.total,
        presentHeadcount: Math.round(d.present),
        presentEquivalents: d.present,
        attendanceRate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      }));
    }
    return [];
  }, [departments, data?.departmentBreakdown]);

  const trendItems = useMemo(() => {
    if (trends && trends.items && trends.items.length > 0) {
      return trends.items.slice(-7);
    }
    if (data?.recentTrends && data.recentTrends.length > 0) {
      return data.recentTrends.map((r) => {
        const total = r.present + r.absent;
        const rate = total > 0 ? Math.round((r.present / total) * 100) : 0;
        const d = new Date(r.date);
        const dayOfWeek = isNaN(d.getTime())
          ? 'Day'
          : d.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          date: r.date,
          dayOfWeek,
          scheduledHeadcount: total,
          scheduledDayEquivalents: total,
          presentHeadcount: Math.round(r.present),
          presentEquivalentDays: r.present,
          attendanceRate: rate,
          lateOccurrences: r.late,
        };
      });
    }
    return [];
  }, [trends, data?.recentTrends]);

  const currentAttendanceRate = todayKpis?.attendanceRate ?? data?.attendanceRate ?? 0;

  // Pulse & Distribution metrics
  const totalEmployees = todayKpis?.totalEligibleEmployees ?? data?.expectedCount ?? 0;
  const presentHeadcount = todayKpis
    ? (todayKpis.presentHeadcount ?? Math.ceil(todayKpis.presentCount))
    : data
      ? Math.ceil(data.presentCount)
      : 0;
  const presentFte = todayKpis ? todayKpis.presentCount : data ? data.presentCount : 0;
  const onLeaveCount = todayKpis ? todayKpis.onLeaveCount : data ? data.onLeaveCount : 0;
  const onDutyCount = todayKpis ? todayKpis.onDutyCount : 0;
  const absentCount = todayKpis ? todayKpis.absentCount : data ? data.absentCount : 0;
  const pendingCount = todayKpis ? todayKpis.pendingProcessingCount : 0;
  const lateCount = todayKpis ? todayKpis.lateArrivalsCount : data ? data.lateCount : 0;
  const missingPunchCount = todayKpis
    ? todayKpis.missingPunchCount
    : data
      ? data.missingPunchCount
      : 0;
  const blockingExceptionsCount =
    processingHealth?.cumulativeBlockingExceptions ??
    processingHealth?.unresolvedBlockingExceptions ??
    0;

  // Segment widths (%)
  const presentPct = totalEmployees > 0 ? (presentHeadcount / totalEmployees) * 100 : 0;
  const leavePct = totalEmployees > 0 ? (onLeaveCount / totalEmployees) * 100 : 0;
  const dutyPct = totalEmployees > 0 ? (onDutyCount / totalEmployees) * 100 : 0;
  const absentPct = totalEmployees > 0 ? (absentCount / totalEmployees) * 100 : 0;
  const pendingPct =
    totalEmployees > 0 && presentPct + leavePct + dutyPct + absentPct === 0
      ? 100
      : Math.max(0, 100 - (presentPct + leavePct + dutyPct + absentPct));

  const totalOpenWorkflowItems = actionQueue
    ? actionQueue.reduce((acc, q) => acc + q.authorizedPendingCount, 0)
    : (data?.pendingRegularizationCount ?? 0);

  const getActionIcon = (actionType: string): BezentIconName => {
    switch (actionType) {
      case 'pending_regularization':
        return 'requests';
      case 'pending_on_duty':
        return 'operations';
      case 'unresolved_exceptions':
        return 'warning';
      case 'missing_punch_issues':
        return 'clock';
      case 'pending_monthly_review':
        return 'reports';
      case 'payroll_readiness_blockers':
        return 'lock';
      default:
        return 'calendar';
    }
  };

  const getActionColor = (severity: string): 'warning' | 'info' | 'danger' | 'purple' => {
    if (severity === 'danger') return 'danger';
    if (severity === 'info') return 'info';
    if (severity === 'warning') return 'warning';
    return 'purple';
  };

  return (
    <Page className="attendance-clay-overview">
      <PageHeader
        className="attendance-clay-header"
        eyebrow="HRMS · Attendance"
        title="Attendance Overview"
        subtitle="Workforce operations, exception triage, and monthly payroll readiness"
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              className="attendance-clay-header-btn"
              leftIcon={<BezentIcon name="sync" size={16} />}
              onClick={handleRefresh}
              disabled={loading || refreshing}
              aria-label="Refresh overview"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="secondary"
              className="attendance-clay-header-btn"
              leftIcon={<BezentIcon name="clock" size={16} />}
              onClick={() => navigate('/hrms/attendance/daily-log')}
            >
              Daily Attendance
            </Button>
            <Button
              variant="secondary"
              className="attendance-clay-header-btn"
              leftIcon={<BezentIcon name="requests" size={16} />}
              onClick={() => navigate('/hrms/attendance/regularization')}
            >
              Regularization Queue
            </Button>
            <Button
              variant="secondary"
              className="attendance-clay-header-btn"
              leftIcon={<BezentIcon name="reports" size={16} />}
              onClick={() => navigate('/hrms/attendance/monthly-summary')}
            >
              Monthly Summary
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Scope and Freshness Filter Bar */}
        {data ? (
          <div className="attendance-clay-toolbar">
            <Toolbar
              left={
                <Inline gap="md" align="center">
                  <Inline gap="xs" align="center">
                    <Button
                      variant="outline"
                      size="md"
                      className="attendance-clay-header-btn"
                      onClick={() => {
                        const d = new Date(`${selectedDate}T00:00:00`);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().slice(0, 10));
                      }}
                      aria-label="Previous day"
                    >
                      <BezentIcon name="chevronLeft" size={14} />
                    </Button>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-label="Work Date"
                      size="md"
                    />
                    <Button
                      variant="outline"
                      size="md"
                      className="attendance-clay-header-btn"
                      onClick={() => {
                        const d = new Date(`${selectedDate}T00:00:00`);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(d.toISOString().slice(0, 10));
                      }}
                      aria-label="Next day"
                    >
                      <BezentIcon name="chevronRight" size={14} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="attendance-clay-header-btn"
                      onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                      disabled={selectedDate === new Date().toISOString().slice(0, 10)}
                    >
                      Today
                    </Button>
                  </Inline>

                  <Divider orientation="vertical" spacing="sm" />

                  <Select
                    value={trendRange}
                    onChange={(e) => setTrendRange(e.target.value as '7d' | '30d')}
                    aria-label="Trend Window"
                    options={[
                      { value: '7d', label: 'Last 7 Days' },
                      { value: '30d', label: 'Last 30 Days' },
                    ]}
                  />
                </Inline>
              }
              right={
                <Inline gap="sm" align="center">
                  {scope ? (
                    <span className="attendance-clay-badge attendance-clay-badge--scope">
                      Scope: {scope.isCompanyWide ? 'Company-wide' : scope.role.toUpperCase()}
                    </span>
                  ) : null}
                  <span
                    className={`attendance-clay-badge ${
                      currentAttendanceRate >= 80
                        ? 'attendance-clay-badge--rate-good'
                        : 'attendance-clay-badge--rate-warn'
                    }`}
                  >
                    Attendance Rate: {currentAttendanceRate}%
                  </span>
                  <span className="attendance-clay-badge attendance-clay-badge--live">
                    {data.dataFreshness === 'realtime' ? 'Live Data' : 'Cached'}
                  </span>
                </Inline>
              }
            />
          </div>
        ) : null}

        {loading ? (
          <LoadingState label="Loading operational attendance overview..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Overview">
            {error}
            <Button variant="secondary" onClick={() => loadData(selectedDate, trendRange)}>
              Retry
            </Button>
          </Alert>
        ) : !data ? (
          <EmptyState
            variant="attendance"
            title="No Attendance Data Found"
            description="Could not find attendance operational data for this date."
          />
        ) : (
          <>
            {/* 1. INFLATED 3D ATTENDANCE COMMAND STRIP */}
            <div className="attendance-clay-strip">
              <div className="attendance-clay-strip__stats">
                <div
                  className="attendance-clay-stat-item"
                  onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}`)}
                  role="button"
                  tabIndex={0}
                  title="View scheduled workforce"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--blue" />
                  <span className="attendance-clay-stat-item__value">{totalEmployees}</span>
                  <span className="attendance-clay-stat-item__label">Scheduled Workforce</span>
                </div>

                <div
                  className="attendance-clay-stat-item"
                  onClick={() =>
                    navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=present`)
                  }
                  role="button"
                  tabIndex={0}
                  title="View present employees"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--green" />
                  <span className="attendance-clay-stat-item__value">{presentHeadcount}</span>
                  <span className="attendance-clay-stat-item__label">
                    Present ({Math.round(presentPct)}%)
                  </span>
                </div>

                <div
                  className="attendance-clay-stat-item"
                  onClick={() =>
                    navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=on_leave`)
                  }
                  role="button"
                  tabIndex={0}
                  title="View employees on leave"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--amber" />
                  <span className="attendance-clay-stat-item__value">{onLeaveCount}</span>
                  <span className="attendance-clay-stat-item__label">On Leave</span>
                </div>

                <div
                  className="attendance-clay-stat-item"
                  onClick={() => navigate('/hrms/attendance/on-duty')}
                  role="button"
                  tabIndex={0}
                  title="View on-duty employees"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--purple" />
                  <span className="attendance-clay-stat-item__value">{onDutyCount}</span>
                  <span className="attendance-clay-stat-item__label">On-Duty / Field</span>
                </div>

                <div
                  className="attendance-clay-stat-item"
                  onClick={() =>
                    navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=absent`)
                  }
                  role="button"
                  tabIndex={0}
                  title="View absent employees"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--red" />
                  <span className="attendance-clay-stat-item__value">{absentCount}</span>
                  <span className="attendance-clay-stat-item__label">Absent</span>
                </div>

                <div
                  className="attendance-clay-stat-item"
                  onClick={() =>
                    navigate(
                      `/hrms/attendance/daily-log?date=${selectedDate}&processingState=pending_processing`,
                    )
                  }
                  role="button"
                  tabIndex={0}
                  title="View in progress shifts"
                >
                  <span className="attendance-clay-dot attendance-clay-dot--blue" />
                  <span className="attendance-clay-stat-item__value">
                    {pendingCount || totalEmployees}
                  </span>
                  <span className="attendance-clay-stat-item__label">In Progress</span>
                </div>
              </div>

              <Inline gap="xs" align="center">
                <div
                  className="attendance-clay-alert-pill attendance-clay-alert-pill--late"
                  onClick={() =>
                    navigate(`/hrms/attendance/daily-log?date=${selectedDate}&indicator=late`)
                  }
                  role="button"
                  tabIndex={0}
                >
                  <BezentIcon name="clock" size={14} />
                  <span>
                    <strong>{lateCount}</strong> Late
                  </span>
                </div>
                <div
                  className="attendance-clay-alert-pill attendance-clay-alert-pill--missing"
                  onClick={() => navigate('/hrms/attendance/exceptions?type=missing_in')}
                  role="button"
                  tabIndex={0}
                >
                  <BezentIcon name="warning" size={14} />
                  <span>
                    <strong>{missingPunchCount}</strong> Missing
                  </span>
                </div>
                <div
                  className="attendance-clay-alert-pill attendance-clay-alert-pill--blocker"
                  onClick={() => navigate('/hrms/attendance/exceptions')}
                  role="button"
                  tabIndex={0}
                >
                  <BezentIcon name="lock" size={14} />
                  <span>
                    <strong>{blockingExceptionsCount}</strong> Blockers
                  </span>
                </div>
              </Inline>
            </div>

            {/* 2. FOUR PRIMARY 3D CLAY STATISTIC CARDS */}
            <Grid columns={4} gap="md">
              {/* Card 1: Regularizations — Lavender */}
              <div className="attendance-clay-card attendance-clay-card--lavender">
                <div>
                  <div className="attendance-clay-card__top">
                    <div className="attendance-clay-card__title-group">
                      <span className="attendance-clay-card__dot attendance-clay-card__dot--lavender" />
                      <span className="attendance-clay-card__title">Regularizations</span>
                    </div>
                    <div className="attendance-clay-icon attendance-clay-icon--lavender">
                      <BezentIcon name="requests" size={18} />
                    </div>
                  </div>
                  <div className="attendance-clay-card__mid">
                    <span className="attendance-clay-card__count">
                      {actionQueue?.find((q) => q.actionType === 'pending_regularization')
                        ?.authorizedPendingCount ?? data.pendingRegularizationCount}
                    </span>
                    <span className="attendance-clay-pill attendance-clay-pill--warning">
                      Pending
                    </span>
                  </div>
                </div>
                <div className="attendance-clay-card__bottom">
                  <span className="attendance-clay-card__tag">
                    {actionQueue?.find((q) => q.actionType === 'pending_regularization')
                      ?.oldestPendingAgeDays
                      ? `Oldest: ${
                          actionQueue.find((q) => q.actionType === 'pending_regularization')
                            ?.oldestPendingAgeDays
                        }d`
                      : 'Awaiting Review'}
                  </span>
                  <Button
                    size="sm"
                    className="attendance-clay-btn"
                    onClick={() => navigate('/hrms/attendance/regularization')}
                  >
                    Triage →
                  </Button>
                </div>
              </div>

              {/* Card 2: Exceptions — Peach */}
              <div className="attendance-clay-card attendance-clay-card--peach">
                <div>
                  <div className="attendance-clay-card__top">
                    <div className="attendance-clay-card__title-group">
                      <span className="attendance-clay-card__dot attendance-clay-card__dot--peach" />
                      <span className="attendance-clay-card__title">Exceptions</span>
                    </div>
                    <div className="attendance-clay-icon attendance-clay-icon--peach">
                      <BezentIcon name="warning" size={18} />
                    </div>
                  </div>
                  <div className="attendance-clay-card__mid">
                    <span className="attendance-clay-card__count">
                      {actionQueue?.find((q) => q.actionType === 'unresolved_exceptions')
                        ?.authorizedPendingCount ?? 0}
                    </span>
                    <span className="attendance-clay-pill attendance-clay-pill--danger">Open</span>
                  </div>
                </div>
                <div className="attendance-clay-card__bottom">
                  <span className="attendance-clay-card__tag">
                    {blockingExceptionsCount > 0
                      ? `${blockingExceptionsCount} Blocking Payroll`
                      : 'Policy Deviations'}
                  </span>
                  <Button
                    size="sm"
                    className="attendance-clay-btn"
                    onClick={() => navigate('/hrms/attendance/exceptions')}
                  >
                    Triage →
                  </Button>
                </div>
              </div>

              {/* Card 3: Missing Punches — Pink */}
              <div className="attendance-clay-card attendance-clay-card--pink">
                <div>
                  <div className="attendance-clay-card__top">
                    <div className="attendance-clay-card__title-group">
                      <span className="attendance-clay-card__dot attendance-clay-card__dot--pink" />
                      <span className="attendance-clay-card__title">Missing Punches</span>
                    </div>
                    <div className="attendance-clay-icon attendance-clay-icon--pink">
                      <BezentIcon name="clock" size={18} />
                    </div>
                  </div>
                  <div className="attendance-clay-card__mid">
                    <span className="attendance-clay-card__count">
                      {actionQueue?.find((q) => q.actionType === 'missing_punch_issues')
                        ?.authorizedPendingCount ?? missingPunchCount}
                    </span>
                    <span
                      className={`attendance-clay-pill ${
                        missingPunchCount > 0
                          ? 'attendance-clay-pill--danger'
                          : 'attendance-clay-pill--neutral'
                      }`}
                    >
                      Action
                    </span>
                  </div>
                </div>
                <div className="attendance-clay-card__bottom">
                  <span className="attendance-clay-card__tag">Single-Swipe Records</span>
                  <Button
                    size="sm"
                    className="attendance-clay-btn"
                    onClick={() => navigate('/hrms/attendance/daily-log?isMissingPunch=true')}
                  >
                    Resolve →
                  </Button>
                </div>
              </div>

              {/* Card 4: Monthly Sign-Off — Blue */}
              <div className="attendance-clay-card attendance-clay-card--blue">
                <div>
                  <div className="attendance-clay-card__top">
                    <div className="attendance-clay-card__title-group">
                      <span className="attendance-clay-card__dot attendance-clay-card__dot--blue" />
                      <span className="attendance-clay-card__title">Monthly Sign-Off</span>
                    </div>
                    <div className="attendance-clay-icon attendance-clay-icon--blue">
                      <BezentIcon name="reports" size={18} />
                    </div>
                  </div>
                  <div className="attendance-clay-card__mid">
                    <span className="attendance-clay-card__count">
                      {actionQueue?.find((q) => q.actionType === 'pending_monthly_review')
                        ?.authorizedPendingCount ??
                        monthlyReadiness?.needsReviewCount ??
                        0}
                    </span>
                    <span className="attendance-clay-pill attendance-clay-pill--info">
                      In Review
                    </span>
                  </div>
                </div>
                <div className="attendance-clay-card__bottom">
                  <span className="attendance-clay-card__tag">
                    {monthlyReadiness
                      ? `${monthlyReadiness.readyCount} Ready · ${monthlyReadiness.blockedCount} Blocked`
                      : 'Payroll Cutoff'}
                  </span>
                  <Button
                    size="sm"
                    className="attendance-clay-btn"
                    onClick={() =>
                      navigate(
                        `/hrms/attendance/monthly-summary?month=${
                          monthlyReadiness?.month || selectedDate.slice(0, 7)
                        }`,
                      )
                    }
                  >
                    Review →
                  </Button>
                </div>
              </div>
            </Grid>

            {/* 3. TWO BALANCED 3D CLAY PANELS */}
            <Grid columns={2} gap="lg">
              {/* Left Panel: Department Attendance */}
              <Card padding="md" className="attendance-clay-panel">
                <CardHeader>
                  <CardTitle>Department Attendance</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="attendance-clay-header-btn"
                    onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}`)}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardBody>
                  {deptItems.length === 0 ? (
                    <EmptyState
                      title="No Department Data"
                      description="No departments found for current authorized scope."
                    />
                  ) : (
                    (() => {
                      const totalDeptPresent = deptItems.reduce(
                        (sum, d) => sum + (d.presentHeadcount ?? Math.ceil(d.presentEquivalents)),
                        0,
                      );
                      const radius = 64;
                      const strokeWidth = 26;
                      const circumference = 2 * Math.PI * radius;
                      let accumulatedPercent = 0;

                      return (
                        <div className="bezent-dept-pie-layout">
                          {/* Left: SVG Clay Donut Chart */}
                          <div className="bezent-dept-pie-chart-wrap">
                            <svg
                              width={170}
                              height={170}
                              viewBox="0 0 170 170"
                              className="bezent-dept-pie-svg"
                              role="img"
                              aria-label="Department Attendance Distribution Pie Chart"
                            >
                              {/* Soft Clay Inset Ring */}
                              <circle
                                cx={85}
                                cy={85}
                                r={radius}
                                fill="transparent"
                                stroke="#e8edf7"
                                strokeWidth={strokeWidth}
                              />
                              {totalDeptPresent > 0 &&
                                deptItems.map((dept, idx) => {
                                  const val =
                                    dept.presentHeadcount ?? Math.ceil(dept.presentEquivalents);
                                  if (val <= 0) return null;
                                  const percent = val / totalDeptPresent;
                                  const strokeDasharray = `${percent * circumference} ${circumference}`;
                                  const strokeDashoffset = -accumulatedPercent * circumference;
                                  accumulatedPercent += percent;
                                  const color = DEPT_PIE_COLORS[idx % DEPT_PIE_COLORS.length];

                                  return (
                                    <circle
                                      key={dept.departmentId}
                                      cx={85}
                                      cy={85}
                                      r={radius}
                                      fill="transparent"
                                      stroke={color}
                                      strokeWidth={strokeWidth}
                                      strokeDasharray={strokeDasharray}
                                      strokeDashoffset={strokeDashoffset}
                                      transform="rotate(-90 85 85)"
                                      cursor="pointer"
                                      onClick={() =>
                                        navigate(
                                          `/hrms/attendance/daily-log?departmentId=${encodeURIComponent(
                                            dept.departmentId,
                                          )}&date=${encodeURIComponent(selectedDate)}`,
                                        )
                                      }
                                    >
                                      <title>{`${dept.departmentName}: ${val} present (${
                                        dept.attendanceRate ?? 0
                                      }%)`}</title>
                                    </circle>
                                  );
                                })}
                              {/* 3D Elevated Center Disc */}
                              <circle cx={85} cy={85} r={46} className="attendance-clay-donut-center" />
                              {/* Center Total Text */}
                              <text
                                x="50%"
                                y="46%"
                                dominantBaseline="middle"
                                textAnchor="middle"
                                fill="#222a3b"
                                fontSize="22"
                                fontWeight="800"
                              >
                                {totalDeptPresent}
                              </text>
                              <text
                                x="50%"
                                y="60%"
                                dominantBaseline="middle"
                                textAnchor="middle"
                                fill="#68758f"
                                fontSize="10.5"
                                fontWeight="700"
                              >
                                Present FTE
                              </text>
                            </svg>
                          </div>

                          {/* Right: Department Attendance Elevated Pastel Clay Rows */}
                          <div className="bezent-dept-pie-legend">
                            {deptItems.map((dept, idx) => {
                              const rate = dept.attendanceRate ?? 0;
                              const presentVal =
                                dept.presentHeadcount ?? Math.ceil(dept.presentEquivalents);
                              return (
                                <div
                                  key={dept.departmentId}
                                  className={`attendance-clay-dept-row attendance-clay-dept-row--${
                                    idx % 9
                                  }`}
                                  onClick={() =>
                                    navigate(
                                      `/hrms/attendance/daily-log?departmentId=${encodeURIComponent(
                                        dept.departmentId,
                                      )}&date=${encodeURIComponent(selectedDate)}`,
                                    )
                                  }
                                  title={`Click to view ${dept.departmentName} Daily Attendance`}
                                >
                                  <div className="bezent-dept-pie-legend-info">
                                    <span
                                      className={`bezent-dept-pie-legend-dot bezent-dept-pie-legend-dot--${
                                        idx % 9
                                      }`}
                                    />
                                    <span className="bezent-dept-pie-legend-name">
                                      {dept.departmentName}
                                    </span>
                                  </div>
                                  <div className="bezent-dept-pie-legend-stats">
                                    <span className="bezent-dept-pie-legend-count">
                                      {presentVal} / {dept.eligibleEmployees}
                                    </span>
                                    <Badge size="sm" variant={rate >= 80 ? 'success' : 'warning'}>
                                      {dept.attendanceRate !== null ? `${rate}%` : 'N/A'}
                                    </Badge>
                                    <span className="bezent-dept-pie-legend-arrow">
                                      <BezentIcon name="chevronRight" size={14} />
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </CardBody>
              </Card>

              {/* Right Panel: Attendance Trends (7 Days) */}
              <Card padding="md" className="attendance-clay-panel">
                <CardHeader>
                  <CardTitle>
                    Attendance Trends ({trends?.range === '30d' ? '30 Days' : '7 Days'})
                  </CardTitle>
                  {trends?.avgAttendanceRate !== null && trends?.avgAttendanceRate !== undefined ? (
                    <Badge variant="success" size="sm">
                      Avg: {trends.avgAttendanceRate}%
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardBody>
                  {trendItems.length === 0 ? (
                    <EmptyState
                      title="No Trend Data"
                      description="No trend history available for current period."
                    />
                  ) : (
                    <div className="attendance-clay-trend-card">
                      <div className="attendance-clay-trend-columns">
                        {trendItems.map((item) => {
                          const rate = item.attendanceRate ?? 0;
                          const isGood = rate >= 80;
                          const barHeight = rate > 0 ? Math.min(100, Math.max(6, rate)) : 0;
                          const dayLabel = item.dayOfWeek.slice(0, 3);
                          const dateLabel = item.date.length >= 10 ? item.date.slice(5) : item.date;
                          return (
                            <div
                              key={item.date}
                              className="attendance-clay-trend-col"
                              title={`${item.date} (${item.dayOfWeek}): ${rate}% attendance | Present: ${
                                item.presentHeadcount ?? Math.ceil(item.presentEquivalentDays)
                              }/${
                                item.scheduledHeadcount ?? item.scheduledDayEquivalents
                              } | Late: ${item.lateOccurrences}`}
                              onClick={() =>
                                navigate(`/hrms/attendance/daily-log?date=${item.date}`)
                              }
                            >
                              <span className="attendance-clay-trend-col__rate">
                                {item.attendanceRate !== null ? `${rate}%` : '—'}
                              </span>
                              <div className="attendance-clay-trend-col__bar-wrap">
                                <svg
                                  width="100%"
                                  height="100"
                                  viewBox="0 0 28 100"
                                  preserveAspectRatio="none"
                                >
                                  <defs>
                                    <linearGradient
                                      id={`trendGradGood-${item.date}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop offset="0%" stopColor="#34d399" />
                                      <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                    <linearGradient
                                      id={`trendGradWarn-${item.date}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop offset="0%" stopColor="#fbbf24" />
                                      <stop offset="100%" stopColor="#d97706" />
                                    </linearGradient>
                                  </defs>
                                  <rect
                                    x="0"
                                    y={100 - barHeight}
                                    width="28"
                                    height={barHeight}
                                    rx="6"
                                    fill={
                                      isGood
                                        ? `url(#trendGradGood-${item.date})`
                                        : `url(#trendGradWarn-${item.date})`
                                    }
                                  />
                                </svg>
                              </div>
                              <div className="bezent-trend-col__day">
                                {dayLabel}
                                <span className="bezent-trend-col__date">{dateLabel}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="bezent-trend-footer">
                        <div className="bezent-trend-legend">
                          <span className="bezent-trend-legend__item">
                            <span className="bezent-trend-legend__dot bezent-trend-legend__dot--good" />
                            Optimal (≥80%)
                          </span>
                          <span className="bezent-trend-legend__item">
                            <span className="bezent-trend-legend__dot bezent-trend-legend__dot--warn" />
                            Attention (&lt;80%)
                          </span>
                        </div>
                        <span>
                          Total Late (7d):{' '}
                          <strong>
                            {trendItems.reduce((acc, curr) => acc + (curr.lateOccurrences || 0), 0)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Grid>

            {/* 4. MONTHLY PAYROLL READINESS — 3 PASTEL CLAY PANELS */}
            {monthlyReadiness && monthlyReadiness.isAuthorized ? (
              <Card padding="md" className="attendance-clay-panel">
                <CardHeader>
                  <CardTitle>
                    Monthly Payroll Readiness ({monthlyReadiness?.month || selectedDate.slice(0, 7)}
                    )
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="attendance-clay-header-btn"
                    onClick={() =>
                      navigate(
                        `/hrms/attendance/monthly-summary?month=${
                          monthlyReadiness?.month || selectedDate.slice(0, 7)
                        }`,
                      )
                    }
                  >
                    Open Workspace
                  </Button>
                </CardHeader>
                <CardBody>
                  <Stack gap="md">
                    <Grid columns={3} gap="sm">
                      {/* Ready Panel — Mint */}
                      <div className="attendance-clay-readiness-card attendance-clay-readiness-card--mint">
                        <span className="attendance-clay-readiness-card__label">
                          <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green" />
                          Ready
                        </span>
                        <span className="attendance-clay-readiness-card__value">
                          {monthlyReadiness.readyCount}
                        </span>
                        <span className="attendance-clay-readiness-card__caption">Unblocked</span>
                      </div>

                      {/* Review Panel — Peach */}
                      <div className="attendance-clay-readiness-card attendance-clay-readiness-card--peach">
                        <span className="attendance-clay-readiness-card__label">
                          <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber" />
                          Review
                        </span>
                        <span className="attendance-clay-readiness-card__value">
                          {monthlyReadiness.needsReviewCount + monthlyReadiness.blockedCount}
                        </span>
                        <span className="attendance-clay-readiness-card__caption">
                          {monthlyReadiness.blockedCount > 0
                            ? `${monthlyReadiness.blockedCount} Blocked`
                            : 'In Review'}
                        </span>
                      </div>

                      {/* Locked Panel — Lavender */}
                      <div className="attendance-clay-readiness-card attendance-clay-readiness-card--lavender">
                        <span className="attendance-clay-readiness-card__label">
                          <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue" />
                          Locked
                        </span>
                        <span className="attendance-clay-readiness-card__value">
                          {monthlyReadiness.lockedCount}
                        </span>
                        <span className="attendance-clay-readiness-card__caption">
                          {monthlyReadiness.totalInScope > 0
                            ? `${Math.round(
                                (monthlyReadiness.lockedCount / monthlyReadiness.totalInScope) *
                                  100,
                              )}%`
                            : '0%'}
                        </span>
                      </div>
                    </Grid>

                    <div>
                      <div className="bezent-progress-label">
                        <span className="bezent-progress-label__title">
                          Cutoff Readiness Progress
                        </span>
                        <span className="bezent-progress-label__value">
                          {monthlyReadiness.totalInScope > 0
                            ? `${Math.round(
                                (monthlyReadiness.readyCount / monthlyReadiness.totalInScope) * 100,
                              )}% Ready`
                            : '0%'}
                        </span>
                      </div>
                      <div className="attendance-clay-progress-track">
                        <svg
                          width="100%"
                          height="12"
                          viewBox="0 0 100 12"
                          preserveAspectRatio="none"
                        >
                          {(() => {
                            const total = monthlyReadiness.totalInScope || 1;
                            const readyW = (monthlyReadiness.readyCount / total) * 100;
                            const reviewW = (monthlyReadiness.needsReviewCount / total) * 100;
                            const blockedW = (monthlyReadiness.blockedCount / total) * 100;
                            return (
                              <>
                                {readyW > 0 && (
                                  <rect
                                    x={0}
                                    y={0}
                                    width={readyW}
                                    height={12}
                                    rx={readyW >= 100 ? 6 : 0}
                                    fill="#10b981"
                                  />
                                )}
                                {reviewW > 0 && (
                                  <rect
                                    x={readyW}
                                    y={0}
                                    width={reviewW}
                                    height={12}
                                    fill="#f59e0b"
                                  />
                                )}
                                {blockedW > 0 && (
                                  <rect
                                    x={readyW + reviewW}
                                    y={0}
                                    width={blockedW}
                                    height={12}
                                    rx={readyW + reviewW + blockedW >= 100 ? 6 : 0}
                                    fill="#ef4444"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  </Stack>
                </CardBody>
              </Card>
            ) : null}
          </>
        )}
      </Stack>
    </Page>
  );
}
