import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page, PageHeader, Stack, Tabs } from '../../../design-system/components';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';

/**
 * Organization Management workspace for Company Administration.
 *
 * Exposes ONLY shared company masters:
 * - Organization Structure (including Business Units & Divisions)
 * - Departments
 * - Work Locations
 *
 * Company Profile is canonical and managed exclusively at /company-admin/profile.
 * Workforce-specific entities (Designations, Job Levels, Grades, Reporting Structure)
 * are HRMS-owned concepts and live in HRMS Settings -> Administration -> Employee Configuration.
 */

import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import { DepartmentsSection } from '../organization/DepartmentsSection';
import { WorkLocationsSection } from '../organization/WorkLocationsSection';

export type OrganizationSection = 'structure' | 'departments' | 'work-locations';

export const ORGANIZATION_TABS: { id: OrganizationSection; label: string }[] = [
  { id: 'structure', label: 'Organization Structure' },
  { id: 'departments', label: 'Departments' },
  { id: 'work-locations', label: 'Work Locations' },
];

const VALID_SECTIONS = new Set<string>(ORGANIZATION_TABS.map((t) => t.id));

function isValidSection(s: string | undefined): s is OrganizationSection {
  return Boolean(s && VALID_SECTIONS.has(s));
}

export function CompanyOrganizationPage() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const { activeCompany } = useCompanyAdmin();

  // If a user navigates to legacy /organization/profile, redirect immediately to canonical /company-admin/profile
  useEffect(() => {
    if (section === 'profile') {
      navigate('/company-admin/profile', { replace: true });
    }
  }, [section, navigate]);

  const activeSection: OrganizationSection = isValidSection(section) ? section : 'structure';

  function handleTabChange(id: string) {
    navigate(`/company-admin/organization/${id}`, { replace: true });
  }

  function handleBack() {
    navigate('/company-admin/organization', { replace: true });
  }

  const tabItems = ORGANIZATION_TABS.map((t) => ({ id: t.id, label: t.label }));

  return (
    <Page>
      <PageHeader
        title="Organization Management"
        subtitle={`Organizational hierarchy, departments, and office locations for ${activeCompany?.name || 'Company'}`}
      />

      <CompanyContextBar />

      <Stack gap="lg">
        {/* URL-driven tab bar — the URL is the source of truth for active section */}
        <Tabs
          items={tabItems}
          activeId={activeSection}
          onChange={handleTabChange}
          variant="underline"
        />

        {/* Section content */}
        {activeSection === 'structure' && (
          <OrganizationStructureSection
            onBack={handleBack}
            onNavigateToProfile={() => navigate('/company-admin/profile')}
          />
        )}

        {activeSection === 'departments' && (
          <DepartmentsSection
            onBack={handleBack}
            onNavigateToStructure={() => handleTabChange('structure')}
          />
        )}

        {activeSection === 'work-locations' && (
          <WorkLocationsSection
            onBack={handleBack}
            onNavigateToDepartments={() => handleTabChange('departments')}
            onNavigateToStructure={() => handleTabChange('structure')}
          />
        )}
      </Stack>
    </Page>
  );
}

export default CompanyOrganizationPage;
