import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Toolbar,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Input,
  Select,
  LoadingState,
  Alert,
  EmptyState,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { fetchAttendanceOverview } from '../api/attendanceApi';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

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

  const currentAttendanceRate = todayKpis?.attendanceRate ?? data?.attendanceRate ?? 0;

  return (
    <Page>
      <PageHeader
        title="Attendance Overview"
        subtitle="Workforce operations, exception triage, and monthly payroll readiness"
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={handleRefresh} aria-label="Refresh overview">
              <BezentIcon name="sync" size={16} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hrms/attendance/daily-log')}>
              <BezentIcon name="clock" size={16} /> Daily Log
            </Button>
            <Button variant="secondary" onClick={() => navigate('/hrms/attendance/regularization')}>
              <BezentIcon name="requests" size={16} /> Regularization Queue
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/hrms/attendance/monthly-summary')}
            >
              <BezentIcon name="reports" size={16} /> Monthly Summary
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Scope and Freshness Info Banner */}
        {data ? (
          <Toolbar
            left={
              <Inline gap="md" align="end">
                {/* Date Selection Unit */}
                <Inline gap="xs" align="end">
                  <Input
                    label="Work Date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="control"
                    onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  >
                    Today
                  </Button>
                </Inline>

                {/* Visual Separator */}
                <Divider orientation="vertical" spacing="sm" />

                {/* Trend Window Filter */}
                <Select
                  label="Trend Window"
                  value={trendRange}
                  onChange={(e) => setTrendRange(e.target.value as '7d' | '30d')}
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
                  <Badge variant="neutral">
                    Scope: {scope.isCompanyWide ? 'Company-wide' : scope.role.toUpperCase()}
                  </Badge>
                ) : null}
                <Badge variant={currentAttendanceRate >= 80 ? 'success' : 'warning'}>
                  Attendance Rate: {currentAttendanceRate}%
                </Badge>
                <Badge variant="info">
                  {data.dataFreshness === 'realtime' ? 'Live Data' : 'Cached'}
                </Badge>
              </Inline>
            }
          />
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
            {/* 1. TODAY ATTENDANCE KPIS */}
            <div>
              <h3 className="bezent-card__title">Today Attendance Situation ({selectedDate})</h3>
              <p className="bezent-card__desc">
                Authoritative workforce presence, approved leave coverage, and punch anomalies
              </p>
            </div>

            <Grid columns={4} gap="sm">
              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}`)}
                role="button"
                tabIndex={0}
                title="View all scheduled employees for today"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Eligible Workforce</span>
                  <Badge variant="neutral">Scheduled</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.totalEligibleEmployees : data.expectedCount}
                  </span>
                  <BezentIcon name="employees" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=present`)}
                role="button"
                tabIndex={0}
                title="View checked-in employees"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Present</span>
                  <Badge variant="success">Checked In</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.presentCount : data.presentCount}
                  </span>
                  <BezentIcon name="approvals" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=absent`)}
                role="button"
                tabIndex={0}
                title="View absent employees with no punch"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Absent</span>
                  <Badge variant={data.absentCount > 0 ? 'danger' : 'neutral'}>No Punch</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.absentCount : data.absentCount}
                  </span>
                  <BezentIcon name="security" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}&status=on_leave`)}
                role="button"
                tabIndex={0}
                title="View employees on approved leave"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">On Leave</span>
                  <Badge variant="info">Approved</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.onLeaveCount : data.onLeaveCount}
                  </span>
                  <BezentIcon name="leave" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate('/hrms/attendance/on-duty')}
                role="button"
                tabIndex={0}
                title="View authorized On-Duty and field deployments"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">On-Duty / Field</span>
                  <Badge variant="info">Authorized</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">{todayKpis ? todayKpis.onDutyCount : 0}</span>
                  <BezentIcon name="requests" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}&indicator=late`)}
                role="button"
                tabIndex={0}
                title="View late arrivals after shift grace period"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Late Arrivals</span>
                  <Badge variant="warning">After Grace</Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.lateArrivalsCount : data.lateCount}
                  </span>
                  <BezentIcon name="clock" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate('/hrms/attendance/exceptions?type=missing_in')}
                role="button"
                tabIndex={0}
                title="View missing check-in and check-out punches"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Missing Punch</span>
                  <Badge variant={data.missingPunchCount > 0 ? 'warning' : 'neutral'}>
                    Incomplete
                  </Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.missingPunchCount : data.missingPunchCount}
                  </span>
                  <BezentIcon name="security" size={18} />
                </Inline>
              </div>

              <div
                className="bezent-stat-card--compact"
                onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}&processingState=pending_review`)}
                role="button"
                tabIndex={0}
                title="View records in progress or pending review"
              >
                <div className="bezent-stat-card__header">
                  <span className="bezent-stat-card__title">Pending Processing</span>
                  <Badge variant="neutral">
                    {todayKpis?.isFuture ? 'Future' : 'In Progress'}
                  </Badge>
                </div>
                <Inline justify="between" align="center">
                  <span className="bezent-stat-card__num">
                    {todayKpis ? todayKpis.pendingProcessingCount : 0}
                  </span>
                  <BezentIcon name="sync" size={18} />
                </Inline>
              </div>
            </Grid>

            {/* 2. ACTION REQUIRED QUEUE */}
            <Card padding="lg">
              <Stack gap="md">
                <div className="bezent-toolbar">
                  <div>
                    <h3 className="bezent-card__title">Action Required Queue</h3>
                    <span className="bezent-card__desc">
                      Consolidated workflow items awaiting supervisor and HR administrator triage
                    </span>
                  </div>
                  <Badge variant="neutral">
                    {actionQueue
                      ? actionQueue.reduce((acc, q) => acc + q.authorizedPendingCount, 0)
                      : data.pendingRegularizationCount}{' '}
                    Actionable
                  </Badge>
                </div>

                {actionQueue && actionQueue.length > 0 ? (
                  <Grid columns="auto-fit" minColWidth="md" gap="md">
                    {actionQueue.map((action) => (
                      <Card key={action.actionType} hoverable variant="flat" padding="md">
                        <Stack gap="sm">
                          <Inline justify="between" align="center">
                            <strong>{action.title}</strong>
                            <Badge variant={action.severity}>
                              {action.authorizedPendingCount} Pending
                            </Badge>
                          </Inline>
                          <span className="bezent-card__desc">{action.description}</span>
                          {action.oldestPendingAgeDays !== null ? (
                            <span className="bezent-card__desc">
                              Oldest request: {action.oldestPendingAgeDays} day(s) old
                            </span>
                          ) : null}
                          <Inline justify="end">
                            <Button
                              size="sm"
                              variant={action.authorizedPendingCount > 0 ? 'primary' : 'outline'}
                              onClick={() => {
                                const qs = new URLSearchParams(action.filterParams).toString();
                                navigate(`${action.targetRoute}${qs ? `?${qs}` : ''}`);
                              }}
                            >
                              {action.authorizedPendingCount > 0 ? 'Triage Queue' : 'View Queue'}
                            </Button>
                          </Inline>
                        </Stack>
                      </Card>
                    ))}
                  </Grid>
                ) : (
                  <Card variant="flat" padding="md">
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <strong>Pending Regularizations</strong>
                        <span className="bezent-card__desc">
                          {data.pendingRegularizationCount} employee regularization request(s)
                          awaiting review
                        </span>
                      </Stack>
                      <Button
                        variant={data.pendingRegularizationCount > 0 ? 'primary' : 'secondary'}
                        onClick={() => navigate('/hrms/attendance/regularization')}
                      >
                        Review Queue
                      </Button>
                    </Inline>
                  </Card>
                )}
              </Stack>
            </Card>

            {/* 3. TRENDS & DEPARTMENT COMPARISON */}
            <Grid columns={2} gap="lg">
              {/* Department Comparison */}
              <Card padding="lg">
                <Stack gap="md">
                  <div className="bezent-toolbar">
                    <div>
                      <h3 className="bezent-card__title">Department Comparison</h3>
                      <span className="bezent-card__desc">
                        Workforce presence and exceptions by authorized department
                      </span>
                    </div>
                    <Button
                      variant="text"
                      onClick={() => navigate(`/hrms/attendance/daily-log?date=${selectedDate}`)}
                    >
                      View All
                    </Button>
                  </div>

                  {departments && departments.length > 0 ? (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Department</TableHeaderCell>
                          <TableHeaderCell>Eligible</TableHeaderCell>
                          <TableHeaderCell>Present</TableHeaderCell>
                          <TableHeaderCell>Rate</TableHeaderCell>
                          <TableHeaderCell>Action</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {departments.map((dept) => (
                          <TableRow key={dept.departmentId}>
                            <TableCell>{dept.departmentName}</TableCell>
                            <TableCell>{dept.eligibleEmployees}</TableCell>
                            <TableCell>{dept.presentEquivalents}</TableCell>
                            <TableCell>
                              <Badge
                                variant={(dept.attendanceRate ?? 0) >= 80 ? 'success' : 'warning'}
                              >
                                {dept.attendanceRate !== null ? `${dept.attendanceRate}%` : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  navigate(
                                    `/hrms/attendance/daily-log?departmentId=${encodeURIComponent(
                                      dept.departmentId,
                                    )}&date=${encodeURIComponent(selectedDate)}`,
                                  )
                                }
                              >
                                Drill Down
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : data.departmentBreakdown.length > 0 ? (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Department</TableHeaderCell>
                          <TableHeaderCell>Present</TableHeaderCell>
                          <TableHeaderCell>Total</TableHeaderCell>
                          <TableHeaderCell>Rate</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.departmentBreakdown.map((dept) => {
                          const rate =
                            dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 0;
                          return (
                            <TableRow key={dept.departmentId}>
                              <TableCell>{dept.departmentName}</TableCell>
                              <TableCell>{dept.present}</TableCell>
                              <TableCell>{dept.total}</TableCell>
                              <TableCell>
                                <Badge variant={rate >= 80 ? 'success' : 'warning'}>{rate}%</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      title="No Department Data"
                      description="No departments found for current authorized scope."
                    />
                  )}
                </Stack>
              </Card>

              {/* Attendance Trends */}
              <Card padding="lg">
                <Stack gap="md">
                  <div className="bezent-toolbar">
                    <div>
                      <h3 className="bezent-card__title">
                        Attendance Trends ({trends?.range === '30d' ? '30 Days' : '7 Days'})
                      </h3>
                      <span className="bezent-card__desc">
                        Scheduled vs present daily history and late occurrences
                      </span>
                    </div>
                    {trends?.avgAttendanceRate !== null ? (
                      <Badge variant="success">Avg: {trends?.avgAttendanceRate}%</Badge>
                    ) : null}
                  </div>

                  {trends && trends.items.length > 0 ? (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell>Day</TableHeaderCell>
                          <TableHeaderCell>Present</TableHeaderCell>
                          <TableHeaderCell>Rate</TableHeaderCell>
                          <TableHeaderCell>Late</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trends.items.slice(-7).map((item) => (
                          <TableRow key={item.date}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.dayOfWeek.slice(0, 3)}</TableCell>
                            <TableCell>
                              {item.presentEquivalentDays} / {item.scheduledDayEquivalents}
                            </TableCell>
                            <TableCell>
                              {item.attendanceRate !== null ? (
                                <Badge variant={item.attendanceRate >= 80 ? 'success' : 'warning'}>
                                  {item.attendanceRate}%
                                </Badge>
                              ) : (
                                <Badge variant="neutral">Upcoming</Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.lateOccurrences}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState
                      title="No Trend Data"
                      description="No trend history available for current period."
                    />
                  )}
                </Stack>
              </Card>
            </Grid>

            {/* 4. PROCESSING HEALTH & MONTHLY PAYROLL READINESS */}
            <Grid columns={2} gap="lg">
              {/* Processing Health */}
              <Card padding="lg">
                <Stack gap="md">
                  <div className="bezent-toolbar">
                    <div>
                      <h3 className="bezent-card__title">Attendance Processing Health</h3>
                      <span className="bezent-card__desc">
                        Reconciliation completeness and pipeline diagnostic indicators
                      </span>
                    </div>
                    {processingHealth ? (
                      <Badge
                        variant={
                          processingHealth.status === 'healthy'
                            ? 'success'
                            : processingHealth.status === 'degraded'
                              ? 'warning'
                              : processingHealth.status === 'upcoming'
                                ? 'neutral'
                                : 'danger'
                        }
                      >
                        {processingHealth.status.toUpperCase()}
                      </Badge>
                    ) : null}
                  </div>

                  {processingHealth ? (
                    <Grid columns={2} gap="md">
                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Processing Success Rate</span>
                          <strong>
                            {processingHealth.processingSuccessRate !== null
                              ? `${processingHealth.processingSuccessRate}%`
                              : 'Upcoming'}
                          </strong>
                          <span className="bezent-card__desc">
                            {processingHealth.denominatorDescription}
                          </span>
                        </Stack>
                      </Card>

                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Workday Reconciliation</span>
                          <strong>
                            {processingHealth.processedWorkdays} Finalized /{' '}
                            {processingHealth.pendingWorkdays} Pending
                          </strong>
                          <span className="bezent-card__desc">
                            {processingHealth.failedWorkdays} Failed Workdays
                          </span>
                        </Stack>
                      </Card>

                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Schedule Integrity</span>
                          <strong>
                            {processingHealth.missingScheduleCount === 0
                              ? '100% Configured'
                              : `${processingHealth.missingScheduleCount} Missing`}
                          </strong>
                          <span className="bezent-card__desc">
                            Active employees lacking shift schedule
                          </span>
                        </Stack>
                      </Card>

                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Blocking Exceptions</span>
                          <strong>{processingHealth.unresolvedBlockingExceptions}</strong>
                          <span className="bezent-card__desc">
                            Critical/High severity exceptions
                          </span>
                        </Stack>
                      </Card>
                    </Grid>
                  ) : null}
                </Stack>
              </Card>

              {/* Monthly Payroll Readiness */}
              <Card padding="lg">
                <Stack gap="md">
                  <div className="bezent-toolbar">
                    <div>
                      <h3 className="bezent-card__title">
                        Monthly Payroll Readiness (
                        {monthlyReadiness?.month || selectedDate.slice(0, 7)})
                      </h3>
                      <span className="bezent-card__desc">
                        Readiness sign-off, supervisor review, and lock progress
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        navigate(
                          `/hrms/attendance/monthly-summary?month=${monthlyReadiness?.month || selectedDate.slice(0, 7)
                          }`,
                        )
                      }
                    >
                      Open Workspace
                    </Button>
                  </div>

                  {monthlyReadiness && monthlyReadiness.isAuthorized ? (
                    <Grid columns={3} gap="md">
                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Ready for Payroll</span>
                          <h3 className="bezent-card__title">{monthlyReadiness.readyCount}</h3>
                          <Badge variant="success">Unblocked</Badge>
                        </Stack>
                      </Card>

                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Needs Review / Blocked</span>
                          <h3 className="bezent-card__title">
                            {monthlyReadiness.needsReviewCount + monthlyReadiness.blockedCount}
                          </h3>
                          <Badge variant={monthlyReadiness.blockedCount > 0 ? 'danger' : 'warning'}>
                            {monthlyReadiness.blockedCount} Blocked
                          </Badge>
                        </Stack>
                      </Card>

                      <Card variant="flat" padding="sm">
                        <Stack gap="xs">
                          <span className="bezent-card__desc">Locked Records</span>
                          <h3 className="bezent-card__title">{monthlyReadiness.lockedCount}</h3>
                          <Badge variant="neutral">
                            {monthlyReadiness.totalInScope > 0
                              ? `${Math.round(
                                (monthlyReadiness.lockedCount / monthlyReadiness.totalInScope) *
                                100,
                              )}%`
                              : '0%'}
                          </Badge>
                        </Stack>
                      </Card>
                    </Grid>
                  ) : (
                    <Card variant="flat" padding="md">
                      <Inline gap="sm" align="center">
                        <BezentIcon name="lock" size={16} />
                        <span className="bezent-card__desc">
                          Payroll readiness indicators are restricted to authorized HR and Payroll
                          administrators.
                        </span>
                      </Inline>
                    </Card>
                  )}
                </Stack>
              </Card>
            </Grid>
          </>
        )}
      </Stack>
    </Page>
  );
}
