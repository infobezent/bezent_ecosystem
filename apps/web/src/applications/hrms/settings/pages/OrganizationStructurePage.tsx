import { useNavigate, useInRouterContext } from 'react-router-dom';
import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import type { OrganizationHierarchy } from '../../organization/types/structure';

export interface OrganizationStructurePageProps {
  initialHierarchy?: OrganizationHierarchy;
}

function RoutedOrganizationStructure({ initialHierarchy }: OrganizationStructurePageProps) {
  const navigate = useNavigate();
  return (
    <OrganizationStructureSection
      initialHierarchy={initialHierarchy}
      onBack={() => navigate('/hrms/settings')}
      onNavigateToProfile={() => navigate('/hrms/settings/organization/profile')}
    />
  );
}

export function OrganizationStructurePage({
  initialHierarchy,
}: OrganizationStructurePageProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedOrganizationStructure initialHierarchy={initialHierarchy} />;
  }
  return <OrganizationStructureSection initialHierarchy={initialHierarchy} />;
}

export default OrganizationStructurePage;
