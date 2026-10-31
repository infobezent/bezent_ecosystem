import {
  Badge,
  Card,
  CardBody,
  Divider,
  Grid,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { StageConversionStep } from '../types/report';

export interface StageConversionFunnelProps {
  steps: StageConversionStep[];
}

export function StageConversionFunnel({ steps }: StageConversionFunnelProps) {
  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="pipeline" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Full Pipeline Stage Conversion &amp; Velocity Funnel
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  Step-by-step conversion yield and average dwell time per hiring milestone.
                </span>
              </Stack>
            </Inline>
            <Badge variant="success" size="sm">Overall Funnel Yield: 3.9%</Badge>
          </Inline>

          <Divider />

          <Stack gap="sm">
            {steps.map((step, idx) => {
              const passThroughRate = step.conversionFromPrevious;
              const isFirst = idx === 0;

              return (
                <div key={step.stageId} className="bg-gray-50 border border-gray-100 rounded p-3">
                  <Grid columns={4} gap="md">
                    {/* Stage Name */}
                    <Inline align="center" gap="sm">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">{step.stageName}</span>
                        <span className="bezent-text-xs bezent-text-secondary">Stage {idx + 1}</span>
                      </Stack>
                    </Inline>

                    {/* Candidate Count */}
                    <Inline align="baseline" gap="xs">
                      <span className="bezent-text-xl bezent-font-bold text-gray-900">{step.count}</span>
                      <span className="bezent-text-xs bezent-text-secondary">candidates</span>
                    </Inline>

                    {/* Conversion from previous */}
                    <Inline align="center" gap="xs">
                      <span className="bezent-text-xs bezent-text-secondary">Yield:</span>
                      {isFirst ? (
                        <Badge variant="neutral" size="sm">Top of Funnel</Badge>
                      ) : (
                        <Badge variant={passThroughRate >= 60 ? 'success' : 'neutral'} size="sm">
                          {passThroughRate}% retained
                        </Badge>
                      )}
                    </Inline>

                    {/* Stage Duration */}
                    <Inline justify="end" align="center" gap="xs">
                      <span className="bezent-text-xs bezent-text-secondary">Avg Duration:</span>
                      <span className="bezent-text-xs bezent-font-semibold text-primary-700">
                        {step.avgStageDays} days
                      </span>
                    </Inline>
                  </Grid>
                </div>
              );
            })}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
