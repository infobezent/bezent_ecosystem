import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOpening } from '../types/jobOpening';

export interface JobOpeningsMetricsProps {
  jobs: JobOpening[];
}

export function JobOpeningsMetrics({ jobs }: JobOpeningsMetricsProps) {
  const totalJobs = jobs.length;
  const openJobs = jobs.filter((j) => j.status === 'open');
  const openPositions = openJobs.reduce((acc, j) => acc + (j.positionsCount - j.filledCount), 0);
  const totalInPipeline = openJobs.reduce((acc, j) => acc + j.totalApplicants, 0);
  const draftJobsCount = jobs.filter((j) => j.status === 'draft').length;
  const closedOrHoldCount = jobs.filter(
    (j) => j.status === 'closed' || j.status === 'on_hold',
  ).length;

  return (
    <Grid columns={4} gap="md">
      {/* 1. Total Requisitions */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple" />
                <span className="bezent-clay-metric__label">Total Requisitions</span>
              </Inline>
              <div className="bezent-clay-metric__value">{totalJobs}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple">
              <BezentIcon name="jobOpenings" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. Open Positions */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue" />
                <span className="bezent-clay-metric__label">Open Positions</span>
              </Inline>
              <div className="bezent-clay-metric__value">{openPositions}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue">
              <BezentIcon name="workforce" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Active Candidates */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green" />
                <span className="bezent-clay-metric__label">Active Candidates</span>
              </Inline>
              <div className="bezent-clay-metric__value">{totalInPipeline}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green">
              <BezentIcon name="candidates" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. Drafts & On Hold */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber" />
                <span className="bezent-clay-metric__label">Drafts &amp; On Hold</span>
              </Inline>
              <div className="bezent-clay-metric__value">{draftJobsCount + closedOrHoldCount}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--amber">
              <BezentIcon name="tasks" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>
    </Grid>
  );
}
