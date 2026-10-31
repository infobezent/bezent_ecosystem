import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { InterviewSchedule } from '../types/interview';

export interface InterviewMetricsProps {
  interviews: InterviewSchedule[];
  todayDate?: string;
}

export function InterviewMetrics({
  interviews,
  todayDate = '2026-10-30',
}: InterviewMetricsProps) {
  const todayCount = interviews.filter(
    (i) => i.scheduledDate === todayDate && (i.status === 'scheduled' || i.status === 'in_progress'),
  ).length;

  const upcomingCount = interviews.filter(
    (i) => i.scheduledDate > todayDate && i.status === 'scheduled',
  ).length;

  const pendingFeedbackCount = interviews.filter(
    (i) => i.status === 'completed' && !i.scorecard,
  ).length;

  const completedWithScorecardCount = interviews.filter(
    (i) => i.status === 'completed' && Boolean(i.scorecard),
  ).length;

  return (
    <Grid columns={4} gap="md">
      {/* 1. Interviews Today */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple" />
                <span className="bezent-clay-metric__label">Interviews Today</span>
              </Inline>
              <div className="bezent-clay-metric__value">{todayCount}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple">
              <BezentIcon name="calendar" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. Upcoming Pipeline */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue" />
                <span className="bezent-clay-metric__label">Upcoming Pipeline</span>
              </Inline>
              <div className="bezent-clay-metric__value">{upcomingCount}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue">
              <BezentIcon name="tasks" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Completed & Evaluated */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green" />
                <span className="bezent-clay-metric__label">Completed &amp; Evaluated</span>
              </Inline>
              <div className="bezent-clay-metric__value">{completedWithScorecardCount}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green">
              <BezentIcon name="reports" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. Pending Feedback */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber" />
                <span className="bezent-clay-metric__label">Pending Feedback</span>
              </Inline>
              <div className="bezent-clay-metric__value">{pendingFeedbackCount}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--amber">
              <BezentIcon name="interviews" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>
    </Grid>
  );
}
