import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import { companyAdminApi, type PoliciesSummary } from '../api/companyAdminApi';

export function CompanyPoliciesPage() {
  const navigate = useNavigate();
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [data, setData] = useState<PoliciesSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.getPoliciesSummary(activeCompanyId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company policies');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return (
    <Page>
      <PageHeader
        title="Company Policies & Governance"
        subtitle={`Operational rules, employment policies, and form schemas for ${activeCompany?.name || 'Company'}`}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchPolicies}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/hrms/settings/forms')}
              leftIcon={<BezentIcon name="settings" size={16} color="currentColor" />}
            >
              Form Engine Studio
            </Button>
          </Inline>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchPolicies()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <LoadingState label="Loading company policies and schemas..." />
      ) : data ? (
        <Stack gap="lg">
          <Alert variant="info" title="Centralized Policy Administration">
            Policy definitions configure the operational behavior of HRMS workflows such as
            onboarding, attendance, leave accrual, and registration form schemas.
          </Alert>

          {/* Form Engine & Onboarding Schema Section */}
          <Section
            title="Employee Registration & Form Engine"
            subtitle="Configured onboarding steps and protected system fields"
          >
            <Card>
              <Stack gap="md">
                <Inline justify="between">
                  <Stack gap="none">
                    <strong>Dynamic Registration Steps</strong>
                    <span className="bezent-metric-label">
                      {data.onboardingStepsConfigured} Multi-step journey sections active
                    </span>
                  </Stack>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/hrms/settings/forms')}
                  >
                    Edit Schema →
                  </Button>
                </Inline>

                <Stack gap="xs">
                  <span className="bezent-metric-label">
                    Protected System Fields (Read-Only / Un-deletable):
                  </span>
                  <Inline gap="xs" wrap>
                    {data.protectedSystemFields.map((field) => (
                      <Badge key={field} variant="info" size="sm">
                        {field}
                      </Badge>
                    ))}
                  </Inline>
                </Stack>
              </Stack>
            </Card>
          </Section>

          {/* HRMS Operational Policies Grid */}
          <Grid columns={3} gap="md">
            <Card>
              <Stack gap="sm">
                <strong>Employment Types</strong>
                <p>Standardized employment classifications active in workforce management.</p>
                <Inline gap="xs" wrap>
                  {data.employmentTypes.map((type) => (
                    <Badge key={type} variant="neutral" size="sm">
                      {type}
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Leave Categories</strong>
                <p>Configured time-off and statutory leave policies.</p>
                <Inline gap="xs" wrap>
                  {data.leaveTypes.map((type) => (
                    <Badge key={type} variant="neutral" size="sm">
                      {type}
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Work Schedules & Shifts</strong>
                <p>Active shift patterns and weekly scheduling rules.</p>
                <Inline gap="xs" wrap>
                  {data.workSchedules.map((type) => (
                    <Badge key={type} variant="neutral" size="sm">
                      {type}
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            </Card>
          </Grid>
        </Stack>
      ) : null}
    </Page>
  );
}
