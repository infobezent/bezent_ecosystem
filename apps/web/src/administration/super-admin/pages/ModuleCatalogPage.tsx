import { Page, PageHeader, Card, EmptyState } from '../../../design-system/components';

export function ModuleCatalogPage() {
  return (
    <Page>
      <PageHeader
        title="Module Catalog"
        subtitle="Functional business modules and domain capabilities within each enterprise application."
      />
      <Card>
        <EmptyState
          title="Modular Capability Catalog"
          description="Modular domain definitions and capability boundaries available across enterprise applications."
        />
      </Card>
    </Page>
  );
}
