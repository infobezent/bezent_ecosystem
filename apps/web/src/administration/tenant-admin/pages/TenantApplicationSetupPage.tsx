import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  EmptyState,
} from '../../../design-system/components';

export function TenantApplicationSetupPage() {
  return (
    <Page>
      <PageHeader
        title="Application Setup"
        subtitle="Provision and configure tenant-wide applications including HRMS, CRM, and Project Management."
      />

      <Stack gap="lg">
        <Section title="Application Provisioning">
          <Card>
            <EmptyState
              title="Application Setup & Initialization"
              description="Application installation, feature toggles, and default company provisioning will be managed here in subsequent phases."
            />
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
