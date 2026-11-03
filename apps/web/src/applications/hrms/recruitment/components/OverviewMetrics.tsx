import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

export interface OverviewMetricsProps {
  openJobsCount: number;
  totalVacancies: number;
  activeCandidatesCount: number;
  interviewsTodayCount: number;
  offersPendingCount: number;
  handoffsReadyCount: number;
}

export function OverviewMetrics({
  openJobsCount,
  totalVacancies,
  activeCandidatesCount,
  interviewsTodayCount,
  offersPendingCount,
  handoffsReadyCount,
}: OverviewMetricsProps) {
  const navigate = useNavigate();

  return (
    <Grid columns={4} gap="md">
      {/* 1. Open Requisitions */}
      <Card
        variant="flat"
        padding="md"
        className="cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => navigate('/hrms/recruitment/job-openings')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Open Positions</span>
              <BezentIcon name="jobOpenings" size="nav" color="var(--color-primary-600, #4F46E5)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{openJobsCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">
                requisitions ({totalVacancies} vacancies)
              </span>
            </Inline>
            <span className="bezent-text-xs text-primary-700 font-medium">
              View all job requisitions →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 2. Active Candidates */}
      <Card
        variant="tint-blue"
        padding="md"
        className="cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => navigate('/hrms/recruitment/candidates')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Active Candidates</span>
              <BezentIcon name="candidates" size="nav" color="var(--color-info-600, #0284C7)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{activeCandidatesCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">in active review</span>
            </Inline>
            <span className="bezent-text-xs text-info-700 font-medium">
              Explore candidate directory →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 3. Interviews Today */}
      <Card
        variant="flat"
        padding="md"
        className="cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => navigate('/hrms/recruitment/interviews')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Interviews Today</span>
              <BezentIcon name="calendar" size="nav" color="var(--color-warning-600, #D97706)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{interviewsTodayCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">scheduled panels</span>
            </Inline>
            <span className="bezent-text-xs text-warning-700 font-medium">
              Review today&apos;s schedule &amp; scorecards →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 4. Offers & Onboarding Handoff */}
      <Card
        variant="tint-green"
        padding="md"
        className="cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => navigate('/hrms/recruitment/offers')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Offers &amp; Handoff</span>
              <BezentIcon name="offers" size="nav" color="var(--color-success-600, #16A34A)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{offersPendingCount}</span>
              <span className="bezent-text-xs text-success-700 font-medium">
                ({handoffsReadyCount} ready for onboarding)
              </span>
            </Inline>
            <span className="bezent-text-xs text-success-700 font-medium">
              Manage offers &amp; handoff passport →
            </span>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
