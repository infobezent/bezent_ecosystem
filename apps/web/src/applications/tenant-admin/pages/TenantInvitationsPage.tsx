import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  EmptyState,
} from '../../../design-system/components';

export function TenantInvitationsPage() {
  return (
    <Page>
      <PageHeader
        title="Invitations"
        subtitle="Manage pending email invitations and onboarding registrations across the tenant."
      />

      <Stack gap="lg">
        <Section title="Pending Invitations">
          <Card>
            <EmptyState
              title="No Pending Invitations"
              description="There are currently no active or pending member invitations in this tenant."
            />
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
