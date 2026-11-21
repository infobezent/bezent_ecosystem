import React, { useState, useEffect, useCallback } from 'react';
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
import { FormsOnboardingTab } from './tabs/FormsOnboardingTab';
import { ProbationConfirmationTab } from './tabs/ProbationConfirmationTab';
import { TransfersLifecycleTab } from './tabs/TransfersLifecycleTab';
import { OffboardingClearanceTab } from './tabs/OffboardingClearanceTab';

export interface WorkforceSettingsSectionProps {
  onBack?: () => void;
  initialTab?: WorkforceTabId;
}

export type WorkforceGroupId = 'setup' | 'forms-onboarding' | 'lifecycle';

export const WORKFORCE_PRIMARY_TABS = [
  {
    id: 'setup' as WorkforceGroupId,
    label: 'Setup & Hierarchy',
    icon: <BezentIcon name="organization" size={16} />,
  },
  {
    id: 'forms-onboarding' as WorkforceGroupId,
    label: 'Forms & Onboarding',
    icon: <BezentIcon name="onboarding" size={16} />,
  },
  {
    id: 'lifecycle' as WorkforceGroupId,
    label: 'Employee Lifecycle',
    icon: <BezentIcon name="refresh" size={16} />,
  },
] as const;

export const WORKFORCE_SETTINGS_TABS: {
  id: WorkforceTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'setup',
    label: 'Setup & Hierarchy',
    icon: <BezentIcon name="organization" size={16} />,
  },
  {
    id: 'forms-onboarding',
    label: 'Forms & Onboarding',
    icon: <BezentIcon name="onboarding" size={16} />,
  },
  {
    id: 'lifecycle',
    label: 'Employee Lifecycle',
    icon: <BezentIcon name="refresh" size={16} />,
  },
];

function normalizeGroupId(tab: string | null): WorkforceGroupId {
  if (!tab) return 'setup';
  if (tab === 'setup' || tab === 'general' || tab === 'organization') return 'setup';
  if (
    tab === 'forms-onboarding' ||
    tab === 'registration-forms' ||
    tab === 'onboarding-workflows'
  ) {
    return 'forms-onboarding';
  }
  if (tab === 'lifecycle' || tab === 'probation' || tab === 'offboarding') return 'lifecycle';
  return 'setup';
}

function readWorkforceTabFromUrl(): WorkforceGroupId | null {
  if (typeof window === 'undefined') return null;
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab ? normalizeGroupId(tab) : null;
}

function writeWorkforceTabToUrl(tab: WorkforceGroupId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(window.history.state, '', url);
}

export function WorkforceSettingsSection({
  onBack,
  initialTab = 'setup',
}: WorkforceSettingsSectionProps) {
  const [activeGroup, setActiveGroup] = useState<WorkforceGroupId>(
    () => readWorkforceTabFromUrl() ?? normalizeGroupId(initialTab),
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

  const handleGroupChange = (newGroupId: string) => {
    const groupId = normalizeGroupId(newGroupId);
    setActiveGroup(groupId);
    writeWorkforceTabToUrl(groupId);
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
    <Stack gap="md">
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

      <h1 className="bezent-sr-only">Workforce Settings</h1>

      {/* 3 Primary Tabs — Zero Sub-tabs */}
      <Tabs
        items={WORKFORCE_PRIMARY_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon,
        }))}
        activeId={activeGroup}
        onChange={handleGroupChange}
        variant="underline"
      />

      {/* Category 1: Setup & Hierarchy (Smart 2-Column Command Center) */}
      {activeGroup === 'setup' && (
        <GeneralNumberingTab
          initialSettings={bundle.general}
          initialEmploymentTypes={bundle.employmentTypes}
          onReload={loadData}
        />
      )}

      {/* Category 2: Forms & Onboarding (Smart 2-Column Command Center) */}
      {activeGroup === 'forms-onboarding' && <FormsOnboardingTab />}

      {/* Category 3: Employee Lifecycle (Command Center Cards Feed - Option B) */}
      {activeGroup === 'lifecycle' && (
        <div className="bezent-lifecycle-feed">
          <ProbationConfirmationTab initialPolicy={bundle.probation} onReload={loadData} />
          <TransfersLifecycleTab initialPolicy={bundle.lifecycle} onReload={loadData} />
          <OffboardingClearanceTab
            initialPolicy={bundle.offboarding}
            initialClearanceTemplates={bundle.clearanceTemplates}
            onReload={loadData}
          />
        </div>
      )}
    </Stack>
  );
}

export default WorkforceSettingsSection;
