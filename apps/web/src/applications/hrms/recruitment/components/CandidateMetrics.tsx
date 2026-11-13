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
    <Grid columns={4} gap="md" role="region" aria-label="Candidate directory key metrics">
      {/* 1. Total Candidates */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Total Candidates: ${total}, Total active applicant pool`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Total Candidates</span>
              </Inline>
              <div className="bezent-clay-metric__value">{total}</div>
              <span className="bezent-clay-metric__caption">Total active applicant pool</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--purple" aria-hidden="true">
              <BezentIcon name="candidates" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 2. In Pipeline */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`In Pipeline: ${inPipeline}, Screening to assessment stages`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">In Pipeline</span>
              </Inline>
              <div className="bezent-clay-metric__value">{inPipeline}</div>
              <span className="bezent-clay-metric__caption">Screening to assessment</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--blue" aria-hidden="true">
              <BezentIcon name="pipeline" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 3. Completed & Hired */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`Completed & Hired: ${offersAndHired}, Offers extended or joined`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--green"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">Completed &amp; Hired</span>
              </Inline>
              <div className="bezent-clay-metric__value">{offersAndHired}</div>
              <span className="bezent-clay-metric__caption">Offers extended or joined</span>
            </Stack>
            <div className="bezent-clay-icon bezent-clay-icon--green" aria-hidden="true">
              <BezentIcon name="check" size={20} />
            </div>
          </Inline>
        </CardBody>
      </Card>

      {/* 4. In Process */}
      <Card
        variant="default"
        padding="none"
        className="bezent-clay-card--compact"
        aria-label={`In Process: ${inInterview}, Active in interview rounds`}
      >
        <CardBody>
          <Inline justify="between" align="center">
            <Stack gap="xs">
              <Inline align="center" gap="xs">
                <span
                  className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber"
                  aria-hidden="true"
                />
                <span className="bezent-clay-metric__label">In Process</span>
              </Inline>
              <div className="bezent-clay-metric__value">{inInterview}</div>
              <span className="bezent-clay-metric__caption">Active in interview rounds</span>
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

export default CandidateMetrics;
