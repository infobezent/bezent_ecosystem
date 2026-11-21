import { useMemo, useState } from 'react';
import { useLocation, useInRouterContext } from 'react-router-dom';
import {
  Avatar,
  Button,
  Inline,
  Page,
  PageHeader,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import { resolveProfileIdentity, useAuth } from '../../../../platform/auth';
import { SETTINGS_MODULE_CARDS, type SettingsModuleId } from '../types/settingsCenter';
import { DashboardSettingsSection } from '../general';
import { WorkforceSettingsSection } from '../workforce/WorkforceSettingsSection';
import { LeaveSettingsSection } from '../leave';
import { AttendanceSettingsSection } from '../attendance';
import { TimesheetsSettingsSection } from '../timesheets';
import { PerformanceSettingsSection } from '../performance';
import { MilestonesSettingsSection } from '../milestones/MilestonesSettingsSection';
import bezentMark from '../../../../assets/bezent-mark.png';

export interface SettingsPageInnerProps {
  initialModule?: SettingsModuleId;
}

export function SettingsPageInner({ initialModule = 'overview' }: SettingsPageInnerProps) {
  const { access, activeCompany } = useAuth();
  const [activeModule, setActiveModule] = useState<SettingsModuleId>(initialModule);
  const [searchQuery, setSearchQuery] = useState('');

  const { userName, userRole, userInitials } = useMemo(
    () => resolveProfileIdentity(access, activeCompany),
    [access, activeCompany],
  );

  const selectedModuleInfo = SETTINGS_MODULE_CARDS.find((m) => m.id === activeModule);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SETTINGS_MODULE_CARDS;
    return SETTINGS_MODULE_CARDS.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  return (
    <Page maxWidth="default">
      {activeModule === 'overview' ? (
        <Stack gap="lg">
          {/* Settings Center Top Header for Overview */}
          <PageHeader
            title="Settings"
            subtitle="Configure and manage settings across the BEZENT portal."
          />

          {/* Zoho-style Organization & License Usage Banner */}
          <div className="bezent-settings-zoho-banner">
            <div className="bezent-settings-zoho-banner__company">
              <div className="bezent-settings-zoho-banner__logo" aria-hidden="true">
                <img src={bezentMark} alt="Company Logo" className="bezent-settings-zoho-banner__logo-img" />
              </div>
              <div className="bezent-settings-zoho-banner__company-info">
                <h3 className="bezent-settings-zoho-banner__company-name">
                  {activeCompany?.companyName ?? 'BEZENT Demo Pvt Ltd'}
                </h3>
              </div>
            </div>

            <div className="bezent-settings-zoho-banner__user">
              <Avatar initials={userInitials} size="md" color="blue" />
              <div className="bezent-settings-zoho-banner__user-info">
                <div className="bezent-settings-zoho-banner__user-name">{userName}</div>
                <div className="bezent-settings-zoho-banner__user-role">{userRole || 'Super Administrator'}</div>
              </div>
            </div>
          </div>

          {/* Zoho-style Services Section Header with Search */}
          <div className="bezent-settings-zoho-services-header">
            <h2 className="bezent-settings-zoho-services-title">Services</h2>
            <div className="bezent-settings-zoho-search-box">
              <BezentIcon name="search" size={16} />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bezent-settings-zoho-search-input"
                aria-label="Search settings services"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="bezent-settings-zoho-search-clear"
                  aria-label="Clear search"
                >
                  <BezentIcon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Zoho-style Services Tiles Grid */}
          <div className="bezent-settings-zoho-grid">
            {filteredModules.map((mod) => (
              <div
                key={mod.id}
                className={`bezent-settings-zoho-tile bezent-settings-zoho-tile--${mod.id}`}
                onClick={() => setActiveModule(mod.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveModule(mod.id)}
                aria-label={`${mod.name} Settings`}
                title={mod.description}
              >
                <div className={`bezent-settings-zoho-tile__icon bezent-settings-zoho-tile__icon--${mod.id}`}>
                  <BezentIcon name={mod.icon as BezentIconName} size={24} />
                </div>
                <div className="bezent-settings-zoho-tile__name">{mod.name}</div>
                <span className="bezent-sr-only">{mod.description}</span>
              </div>
            ))}
          </div>
        </Stack>
      ) : activeModule === 'workforce' ||
        activeModule === 'onboarding' ||
        activeModule === 'employees' ||
        activeModule === 'hr-settings' ? (
        /* View 2: Unified Workforce Settings Workspace (ADR-019) */
        <WorkforceSettingsSection onBack={() => setActiveModule('overview')} />
      ) : (
        /* View 3: Other Module Configuration Workspaces */
        <Stack gap="lg">
          <Toolbar
            left={
              <Button variant="secondary" type="button" onClick={() => setActiveModule('overview')}>
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
            {activeModule === 'milestones' && <MilestonesSettingsSection />}
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
  const isWorkforceSettings =
    searchParams.get('module') === 'workforce' ||
    searchParams.get('module') === 'onboarding' ||
    searchParams.get('module') === 'employees' ||
    searchParams.get('module') === 'hr-settings' ||
    searchParams.get('tab') === 'onboarding' ||
    searchParams.has('sub');
  const requestedModule = SETTINGS_MODULE_CARDS.find((m) => m.id === searchParams.get('module'));
  const initialModule: SettingsModuleId =
    isWorkflowSettings || isWorkforceSettings ? 'workforce' : (requestedModule?.id ?? 'overview');
  return <SettingsPageInner initialModule={initialModule} />;
}

export function SettingsPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedSettingsPage />;
  }
  return <SettingsPageInner initialModule="overview" />;
}

export default SettingsPage;
