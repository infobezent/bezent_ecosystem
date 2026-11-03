import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { Candidate } from '../types/candidate';

export interface CandidateMetricsProps {
  candidates: Candidate[];
}

export function CandidateMetrics({ candidates }: CandidateMetricsProps) {
  const total = candidates.length;
  const inPipeline = candidates.filter(
    (c) =>
      c.currentStage === 'screening' ||
      c.currentStage === 'shortlisted' ||
      c.currentStage === 'interview' ||
      c.currentStage === 'assessment',
  ).length;

  const inInterview = candidates.filter((c) => c.currentStage === 'interview').length;
  const offersAndHired = candidates.filter(
    (c) => c.currentStage === 'offer' || c.currentStage === 'hired',
  ).length;

  return (
    <Grid columns={4} gap="md">
      {/* 1. Total Candidates */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple" />
                <span className="bezent-clay-metric__label">Total Candidates</span>
              </Inline>
              <div className="bezent-clay-metric__value">{total}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple">
              <BezentIcon name="candidates" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. In Pipeline */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue" />
                <span className="bezent-clay-metric__label">In Pipeline</span>
              </Inline>
              <div className="bezent-clay-metric__value">{inPipeline}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue">
              <BezentIcon name="pipeline" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Completed & Hired */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green" />
                <span className="bezent-clay-metric__label">Completed &amp; Hired</span>
              </Inline>
              <div className="bezent-clay-metric__value">{offersAndHired}</div>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green">
              <BezentIcon name="check" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. In Process */}
      <Card variant="clay" padding="none" className="bezent-clay-card--compact">
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber" />
                <span className="bezent-clay-metric__label">In Process</span>
              </Inline>
              <div className="bezent-clay-metric__value">{inInterview}</div>
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

export default CandidateMetrics;
