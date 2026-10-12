import { Page, PageHeader, Card, EmptyState } from '../../../design-system/components';

export function PlansPage() {
  return (
    <Page>
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage commercial tiers, feature entitlements, and pricing plans across the platform."
      />
      <Card>
        <EmptyState
          title="No subscription plans configured"
          description="Commercial subscription plans, pricing tiers, and entitlement packages will appear here once defined."
        />
      </Card>
    </Page>
  );
}
