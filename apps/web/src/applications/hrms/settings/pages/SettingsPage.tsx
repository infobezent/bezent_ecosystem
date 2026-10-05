import { useState } from 'react';
import { useLocation, useInRouterContext } from 'react-router-dom';
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
import { useAuth } from '../../../../platform/auth';
import { SETTINGS_MODULE_CARDS, type SettingsModuleId } from '../types/settingsCenter';
import { DashboardSettingsSection, EmployeesSettingsSection, HRSettingsSection } from '../general';
import { AdministrationSettingsSection } from '../administration';
import { LeaveSettingsSection } from '../leave';
import { AttendanceSettingsSection } from '../attendance';
import { TimesheetsSettingsSection } from '../timesheets';
import { PerformanceSettingsSection } from '../performance';

export interface SettingsPageInnerProps {
  initialModule?: SettingsModuleId;
}

export function SettingsPageInner({
  initialModule = 'overview',
}: SettingsPageInnerProps) {
  const { activeCompany } = useAuth();
  const [activeModule, setActiveModule] = useState<SettingsModuleId>(initialModule);

  const selectedModuleInfo = SETTINGS_MODULE_CARDS.find((m) => m.id === activeModule);

  return (
    <Page maxWidth="default">
      {activeModule === 'overview' ? (
        <Stack gap="lg">
          {/* Settings Center Top Header for Overview */}
          <PageHeader
            title="Settings"
            subtitle="Configure and manage settings across the BEZENT portal."
            actions={
              <Badge variant="info">
                <Inline gap="xs" align="center">
                  <BezentIcon name="hrSettings" size={14} />
                  <span>{activeCompany?.companyName ?? 'No company selected'}</span>
                </Inline>
              </Badge>
            }
          />

          {/* View 1: Overview Grid of 8 Enterprise Cards */}
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
        </Stack>
      ) : activeModule === 'onboarding' ? (
        /* View 2: Administration Workspace (Image 2 Approved Hierarchy) */
        <AdministrationSettingsSection onBack={() => setActiveModule('overview')} />
      ) : (
        /* View 3: Other Module Configuration Workspaces */
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
            {activeModule === 'leave' && <LeaveSettingsSection />}
            {activeModule === 'attendance' && <AttendanceSettingsSection />}
            {activeModule === 'timesheets' && <TimesheetsSettingsSection />}
            {activeModule === 'performance' && <PerformanceSettingsSection />}
            {activeModule === 'employees' && <EmployeesSettingsSection />}
            {activeModule === 'hr-settings' && <HRSettingsSection />}
          </div>
        </Stack>
      )}
    </Page>
  );
}

function RoutedSettingsPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isWorkflowSettings = location.pathname.includes('onboarding/workflow-settings');
  const hasOnboardingParam =
    searchParams.get('module') === 'onboarding' ||
    searchParams.get('tab') === 'onboarding' ||
    searchParams.has('sub');
  const initialModule: SettingsModuleId = isWorkflowSettings || hasOnboardingParam
    ? 'onboarding'
    : 'overview';
  return (
    <SettingsPageInner
      initialModule={initialModule}
    />
  );
}

export function SettingsPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedSettingsPage />;
  }
  return <SettingsPageInner initialModule="overview" />;
}

export default SettingsPage;
