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
    <Grid columns={4} gap="md" role="region" aria-label="Job openings key metrics">
      {/* 1. Total Requisitions */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Total Requisitions: ${totalJobs}, All created job postings`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Total Requisitions</span>
              </Inline>
              <div className="bezent-clay-metric__value">{totalJobs}</div>
              <span className="bezent-clay-metric__caption">All created job postings</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple" aria-hidden="true">
              <BezentIcon name="jobOpenings" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. Open Positions */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Open Positions: ${openPositions}, Vacancies to fulfill`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Open Positions</span>
              </Inline>
              <div className="bezent-clay-metric__value">{openPositions}</div>
              <span className="bezent-clay-metric__caption">Vacancies to fulfill</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue" aria-hidden="true">
              <BezentIcon name="workforce" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Active Candidates */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Active Candidates: ${totalInPipeline}, Applicants across pipelines`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Active Candidates</span>
              </Inline>
              <div className="bezent-clay-metric__value">{totalInPipeline}</div>
              <span className="bezent-clay-metric__caption">Across all pipelines</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green" aria-hidden="true">
              <BezentIcon name="candidates" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. Drafts & On Hold */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Drafts & On Hold: ${draftJobsCount + closedOrHoldCount}, Inactive or paused`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Drafts &amp; On Hold</span>
              </Inline>
              <div className="bezent-clay-metric__value">{draftJobsCount + closedOrHoldCount}</div>
              <span className="bezent-clay-metric__caption">Inactive or paused</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--amber" aria-hidden="true">
              <BezentIcon name="tasks" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>
    </Grid>
  );
}
