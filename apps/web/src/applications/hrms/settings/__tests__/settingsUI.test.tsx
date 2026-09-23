import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { SettingsPage } from '../pages/SettingsPage';
import { DashboardSettingsSection } from '../components/DashboardSettingsSection';
import { OnboardingBuilderSection } from '../components/OnboardingBuilderSection';
import { LeaveSettingsSection } from '../components/LeaveSettingsSection';
import { AttendanceSettingsSection } from '../components/AttendanceSettingsSection';
import { TimesheetsSettingsSection } from '../components/TimesheetsSettingsSection';
import { PerformanceSettingsSection } from '../components/PerformanceSettingsSection';
import { EmployeesSettingsSection } from '../components/EmployeesSettingsSection';
import { HRSettingsSection } from '../components/HRSettingsSection';
import { CustomFieldsProvider } from '../context/CustomFieldsContext';
import { hrmsRoutes } from '../../routes/hrmsRoutes';

describe('BEZENT Common Portal Settings Center UI', () => {
  it('SettingsPage renders common portal header and clean content without duplicate top sub-nav', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('Settings');
    expect(html).toContain('Configure and manage settings across the BEZENT portal.');
    expect(html).not.toContain('settings-page__domain-nav');
  });

  it('SettingsPage Overview view displays Administration module card', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('Administration');
    expect(html).toContain(
      'Customize employee registration sections, fields, options, and requirements.',
    );
    expect(html).toContain('Leave');
    expect(html).toContain('Attendance');
    expect(html).toContain('Timesheets');
    expect(html).toContain('Performance');
    expect(html).toContain('Employees');
    expect(html).toContain('HR Settings');
  });

  it('hrmsRoutes routes /hrms/settings to real SettingsPage', () => {
    const basePathRoute = hrmsRoutes[0];
    const settingsRoute = basePathRoute?.children?.find((r) => r.path === 'settings');

    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(settingsRoute!.element as ReactElement);
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

  it('LeaveSettingsSection renders leave types table', () => {
    const html = renderToStaticMarkup(<LeaveSettingsSection />);

    expect(html).toContain('Leave Settings');
    expect(html).toContain('Annual Leave');
    expect(html).toContain('Sick Leave');
    expect(html).toContain('+ Add Leave Type');
  });

  it('AttendanceSettingsSection renders check-in rules and attendance modes', () => {
    const html = renderToStaticMarkup(<AttendanceSettingsSection />);

    expect(html).toContain('Attendance Settings');
    expect(html).toContain('Grace Period for Late Arrival');
    expect(html).toContain('On-site Office Check-in');
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

  it('EmployeesSettingsSection renders departments and employment types', () => {
    const html = renderToStaticMarkup(<EmployeesSettingsSection />);

    expect(html).toContain('Employees Settings');
    expect(html).toContain('Engineering');
    expect(html).toContain('Full-Time Permanent');
  });

  it('HRSettingsSection renders employee change requests and company policies', () => {
    const html = renderToStaticMarkup(<HRSettingsSection />);

    expect(html).toContain('HR Settings &amp; Governance');
    expect(html).toContain('Employee Change Requests');
    expect(html).toContain('Company Policies');
    expect(html).toContain('Sarah Jenkins');
  });
});
