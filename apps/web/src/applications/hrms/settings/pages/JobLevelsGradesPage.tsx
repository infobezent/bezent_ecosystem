import { useNavigate, useInRouterContext } from 'react-router-dom';
import { JobLevelsGradesSection } from '../administration/employee-configuration/JobLevelsGradesSection';

function RoutedJobLevelsGrades() {
  const navigate = useNavigate();
  return (
    <JobLevelsGradesSection
      onBack={() => navigate('/hrms/settings')}
      onNavigateToDesignations={() => navigate('/hrms/settings?tab=employee-configuration&sub=designations')}
      onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
    />
  );
}

export function JobLevelsGradesPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedJobLevelsGrades />;
  }
  return <JobLevelsGradesSection />;
}

export default JobLevelsGradesPage;
