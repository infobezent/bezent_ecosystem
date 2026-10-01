import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Inline,
  Page,
  PageHeader,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { OrganizationProfileSection } from './OrganizationProfileSection';
import { OrganizationStructureSection } from './OrganizationStructureSection';
import type { OrganizationProfile } from '../../organization/api/organizationApi';
import type { OrganizationHierarchy } from '../../organization/types/structure';

export type OrganizationTabId =
  | 'profile'
  | 'structure'
  | 'departments'
  | 'designations'
  | 'locations'
  | 'job-levels'
  | 'cost-centers'
  | 'reporting-structure';

export interface OrganizationSettingsWorkspaceProps {
  initialTab?: OrganizationTabId;
  initialProfile?: OrganizationProfile;
  initialHierarchy?: OrganizationHierarchy;
  onBack?: () => void;
}

export const ORGANIZATION_NAV_TABS: {
  id: OrganizationTabId;
  label: string;
  isImplemented: boolean;
}[] = [
  { id: 'profile', label: 'Organization Profile', isImplemented: true },
  { id: 'structure', label: 'Organization Structure', isImplemented: true },
  { id: 'departments', label: 'Departments', isImplemented: false },
  { id: 'designations', label: 'Designations', isImplemented: false },
  { id: 'locations', label: 'Work Locations', isImplemented: false },
  { id: 'job-levels', label: 'Job Levels / Grades', isImplemented: false },
  { id: 'cost-centers', label: 'Cost Centers', isImplemented: false },
  { id: 'reporting-structure', label: 'Reporting Structure', isImplemented: false },
];

export function OrganizationSettingsWorkspace({
  initialTab = 'profile',
  initialProfile,
  initialHierarchy,
  onBack,
}: OrganizationSettingsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<OrganizationTabId>(initialTab);

  const tabItems = ORGANIZATION_NAV_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    disabled: false,
  }));

  const activeTabDef = ORGANIZATION_NAV_TABS.find((t) => t.id === activeTab);

  return (
    <Stack gap="lg">
      {/* Subnavigation Bar */}
      <Tabs
        items={tabItems}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as OrganizationTabId)}
        variant="underline"
      />

      {/* Render Selected View */}
      {activeTab === 'profile' && (
        <OrganizationProfileSection
          initialProfile={initialProfile}
          onBack={onBack}
        />
      )}

      {activeTab === 'structure' && (
        <OrganizationStructureSection
          initialHierarchy={initialHierarchy}
          onBack={onBack}
          onNavigateToProfile={() => setActiveTab('profile')}
        />
      )}

      {activeTabDef && !activeTabDef.isImplemented && (
        <Page maxWidth="default">
          <Stack gap="lg">
            {onBack && (
              <Toolbar
                left={
                  <Button variant="secondary" type="button" onClick={onBack}>
                    <BezentIcon name="chevronLeft" size={16} />
                    Back to Settings
                  </Button>
                }
                right={
                  <Inline gap="xs" align="center">
                    <span>Settings</span>
                    <span>/</span>
                    <span>Organization</span>
                    <span>/</span>
                    <strong>{activeTabDef.label}</strong>
                  </Inline>
                }
              />
            )}

            <PageHeader
              title={activeTabDef.label}
              subtitle={`Manage ${activeTabDef.label.toLowerCase()} within your active company.`}
            />

            <Card variant="flat" padding="lg">
              <CardBody>
                <Stack gap="md">
                  <Alert variant="info">
                    {activeTabDef.label} master management will be available in the upcoming release.
                    Only <strong>Organization Profile</strong> and <strong>Organization Structure</strong> are
                    active in this phase.
                  </Alert>
                  <Inline gap="sm">
                    <Button variant="secondary" onClick={() => setActiveTab('structure')}>
                      Go to Organization Structure
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('profile')}>
                      Go to Organization Profile
                    </Button>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        </Page>
      )}
    </Stack>
  );
}
