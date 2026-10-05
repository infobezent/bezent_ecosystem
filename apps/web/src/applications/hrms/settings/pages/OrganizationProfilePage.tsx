import { useNavigate, useInRouterContext } from 'react-router-dom';
import { OrganizationProfileSection } from '../../../company-admin/organization/OrganizationProfileSection';
import type { OrganizationProfile } from '../../../company-admin/organization/types/organization';

export interface OrganizationProfilePageProps {
  initialProfile?: OrganizationProfile;
}

function RoutedOrganizationProfile({ initialProfile }: OrganizationProfilePageProps) {
  const navigate = useNavigate();
  return (
    <OrganizationProfileSection
      initialProfile={initialProfile}
      onBack={() => navigate('/hrms/settings')}
    />
  );
}

export function OrganizationProfilePage({ initialProfile }: OrganizationProfilePageProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedOrganizationProfile initialProfile={initialProfile} />;
  }
  return <OrganizationProfileSection initialProfile={initialProfile} />;
}

export default OrganizationProfilePage;
