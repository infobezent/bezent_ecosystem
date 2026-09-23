import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
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
import './SettingsPage.css';

export function SettingsPage() {
  const devContext = useDevContext();
  const [activeModule, setActiveModule] = useState<SettingsModuleId>('overview');

  const selectedModuleInfo = SETTINGS_MODULE_CARDS.find((m) => m.id === activeModule);

  return (
    <div className="settings-page">
      {/* Settings Center Top Header */}
      <header className="settings-page__header">
        <div className="settings-page__title-group">
          <div className="settings-page__title-row">
            <h1 className="settings-page__title">Settings</h1>
            <span className="settings-page__company-badge">
              <BezentIcon name="hrSettings" size={14} />
              {devContext.companyName}
            </span>
          </div>
          <p className="settings-page__subtitle">
            Configure and manage settings across the BEZENT portal.
          </p>
        </div>
      </header>

      <main className="settings-page__content">
        {/* View 1: Overview Grid of 8 Enterprise Cards (Clean main content without duplicate top sub-nav) */}
        {activeModule === 'overview' ? (
          <div className="settings-overview-grid">
            {SETTINGS_MODULE_CARDS.map((mod) => (
              <div
                key={mod.id}
                className="settings-module-card"
                onClick={() => setActiveModule(mod.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveModule(mod.id)}
              >
                <div className="settings-module-card__icon-wrap">
                  <BezentIcon name={mod.icon} size={24} color="var(--primary-color, #1a73e8)" />
                </div>
                <div className="settings-module-card__body">
                  <h3 className="settings-module-card__title">{mod.name}</h3>
                  <p className="settings-module-card__desc">{mod.description}</p>
                </div>
                <div className="settings-module-card__arrow">
                  <BezentIcon name="chevronRight" size={18} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* View 2: Active Module Configuration Workspace */
          <div className="settings-workspace">
            <div className="settings-workspace__top-bar">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="btn-back-settings"
                onClick={() => setActiveModule('overview')}
              >
                <BezentIcon name="chevronLeft" size={16} />
                Back to Settings
              </Button>
              <div className="settings-breadcrumb">
                <span>Settings</span> /{' '}
                <strong className="active-breadcrumb">{selectedModuleInfo?.name}</strong>
              </div>
            </div>

            <div className="settings-workspace__body">
              {activeModule === 'dashboard' && <DashboardSettingsSection />}
              {activeModule === 'onboarding' && <OnboardingBuilderSection />}
              {activeModule === 'leave' && <LeaveSettingsSection />}
              {activeModule === 'attendance' && <AttendanceSettingsSection />}
              {activeModule === 'timesheets' && <TimesheetsSettingsSection />}
              {activeModule === 'performance' && <PerformanceSettingsSection />}
              {activeModule === 'employees' && <EmployeesSettingsSection />}
              {activeModule === 'hr-settings' && <HRSettingsSection />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SettingsPage;
