import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  EmptyState,
} from '../../../design-system/components';

export function TenantRolesPage() {
  return (
    <Page>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Tenant administrative roles and granular company authorization permissions."
      />

      <Stack gap="lg">
        <Section title="Role Catalog">
          <Card>
            <EmptyState
              title="Roles & Permissions Engine"
              description="Role definitions, permission bindings, and company assignments are managed through canonical platform RBAC."
            />
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
