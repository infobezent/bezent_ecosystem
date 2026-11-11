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
        padding="md"
        className="bezent-clay-card bezent-clay-card--purple bezent-hiring-clickable"
        onClick={() => navigate('/hrms/recruitment/job-openings')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Open Positions</span>
              <BezentIcon name="jobOpenings" size="nav" color="#4F46E5" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{openJobsCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">
                requisitions ({totalVacancies} vacancies)
              </span>
            </Inline>
            <span className="bezent-text-xs bezent-hiring-accent bezent-font-medium">
              View all job requisitions →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 2. Active Candidates */}
      <Card
        padding="md"
        className="bezent-clay-card bezent-clay-card--blue bezent-hiring-clickable"
        onClick={() => navigate('/hrms/recruitment/candidates')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Active Candidates</span>
              <BezentIcon name="candidates" size="nav" color="#0d9488" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{activeCandidatesCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">in active review</span>
            </Inline>
            <span className="bezent-text-xs bezent-hiring-accent bezent-font-medium">
              Explore candidate directory →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 3. Interviews Today */}
      <Card
        padding="md"
        className="bezent-clay-card bezent-clay-card--amber bezent-hiring-clickable"
        onClick={() => navigate('/hrms/recruitment/interviews')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Interviews Today</span>
              <BezentIcon name="calendar" size="nav" color="#D97706" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{interviewsTodayCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">scheduled panels</span>
            </Inline>
            <span className="bezent-text-xs bezent-hiring-warning-text bezent-font-medium">
              Review today&apos;s schedule &amp; scorecards →
            </span>
          </Stack>
        </CardBody>
      </Card>

      {/* 4. Offers & Onboarding Handoff */}
      <Card
        padding="md"
        className="bezent-clay-card bezent-clay-card--green bezent-hiring-clickable"
        onClick={() => navigate('/hrms/recruitment/offers')}
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Offers &amp; Handoff</span>
              <BezentIcon name="offers" size="nav" color="#16A34A" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{offersPendingCount}</span>
              <span className="bezent-text-xs bezent-hiring-success-text bezent-font-medium">
                ({handoffsReadyCount} ready for onboarding)
              </span>
            </Inline>
            <span className="bezent-text-xs bezent-hiring-success-text bezent-font-medium">
              Manage offers &amp; handoff passport →
            </span>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
