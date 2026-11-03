import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { AssessmentAssignment } from '../types/assessment';

export interface AssessmentMetricsProps {
  assessments: AssessmentAssignment[];
}

export function AssessmentMetrics({ assessments }: AssessmentMetricsProps) {
  const total = assessments.length;
  const inProgress = assessments.filter(
    (a) => a.status === 'assigned' || a.status === 'in_progress',
  ).length;
  const underReview = assessments.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review',
  ).length;
  const passed = assessments.filter(
    (a) => a.status === 'evaluated' && a.decision === 'passed',
  ).length;

  return (
    <Grid columns={4} gap="md">
      <Card variant="flat" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Total Assigned</span>
              <BezentIcon name="tasks" size="nav" color="var(--color-primary-600, #4F46E5)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{total}</span>
              <span className="bezent-text-xs bezent-text-secondary">practical tests</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="tint-blue" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">In Progress</span>
              <BezentIcon name="clock" size="nav" color="var(--color-info-600, #0284C7)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{inProgress}</span>
              <span className="bezent-text-xs bezent-text-secondary">active candidates</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="flat" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Under Review</span>
              <BezentIcon name="documents" size="nav" color="var(--color-warning-600, #D97706)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{underReview}</span>
              <span className="bezent-text-xs bezent-text-secondary">awaiting grading</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="tint-green" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Passed & Cleared</span>
              <BezentIcon name="check" size="nav" color="var(--color-success-600, #16A34A)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{passed}</span>
              <span className="bezent-text-xs bezent-text-secondary">ready for offer</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
