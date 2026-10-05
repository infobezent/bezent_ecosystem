import { useNavigate, useInRouterContext } from 'react-router-dom';
import { DesignationsSection } from '../administration/employee-configuration/DesignationsSection';

function RoutedDesignations() {
  const navigate = useNavigate();
  return (
    <DesignationsSection
      onBack={() => navigate('/hrms/settings')}
      onNavigateToDepartments={() => navigate('/company-admin/organization/departments')}
      onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
    />
  );
}

export function DesignationsPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedDesignations />;
  }
  return <DesignationsSection />;
}

export default DesignationsPage;
