import { useNavigate, useInRouterContext } from 'react-router-dom';
import { WorkLocationsSection } from '../../../company-admin/organization/WorkLocationsSection';

function RoutedWorkLocations() {
  const navigate = useNavigate();
  return (
    <WorkLocationsSection
      onBack={() => navigate('/hrms/settings')}
      onNavigateToDepartments={() => navigate('/company-admin/organization/departments')}
      onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
    />
  );
}

export function WorkLocationsPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedWorkLocations />;
  }
  return <WorkLocationsSection />;
}

export default WorkLocationsPage;
