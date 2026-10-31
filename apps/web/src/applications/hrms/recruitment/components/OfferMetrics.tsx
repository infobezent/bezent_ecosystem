import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOffer } from '../types/offer';

export interface OfferMetricsProps {
  offers: JobOffer[];
}

export function OfferMetrics({ offers }: OfferMetricsProps) {
  const total = offers.length;
  const pendingApprovals = offers.filter(
    (o) => o.status === 'pending_approval' || o.status === 'draft',
  ).length;
  const awaitingAcceptance = offers.filter((o) => o.status === 'sent').length;
  const accepted = offers.filter((o) => o.status === 'accepted').length;
  const acceptanceRate =
    total > 0
      ? Math.round(
          (accepted / (accepted + offers.filter((o) => o.status === 'declined').length || 1)) * 100,
        )
      : 0;

  return (
    <Grid columns={4} gap="md">
      <Card variant="flat" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Total Offers</span>
              <BezentIcon name="offers" size="nav" color="var(--color-primary-600, #4F46E5)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{total}</span>
              <span className="bezent-text-xs bezent-text-secondary">generated</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="tint-blue" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Pending Sign-Off</span>
              <BezentIcon name="clock" size="nav" color="var(--color-info-600, #0284C7)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{pendingApprovals}</span>
              <span className="bezent-text-xs bezent-text-secondary">internal review</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="flat" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Awaiting Candidate</span>
              <BezentIcon name="mail" size="nav" color="var(--color-warning-600, #D97706)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{awaitingAcceptance}</span>
              <span className="bezent-text-xs bezent-text-secondary">offers dispatched</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="tint-green" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Accepted & Joined</span>
              <BezentIcon name="check" size="nav" color="var(--color-success-600, #16A34A)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{accepted}</span>
              <span className="bezent-text-xs text-success-700 bezent-font-semibold">
                ({acceptanceRate}% rate)
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
