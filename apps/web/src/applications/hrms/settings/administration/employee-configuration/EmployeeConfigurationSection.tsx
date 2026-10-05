import { useState } from 'react';
import { useNavigate, useInRouterContext, useSearchParams } from 'react-router-dom';
import { Stack, Tabs } from '../../../../../design-system/components';
import { EmployeeNumberingSection } from './EmployeeNumberingSection';
import { DesignationsSection } from './DesignationsSection';
import { JobLevelsGradesSection } from './JobLevelsGradesSection';

export type EmployeeConfigurationSubSection = 'numbering' | 'designations' | 'job-levels';

export interface EmployeeConfigurationSectionProps {
  initialSubSection?: EmployeeConfigurationSubSection;
  onSubSectionChange?: (sub: EmployeeConfigurationSubSection) => void;
  onBack?: () => void;
}

const EMPLOYEE_CONFIG_TABS: { id: EmployeeConfigurationSubSection; label: string }[] = [
  { id: 'numbering', label: 'Employee Numbering' },
  { id: 'designations', label: 'Designations' },
  { id: 'job-levels', label: 'Job Levels / Grades' },
];

function RoutedEmployeeConfigurationSection({
  initialSubSection = 'numbering',
  onBack,
}: EmployeeConfigurationSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const subParam = searchParams.get('sub') as EmployeeConfigurationSubSection | null;
  const validSubs: EmployeeConfigurationSubSection[] = ['numbering', 'designations', 'job-levels'];
  const activeSub: EmployeeConfigurationSubSection =
    subParam && validSubs.includes(subParam) ? subParam : initialSubSection;

  const handleSubChange = (newSub: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'employee-configuration');
        next.set('sub', newSub);
        return next;
      },
      { replace: true },
    );
  };

  const handleBack = onBack ?? (() => navigate('/hrms/settings'));

  return (
    <Stack gap="lg">
      <Tabs
        items={EMPLOYEE_CONFIG_TABS}
        activeId={activeSub}
        onChange={handleSubChange}
        variant="underline"
      />

      {activeSub === 'numbering' && <EmployeeNumberingSection />}

      {activeSub === 'designations' && (
        <DesignationsSection
          onBack={handleBack}
          onNavigateToDepartments={() => navigate('/company-admin/organization/departments')}
          onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
        />
      )}

      {activeSub === 'job-levels' && (
        <JobLevelsGradesSection
          onBack={handleBack}
          onNavigateToDesignations={() => handleSubChange('designations')}
          onNavigateToStructure={() => navigate('/company-admin/organization/structure')}
        />
      )}
    </Stack>
  );
}

function UnroutedEmployeeConfigurationSection({
  initialSubSection = 'numbering',
  onSubSectionChange,
  onBack,
}: EmployeeConfigurationSectionProps) {
  const [activeSub, setActiveSub] = useState<EmployeeConfigurationSubSection>(initialSubSection);

  const handleSubChange = (newSub: string) => {
    const sub = newSub as EmployeeConfigurationSubSection;
    setActiveSub(sub);
    onSubSectionChange?.(sub);
  };

  return (
    <Stack gap="lg">
      <Tabs
        items={EMPLOYEE_CONFIG_TABS}
        activeId={activeSub}
        onChange={handleSubChange}
        variant="underline"
      />

      {activeSub === 'numbering' && <EmployeeNumberingSection />}

      {activeSub === 'designations' && <DesignationsSection onBack={onBack} />}

      {activeSub === 'job-levels' && (
        <JobLevelsGradesSection
          onBack={onBack}
          onNavigateToDesignations={() => handleSubChange('designations')}
        />
      )}
    </Stack>
  );
}

export function EmployeeConfigurationSection(props: EmployeeConfigurationSectionProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedEmployeeConfigurationSection {...props} />;
  }
  return <UnroutedEmployeeConfigurationSection {...props} />;
}

export default EmployeeConfigurationSection;
