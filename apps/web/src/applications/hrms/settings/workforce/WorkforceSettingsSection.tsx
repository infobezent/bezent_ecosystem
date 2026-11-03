import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useInRouterContext } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  LoadingState,
  PageHeader,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { WorkforceSettingsBundle, WorkforceTabId } from './types/workforceSettings.types';
import { fetchWorkforceSettingsBundle } from './api/workforceSettingsApi';
import { GeneralNumberingTab } from './tabs/GeneralNumberingTab';
import { OrganizationHierarchyTab } from './tabs/OrganizationHierarchyTab';
import { RegistrationFormsTab } from './tabs/RegistrationFormsTab';
import { OnboardingWorkflowsTab } from './tabs/OnboardingWorkflowsTab';
import { ProbationConfirmationTab } from './tabs/ProbationConfirmationTab';
import { TransfersLifecycleTab } from './tabs/TransfersLifecycleTab';
import { OffboardingClearanceTab } from './tabs/OffboardingClearanceTab';

export interface WorkforceSettingsSectionProps {
  onBack?: () => void;
  initialTab?: WorkforceTabId;
}

export const WORKFORCE_SETTINGS_TABS: {
  id: WorkforceTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'general',
    label: 'General & Auto-Numbering',
    icon: <BezentIcon name="settings" size={16} />,
  },
  {
    id: 'organization',
    label: 'Organization & Hierarchy',
    icon: <BezentIcon name="organization" size={16} />,
  },
  {
    id: 'registration-forms',
    label: 'Registration & Forms',
    icon: <BezentIcon name="document" size={16} />,
  },
  {
    id: 'onboarding-workflows',
    label: 'Onboarding Workflows',
    icon: <BezentIcon name="onboarding" size={16} />,
  },
  {
    id: 'probation',
    label: 'Probation & Confirmation',
    icon: <BezentIcon name="checkCircle" size={16} />,
  },
  {
    id: 'lifecycle',
    label: 'Transfers & Lifecycle',
    icon: <BezentIcon name="refresh" size={16} />,
  },
  {
    id: 'offboarding',
    label: 'Offboarding & Clearance',
    icon: <BezentIcon name="users" size={16} />,
  },
];

export function WorkforceSettingsSection({
  onBack,
  initialTab = 'general',
}: WorkforceSettingsSectionProps) {
  const inRouter = useInRouterContext();
  const [searchParams, setSearchParams] = inRouter
    ? useSearchParams()
    : [new URLSearchParams(), () => {}];

  const tabFromParam = (searchParams.get('tab') as WorkforceTabId) || null;
  const validTabs: WorkforceTabId[] = [
    'general',
    'organization',
    'registration-forms',
    'onboarding-workflows',
    'probation',
    'lifecycle',
    'offboarding',
  ];

  const [activeTab, setActiveTab] = useState<WorkforceTabId>(
    tabFromParam && validTabs.includes(tabFromParam) ? tabFromParam : initialTab,
  );

  const [bundle, setBundle] = useState<WorkforceSettingsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWorkforceSettingsBundle();
      setBundle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workforce settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (newTab: string) => {
    const tabId = newTab as WorkforceTabId;
    setActiveTab(tabId);
    if (inRouter) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tabId);
          return next;
        },
        { replace: true },
      );
    }
  };

  if (loading) {
    return <LoadingState label="Loading Workforce Settings..." />;
  }

  if (error || !bundle) {
    return (
      <Card variant="flat" padding="lg">
        <Stack gap="md" align="center">
          <Alert variant="danger">{error || 'Failed to load workforce settings.'}</Alert>
          <Button variant="secondary" size="sm" onClick={loadData} type="button">
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Toolbar
        left={
          onBack ? (
            <Button variant="secondary" type="button" onClick={onBack}>
              <BezentIcon name="chevronLeft" size={16} />
              Back to Settings
            </Button>
          ) : undefined
        }
      />

      <PageHeader
        title="Workforce Settings"
        subtitle="Configure workforce auto-numbering, hierarchy masters, dynamic forms, onboarding workflows, probation policies, transfer governance, and offboarding clearances."
      />

      <Tabs
        items={WORKFORCE_SETTINGS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon,
        }))}
        activeId={activeTab}
        onChange={handleTabChange}
        variant="underline"
      />

      {/* Tab 1: General & Auto-Numbering */}
      {activeTab === 'general' && (
        <GeneralNumberingTab
          initialSettings={bundle.general}
          initialEmploymentTypes={bundle.employmentTypes}
          onReload={loadData}
        />
      )}

      {/* Tab 2: Organization & Hierarchy */}
      {activeTab === 'organization' && <OrganizationHierarchyTab />}

      {/* Tab 3: Registration & Custom Forms */}
      {activeTab === 'registration-forms' && <RegistrationFormsTab />}

      {/* Tab 4: Onboarding Workflows */}
      {activeTab === 'onboarding-workflows' && <OnboardingWorkflowsTab />}

      {/* Tab 5: Probation & Confirmation */}
      {activeTab === 'probation' && (
        <ProbationConfirmationTab initialPolicy={bundle.probation} onReload={loadData} />
      )}

      {/* Tab 6: Transfers & Lifecycle */}
      {activeTab === 'lifecycle' && (
        <TransfersLifecycleTab initialPolicy={bundle.lifecycle} onReload={loadData} />
      )}

      {/* Tab 7: Offboarding & Clearance */}
      {activeTab === 'offboarding' && (
        <OffboardingClearanceTab
          initialPolicy={bundle.offboarding}
          initialClearanceTemplates={bundle.clearanceTemplates}
          onReload={loadData}
        />
      )}
    </Stack>
  );
}

export default WorkforceSettingsSection;
