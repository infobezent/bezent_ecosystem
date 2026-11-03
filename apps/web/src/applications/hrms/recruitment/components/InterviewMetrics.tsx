import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { InterviewSchedule } from '../types/interview';

export interface InterviewMetricsProps {
  interviews: InterviewSchedule[];
  todayDate?: string;
}

export function InterviewMetrics({ interviews, todayDate = '2026-10-30' }: InterviewMetricsProps) {
  const todayCount = interviews.filter(
    (i) =>
      i.scheduledDate === todayDate && (i.status === 'scheduled' || i.status === 'in_progress'),
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
    <Grid columns={4} gap="md" role="region" aria-label="Interviews schedule key metrics">
      {/* 1. Interviews Today */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Interviews Today: ${todayCount}, Active rounds scheduled for today`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Interviews Today</span>
              </Inline>
              <div className="bezent-clay-metric__value">{todayCount}</div>
              <span className="bezent-clay-metric__caption">Scheduled for today</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple" aria-hidden="true">
              <BezentIcon name="calendar" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. Upcoming Pipeline */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Upcoming Pipeline: ${upcomingCount}, Scheduled rounds ahead`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Upcoming Pipeline</span>
              </Inline>
              <div className="bezent-clay-metric__value">{upcomingCount}</div>
              <span className="bezent-clay-metric__caption">Scheduled rounds ahead</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue" aria-hidden="true">
              <BezentIcon name="tasks" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Completed & Evaluated */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Completed & Evaluated: ${completedWithScorecardCount}, Scorecards logged`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Completed &amp; Evaluated</span>
              </Inline>
              <div className="bezent-clay-metric__value">{completedWithScorecardCount}</div>
              <span className="bezent-clay-metric__caption">Scorecards logged</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green" aria-hidden="true">
              <BezentIcon name="reports" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. Pending Feedback */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Pending Feedback: ${pendingFeedbackCount}, Evaluations needed`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Pending Feedback</span>
              </Inline>
              <div className="bezent-clay-metric__value">{pendingFeedbackCount}</div>
              <span className="bezent-clay-metric__caption">Evaluations needed</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--amber" aria-hidden="true">
              <BezentIcon name="interviews" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>
    </Grid>
  );
}
