import { useNavigate, useInRouterContext } from 'react-router-dom';
import { DepartmentsSection } from '../../../company-admin/organization/DepartmentsSection';

function RoutedDepartments() {
  const navigate = useNavigate();
  return (
    <DepartmentsSection
      onBack={() => navigate('/hrms/settings')}
      onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
      onNavigateToProfile={() => navigate('/company-admin/organization/profile')}
    />
  );
}

export function DepartmentsPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedDepartments />;
  }
  return <DepartmentsSection />;
}

export default DepartmentsPage;
