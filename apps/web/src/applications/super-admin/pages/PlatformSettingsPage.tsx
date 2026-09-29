import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
} from '../../../design-system/components';

export function PlatformSettingsPage() {
  return (
    <Page>
      <PageHeader
        title="Platform Settings & Governance"
        subtitle="Multi-tenant isolation policies, authentication rules and backend invariants"
      />

      <Stack gap="lg">
        {/* Architecture Invariants */}
        <Card>
          <Section
            title="Multi-Tenant Isolation Architecture"
            subtitle="Governed by BEZENT Constitution (AGENTS.md) and ADR-008/ADR-009"
          >
            <Grid columns={2} gap="lg">
              <Stack gap="sm">
                <strong>Tenant & Company Model</strong>
                <span>
                  Every customer record is strictly tenant-scoped. Repositories enforce server-side
                  scoping on all queries. Frontend-only filtering is never treated as tenant isolation.
                </span>
                <Inline gap="xs">
                  <Badge variant="success">Tenant Scoped</Badge>
                  <Badge variant="success">Foreign Key Enforced</Badge>
                  <Badge variant="neutral">MySQL 8.4 InnoDB</Badge>
                </Inline>
              </Stack>

              <Stack gap="sm">
                <strong>Identity & Access Control (ADR-009)</strong>
                <span>
                  Platform Identity is strictly separated from HRMS Employment records:
                  <code>User ≠ Employee</code>. Creating a platform administrator never creates an HRMS employee record.
                </span>
                <Inline gap="xs">
                  <Badge variant="success">User ≠ Employee</Badge>
                  <Badge variant="info">Scrypt Password Hashing</Badge>
                  <Badge variant="warning">Timing Safe Equal</Badge>
                </Inline>
              </Stack>
            </Grid>
          </Section>
        </Card>

        {/* Security & Sessions */}
        <Card>
          <Section
            title="Session & Security Policy"
            subtitle="Token lifecycle and platform-level authorization"
          >
            <Grid columns={3} gap="md">
              <Stack gap="xs">
                <span className="bezent-caption">Platform Session TTL</span>
                <strong>24 Hours</strong>
                <span className="bezent-caption">Cryptographically random 256-bit hex tokens</span>
              </Stack>

              <Stack gap="xs">
                <span className="bezent-caption">Super Admin Role Scope</span>
                <Badge variant="warning">Platform Level Only</Badge>
                <span className="bezent-caption">
                  Independent of company-level memberships
                </span>
              </Stack>

              <Stack gap="xs">
                <span className="bezent-caption">Audit Logging Policy</span>
                <Badge variant="success">Zero Logged Secrets</Badge>
                <span className="bezent-caption">
                  Passwords, hashes and bearer tokens sanitized server-side
                </span>
              </Stack>
            </Grid>
          </Section>
        </Card>

        {/* Database & Runtime */}
        <Card>
          <Section
            title="Database & Storage Engine"
            subtitle="Authoritative persistence standards (ADR-016)"
          >
            <Stack gap="sm">
              <p>
                BEZENT strictly uses <strong>MySQL + Drizzle ORM</strong>. Per ADR-016, in-memory repositories,
                mock fallbacks, and SQLite are strictly prohibited in runtime code. If MySQL is unreachable,
                the backend fails clearly with appropriate diagnostics.
              </p>
              <Inline gap="xs">
                <Badge variant="neutral">Drizzle Schema</Badge>
                <Badge variant="neutral">Additive Migrations Only</Badge>
                <Badge variant="neutral">MySQL Connection Pooling</Badge>
              </Inline>
            </Stack>
          </Section>
        </Card>
      </Stack>
    </Page>
  );
}
