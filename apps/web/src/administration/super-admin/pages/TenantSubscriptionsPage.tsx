import { Page, PageHeader, Card, EmptyState } from '../../../design-system/components';

export function TenantSubscriptionsPage() {
  return (
    <Page>
      <PageHeader
        title="Tenant Subscriptions"
        subtitle="Active customer subscriptions, renewal schedules, and assigned subscription tiers."
      />
      <Card>
        <EmptyState
          title="No tenant subscriptions active"
          description="Customer tenant subscription assignments, commercial terms, and renewal states will appear here."
        />
      </Card>
    </Page>
  );
}
