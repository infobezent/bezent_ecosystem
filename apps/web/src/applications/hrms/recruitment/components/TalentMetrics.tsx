import { Card, CardBody, Grid, Inline, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { TalentProfile } from '../types/talentPool';

export interface TalentMetricsProps {
  talent: TalentProfile[];
}

export function TalentMetrics({ talent }: TalentMetricsProps) {
  const total = talent.length;
  const silverMedalists = talent.filter((t) => t.source === 'silver_medalist').length;
  const availableNow = talent.filter((t) => t.status === 'available').length;
  const expiringConsent = talent.filter(
    (t) => t.consentStatus === 'consent_expiring_soon' || t.consentStatus === 'consent_expired',
  ).length;

  return (
    <Grid columns={4} gap="md">
      <Card className="bezent-clay-card bezent-clay-card--purple" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Total Talent Network</span>
              <BezentIcon name="candidates" size="nav" color="#4F46E5" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{total}</span>
              <span className="bezent-text-xs bezent-text-secondary">retained profiles</span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card className="bezent-clay-card bezent-clay-card--blue" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Silver Medalists</span>
              <BezentIcon name="dashboard" size="nav" color="#0d9488" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{silverMedalists}</span>
              <span className="bezent-text-xs bezent-hiring-accent bezent-font-medium">
                high-priority runner-ups
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card className="bezent-clay-card bezent-clay-card--green" padding="md">
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Ready to Re-Engage</span>
              <BezentIcon name="check" size="nav" color="#16A34A" />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{availableNow}</span>
              <span className="bezent-text-xs bezent-hiring-success-text bezent-font-medium">
                actively open candidates
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card
        className={`bezent-clay-card ${expiringConsent > 0 ? 'bezent-clay-card--amber' : 'bezent-clay-card--purple'}`}
        padding="md"
      >
        <CardBody>
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-text-secondary bezent-text-sm">Consent Action Due</span>
              <BezentIcon
                name="security"
                size="nav"
                color={expiringConsent > 0 ? '#D97706' : '#64748b'}
              />
            </Inline>
            <Inline align="baseline" gap="xs">
              <span className="bezent-text-2xl bezent-font-semibold">{expiringConsent}</span>
              <span className="bezent-text-xs bezent-hiring-warning-text bezent-font-medium">
                {expiringConsent > 0 ? 'renewal required soon' : 'all compliant'}
              </span>
            </Inline>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}
