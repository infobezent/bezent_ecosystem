import { Page, PageHeader, Card, EmptyState } from '../../../design-system/components';

export function ApplicationCatalogPage() {
  return (
    <Page>
      <PageHeader
        title="Application Catalog"
        subtitle="Catalog of top-level enterprise business applications registered in BEZENT."
      />
      <Card>
        <EmptyState
          title="Platform Application Catalog"
          description="Enterprise business applications (HRMS, CRM, Project Management) and global platform capability registrations."
        />
      </Card>
    </Page>
  );
}
