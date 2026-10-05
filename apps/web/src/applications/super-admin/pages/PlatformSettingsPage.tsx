import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
} from '../../../design-system/components';
import { superAdminApi, type GovernanceSummary } from '../api/superAdminApi';

export function PlatformSettingsPage() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getGovernanceSummary();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Platform configuration could not be loaded.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Page>
      <PageHeader
        title="Platform Settings"
        subtitle="Read-only operational configuration and governance status for the BEZENT platform."
      />

      {error && (
        <Stack gap="sm">
          <Alert variant="error" title="Configuration Unavailable" onDismiss={() => setError(null)}>
            Platform configuration could not be loaded.
          </Alert>
          <Inline gap="sm">
            <Button variant="secondary" size="sm" onClick={fetchSummary}>
              Retry
            </Button>
          </Inline>
        </Stack>
      )}

      {loading && <LoadingState label="Loading platform configuration..." />}

      {!loading && summary && (
        <Stack gap="lg">
          {/* Informational Policy Banner */}
          <Alert variant="info" title="Operational Governance Notice">
            Platform security, tenant isolation invariants, and authentication policies are enforced
            through backend configuration and are read-only here.
          </Alert>

          {/* Authentication & Sign-In */}
          <Card>
            <Section
              title="Authentication & Sign-In"
              subtitle="Universal passwordless authentication and challenge policies"
            >
              <Grid columns={4} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Method</span>
                  <strong>Email OTP</strong>
                  <Inline gap="xs">
                    <Badge variant="success">Active</Badge>
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Code Validity</span>
                  <strong>{summary.authentication.otpExpiryMinutes} minutes</strong>
                  <span className="bezent-caption">Per-challenge expiry window</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Maximum Attempts</span>
                  <strong>{summary.authentication.maxVerificationAttempts}</strong>
                  <span className="bezent-caption">Auto-locks challenge on excess</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Resend Cooldown</span>
                  <strong>{summary.authentication.resendCooldownSeconds} seconds</strong>
                  <span className="bezent-caption">Rate-limit throttling protection</span>
                </Stack>
              </Grid>
            </Section>
          </Card>

          {/* Session & Access Security */}
          <Card>
            <Section
              title="Session & Access Security"
              subtitle="Bearer token lifecycle and platform-level authorization"
            >
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Platform Session Duration</span>
                  <strong>{summary.session.ttlHours} hours</strong>
                  <span className="bezent-caption">Rolling session timeout</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Super Admin Scope</span>
                  <Inline gap="xs">
                    <Badge variant="warning">Platform</Badge>
                  </Inline>
                  <span className="bezent-caption">Independent of company memberships</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Platform Authorization</span>
                  <Inline gap="xs">
                    <Badge variant="success">Enforced</Badge>
                  </Inline>
                  <span className="bezent-caption">Strict token verification on API gateway</span>
                </Stack>
              </Grid>
            </Section>
          </Card>

          {/* Tenant & Company Isolation */}
          <Card>
            <Section
              title="Tenant & Company Isolation"
              subtitle="Data boundary enforcement and identity separation"
            >
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Tenant Isolation</span>
                  <Inline gap="xs">
                    <Badge variant="success">Enforced</Badge>
                  </Inline>
                  <span className="bezent-caption">Server-side query filtering across tenants</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Company Scoping</span>
                  <Inline gap="xs">
                    <Badge variant="success">Enforced</Badge>
                  </Inline>
                  <span className="bezent-caption">Explicit company membership required</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Identity Model</span>
                  <strong>Platform User ≠ HRMS Employee</strong>
                  <span className="bezent-caption">
                    Workforce records separated from authentication
                  </span>
                </Stack>
              </Grid>
            </Section>
          </Card>

          {/* Audit & Security */}
          <Card>
            <Section
              title="Audit & Security"
              subtitle="Platform-wide administrative activity logging and credential protection"
            >
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Audit Logging</span>
                  <Inline gap="xs">
                    <Badge variant="success">Active</Badge>
                  </Inline>
                  <span className="bezent-caption">Administrative write operations recorded</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Sensitive Metadata Protection</span>
                  <Inline gap="xs">
                    <Badge variant="success">Enabled</Badge>
                  </Inline>
                  <span className="bezent-caption">
                    Zero logged passwords, tokens, or OTP codes
                  </span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Audit Scope</span>
                  <strong>Platform + Company</strong>
                  <span className="bezent-caption">Centralized canonical audit storage</span>
                </Stack>
              </Grid>
            </Section>
          </Card>

          {/* Application Ecosystem */}
          <Card>
            <Section
              title="Application Ecosystem"
              subtitle="Canonical application catalog and customer entitlement ceiling"
            >
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Total Applications</span>
                  <strong>{summary.applications.total}</strong>
                  <span className="bezent-caption">Ecosystem catalog entries</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Generally Available</span>
                  <strong>{summary.applications.available}</strong>
                  <span className="bezent-caption">HRMS available for customer enablement</span>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-caption">Coming Soon</span>
                  <strong>{summary.applications.comingSoon}</strong>
                  <span className="bezent-caption">CRM and Project Management</span>
                </Stack>
              </Grid>
            </Section>
          </Card>
        </Stack>
      )}
    </Page>
  );
}
