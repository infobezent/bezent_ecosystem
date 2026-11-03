import React, { useState } from 'react';
import { Stack, Tabs } from '../../../../../design-system/components';
import { DesignationsSection } from '../../administration/employee-configuration/DesignationsSection';
import { JobLevelsGradesSection } from '../../administration/employee-configuration/JobLevelsGradesSection';

export type HierarchySubTab = 'designations' | 'job-levels';

export function OrganizationHierarchyTab() {
  const [activeSubTab, setActiveSubTab] = useState<HierarchySubTab>('designations');

  const subTabs = [
    { id: 'designations', label: 'Designations' },
    { id: 'job-levels', label: 'Job Levels / Grades' },
  ];

  return (
    <Stack gap="lg">
      <Tabs
        items={subTabs}
        activeId={activeSubTab}
        onChange={(id) => setActiveSubTab(id as HierarchySubTab)}
        variant="underline"
      />

      {activeSubTab === 'designations' ? <DesignationsSection /> : <JobLevelsGradesSection />}
    </Stack>
  );
}
