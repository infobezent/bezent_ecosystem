import { useState } from 'react';
import {
  Button,
  Card,
  CardIcon,
  CardTitle,
  CardDescription,
  Grid,
  Page,
  PageHeader,
  Badge,
  Toolbar,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useDevContext } from '../../../../platform/context/DevContext';
import { SETTINGS_MODULE_CARDS, type SettingsModuleId } from '../types/settingsCenter';
import { DashboardSettingsSection } from '../components/DashboardSettingsSection';
import { OnboardingBuilderSection } from '../components/OnboardingBuilderSection';
import { LeaveSettingsSection } from '../components/LeaveSettingsSection';
import { AttendanceSettingsSection } from '../components/AttendanceSettingsSection';
import { TimesheetsSettingsSection } from '../components/TimesheetsSettingsSection';
import { PerformanceSettingsSection } from '../components/PerformanceSettingsSection';
import { EmployeesSettingsSection } from '../components/EmployeesSettingsSection';
import { HRSettingsSection } from '../components/HRSettingsSection';

export function SettingsPage() {
  const devContext = useDevContext();
  const [activeModule, setActiveModule] = useState<SettingsModuleId>('overview');

  const selectedModuleInfo = SETTINGS_MODULE_CARDS.find((m) => m.id === activeModule);

  return (
    <Page maxWidth="default">
      <Stack gap="lg">
        {/* Settings Center Top Header */}
        <PageHeader
          title="Settings"
          subtitle="Configure and manage settings across the BEZENT portal."
          actions={
            <Badge variant="info">
              <Inline gap="xs" align="center">
                <BezentIcon name="hrSettings" size={14} />
                <span>{devContext.companyName}</span>
              </Inline>
            </Badge>
          }
        />

        {/* View 1: Overview Grid of 8 Enterprise Cards (Clean main content without duplicate top sub-nav) */}
        {activeModule === 'overview' ? (
          <Grid columns={3} gap="lg">
            {SETTINGS_MODULE_CARDS.map((mod) => (
              <Card
                key={mod.id}
                variant="interactive"
                padding="md"
                onClick={() => setActiveModule(mod.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveModule(mod.id)}
              >
                <div className="bezent-toolbar">
                  <Inline gap="md" align="center">
                    <CardIcon>
                      <BezentIcon name={mod.icon} size={24} />
                    </CardIcon>
                    <div>
                      <CardTitle>{mod.name}</CardTitle>
                      <CardDescription>{mod.description}</CardDescription>
                    </div>
                  </Inline>
                  <BezentIcon name="chevronRight" size={18} />
                </div>
              </Card>
            ))}
          </Grid>
        ) : (
          /* View 2: Active Module Configuration Workspace */
          <Stack gap="lg">
            <Toolbar
              left={
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setActiveModule('overview')}
                >
                  <BezentIcon name="chevronLeft" size={16} />
                  Back to Settings
                </Button>
              }
              right={
                <Inline gap="xs" align="center">
                  <span>Settings</span>
                  <span>/</span>
                  <strong>{selectedModuleInfo?.name}</strong>
                </Inline>
              }
            />

            <div>
              {activeModule === 'dashboard' && <DashboardSettingsSection />}
              {activeModule === 'onboarding' && <OnboardingBuilderSection />}
              {activeModule === 'leave' && <LeaveSettingsSection />}
              {activeModule === 'attendance' && <AttendanceSettingsSection />}
              {activeModule === 'timesheets' && <TimesheetsSettingsSection />}
              {activeModule === 'performance' && <PerformanceSettingsSection />}
              {activeModule === 'employees' && <EmployeesSettingsSection />}
              {activeModule === 'hr-settings' && <HRSettingsSection />}
            </div>
          </Stack>
        )}
      </Stack>
    </Page>
  );
}

export default SettingsPage;
