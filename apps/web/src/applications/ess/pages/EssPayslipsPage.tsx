import { useState, useEffect } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  Inline,
  Alert,
  LoadingState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi } from '../api/essApi';

type PayslipsStatus = {
  enabled: boolean;
  message: string;
  payslips: unknown[];
};

export function EssPayslipsPage() {
  const [status, setStatus] = useState<PayslipsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    essApi.getPayslips()
      .then(setStatus)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load payslip status'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading payslips..." />;
  if (error) return <Alert variant="error" title="Error" description={error} />;

  return (
    <Page>
      <PageHeader
        title="Payslips"
        subtitle="Monthly salary statements and payroll documents"
      />
      <Section title="Payroll Status">
        {!status?.enabled ? (
          <Card>
            <Stack gap="md">
              <Inline gap="sm" alignItems="center">
                <BezentIcon name="payroll" size={32} />
                <Stack gap="xs">
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Payroll Not Configured</span>
                  <span>{status?.message ?? 'Payroll integration is not configured for your organization.'}</span>
                </Stack>
              </Inline>
              <Alert
                variant="info"
                title="Module Not Available"
                description="Your organization's payroll integration is not set up yet. Once configured, your monthly payslips will appear here for download."
              />
            </Stack>
          </Card>
        ) : (
          <Alert variant="info" title="No Payslips" description="No payslips are available for download yet." />
        )}
      </Section>
    </Page>
  );
}
