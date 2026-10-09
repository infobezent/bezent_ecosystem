import { Page, PageHeader, Card, EmptyState } from '../../../design-system/components';

export function ProvisioningJobsPage() {
  return (
    <Page>
      <PageHeader
        title="Provisioning Jobs"
        subtitle="Asynchronous customer onboarding pipelines, schema provisioning, and activation jobs."
      />
      <Card>
        <EmptyState
          title="Provisioning Jobs Queue"
          description="Tenant provisioning background tasks, status executions, and worker event history."
        />
      </Card>
    </Page>
  );
}
