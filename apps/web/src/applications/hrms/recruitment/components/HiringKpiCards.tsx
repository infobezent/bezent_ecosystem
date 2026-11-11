import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { HiringKpiSummary } from '../types/report';

export interface HiringKpiCardsProps {
  kpis: HiringKpiSummary;
}

export function HiringKpiCards({ kpis }: HiringKpiCardsProps) {
  return (
    <Grid columns={4} gap="md">
      <Card className="bezent-clay-card bezent-clay-card--purple" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Time to Hire</span>
              <BezentIcon name="clock" size="nav" color="#4F46E5" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{kpis.avgTimeToHireDays}</span>
              <span className="bezent-text-xs bezent-text-secondary">days avg</span>
            </Inline>
            <span className="bezent-text-xs bezent-hiring-success-text bezent-font-medium">
              ↓ 4 days faster than industry median
            </span>
          </Stack>
        </CardBody>
      </Card>

      <Card className="bezent-clay-card bezent-clay-card--amber" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Time to Fill</span>
              <BezentIcon name="calendar" size="nav" color="#0d9488" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{kpis.avgTimeToFillDays}</span>
              <span className="bezent-text-xs bezent-text-secondary">days requisition open</span>
            </Inline>
            <span className="bezent-text-xs bezent-text-secondary">
              From requisition approval to signed offer
            </span>
          </Stack>
        </CardBody>
      </Card>

      <Card className="bezent-clay-card bezent-clay-card--green" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Offer Acceptance Rate</span>
              <BezentIcon name="offers" size="nav" color="#16A34A" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">
                {kpis.offerAcceptanceRate}%
              </span>
              <span className="bezent-text-xs bezent-hiring-success-text bezent-font-medium">
                ({kpis.totalHiresThisQuarter} hires closed)
              </span>
            </Inline>
            <span className="bezent-text-xs bezent-text-secondary">
              High acceptance across engineering bands
            </span>
          </Stack>
        </CardBody>
      </Card>

      <Card className="bezent-clay-card bezent-clay-card--blue" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Quality of Hire</span>
              <BezentIcon name="check" size="nav" color="#4F46E5" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">
                {kpis.qualityOfHireScore}%
              </span>
              <span className="bezent-text-xs bezent-hiring-accent bezent-font-medium">
                scorecard rating
              </span>
            </Inline>
            <span className="bezent-text-xs bezent-text-secondary">
              90-day manager satisfaction index
            </span>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
