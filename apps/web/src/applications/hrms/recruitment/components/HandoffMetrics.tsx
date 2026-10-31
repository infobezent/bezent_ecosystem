import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { OnboardingHandoffItem } from '../types/handoff';

export interface HandoffMetricsProps {
  handoffs: OnboardingHandoffItem[];
}

export function HandoffMetrics({ handoffs }: HandoffMetricsProps) {
  const readyCount = handoffs.filter((h) => h.status === 'ready_for_handoff').length;
  const inProgressCount = handoffs.filter((h) => h.status === 'handoff_in_progress' || h.status === 'on_hold').length;
  const completedCount = handoffs.filter((h) => h.status === 'handoff_completed').length;
  const duplicateAlerts = handoffs.filter((h) => h.duplicateCheck.hasDuplicate).length;

  return (
    <Grid columns={4} gap="md">
      <Card variant="tint-blue" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Ready for Handoff</span>
              <BezentIcon name="onboarding" size="nav" color="var(--color-primary-600, #4F46E5)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{readyCount}</span>
              <span className="bezent-text-xs text-primary-700 bezent-font-medium">
                awaiting case initialization
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="flat" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Pending Verification</span>
              <BezentIcon name="clock" size="nav" color="var(--color-warning-600, #D97706)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{inProgressCount}</span>
              <span className="bezent-text-xs bezent-text-secondary">
                BGV / signature pending
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="tint-green" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Handoffs Completed</span>
              <BezentIcon name="check" size="nav" color="var(--color-success-600, #16A34A)" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{completedCount}</span>
              <span className="bezent-text-xs text-success-700 bezent-font-medium">
                onboarding cases active
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card variant={duplicateAlerts > 0 ? 'flat' : 'flat'} padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Duplicate Check Alerts</span>
              <BezentIcon name="security" size="nav" color={duplicateAlerts > 0 ? 'var(--color-warning-600)' : 'var(--color-neutral-500)'} />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{duplicateAlerts}</span>
              <span className="bezent-text-xs bezent-text-secondary">
                {duplicateAlerts > 0 ? 're-hire / match detected' : 'clean isolation'}
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
