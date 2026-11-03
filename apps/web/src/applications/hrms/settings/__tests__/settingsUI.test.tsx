import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { SettingsPage, SettingsPageInner } from '../pages/SettingsPage';
import { DashboardSettingsSection } from '../general/DashboardSettingsSection';
import { OnboardingBuilderSection } from '../administration/onboarding/OnboardingBuilderSection';
import { LeaveSettingsSection } from '../leave/LeaveSettingsSection';
import { AttendanceSettingsSection } from '../attendance/AttendanceSettingsSection';
import { TimesheetsSettingsSection } from '../timesheets/TimesheetsSettingsSection';
import { PerformanceSettingsSection } from '../performance/PerformanceSettingsSection';
import { CustomFieldsProvider } from '../context/CustomFieldsContext';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
// SettingsPage shows the signed-in session's active company.
import { AuthProvider } from '../../../../platform/auth';

describe('BEZENT Common Portal Settings Center UI', () => {
  it('SettingsPage renders common portal header and clean content without duplicate top sub-nav', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>,
    );

    expect(html).toContain('Settings');
    expect(html).toContain('Configure and manage settings across the BEZENT portal.');
    expect(html).not.toContain('settings-page__domain-nav');
  });

  it('SettingsPage renders Workforce Settings workspace when activeModule is workforce or onboarding', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <SettingsPageInner initialModule="workforce" />
      </AuthProvider>,
    );

    // Initial loading or loaded state for Workforce Settings
    expect(html).toContain('Loading Workforce Settings...');
    expect(html).not.toContain('Configure and manage settings across the BEZENT portal.');
  });

  it('SettingsPage Overview view displays unified Workforce module card', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>,
    );

    expect(html).toContain('Workforce');
    expect(html).toContain('Configure auto-numbering series');
    expect(html).toContain('Leave');
    expect(html).toContain('Attendance');
    expect(html).toContain('Timesheets');
    expect(html).toContain('Performance');
    expect(html).toContain('Milestones &amp; Rewards');
  });

  it('hrmsRoutes routes /hrms/settings to real SettingsPage', () => {
    const basePathRoute = hrmsRoutes[0];
    const settingsRoute = basePathRoute?.children?.find((r) => r.path === 'settings');

    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(
      <AuthProvider>{settingsRoute!.element as ReactElement}</AuthProvider>,
    );
    expect(html).toContain('Settings');
    expect(html).toContain('Configure and manage settings across the BEZENT portal.');
  });

  it('DashboardSettingsSection renders auto-refresh choices and widget toggles', () => {
    const html = renderToStaticMarkup(<DashboardSettingsSection />);

    expect(html).toContain('Dashboard Settings');
    expect(html).toContain('Auto-Refresh Interval');
    expect(html).toContain('Workforce Overview');
    expect(html).toContain('Attendance Today');
  });

  it('Administration Customization Builder renders section management without Publish button', () => {
    const html = renderToStaticMarkup(
      <CustomFieldsProvider>
        <OnboardingBuilderSection />
      </CustomFieldsProvider>,
    );

    expect(html).toContain('Administration Customization Builder');
    expect(html).toContain('Preview Form');
    expect(html).not.toContain('Publish Customization');
    expect(html).toContain('General');
    expect(html).toContain('Personal Information');
    expect(html).toContain('Administration');
  });

  it('LeaveSettingsSection renders general, leave types, and leave policies tabs', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <LeaveSettingsSection />
      </AuthProvider>,
    );

    expect(html).toContain('General Settings');
    expect(html).toContain('Leave Types');
    expect(html).toContain('Leave Policies');
  });

  it('AttendanceSettingsSection renders check-in rules and attendance modes', () => {
    const html = renderToStaticMarkup(<AttendanceSettingsSection />);

    expect(html).toContain('General');
    expect(html).toContain('Attendance Policies');
    expect(html).toContain('Regularization');
    expect(html).toContain('Capture &amp; Devices');
  });

  it('TimesheetsSettingsSection renders entry rules and time categories', () => {
    const html = renderToStaticMarkup(<TimesheetsSettingsSection />);

    expect(html).toContain('Timesheets Settings');
    expect(html).toContain('Require Project Selection');
    expect(html).toContain('Software Development');
  });

  it('PerformanceSettingsSection renders rating scale choices and competencies', () => {
    const html = renderToStaticMarkup(<PerformanceSettingsSection />);

    expect(html).toContain('Performance Settings');
    expect(html).toContain('Default Rating Scale');
    expect(html).toContain('Leadership &amp; Ownership');
  });
});
