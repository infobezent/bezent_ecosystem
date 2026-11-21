import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  OnboardingGeneralSettingsManagement,
  DEFAULT_GENERAL_CONFIG,
} from '../tabs/general-settings/OnboardingGeneralSettingsManagement';
import { OnboardingPreferencesModal } from '../tabs/general-settings/OnboardingPreferencesModal';
import { AccessPermissionsModal } from '../tabs/general-settings/AccessPermissionsModal';
import { WorkflowPreferencesModal } from '../tabs/general-settings/WorkflowPreferencesModal';
import { DateTimePreferencesModal } from '../tabs/general-settings/DateTimePreferencesModal';
import { FormsOnboardingTab } from '../tabs/FormsOnboardingTab';

// Mock API calls
vi.mock('../../../api/onboardingGeneralSettingsApi', () => ({
  fetchGeneralConfig: vi.fn().mockResolvedValue(DEFAULT_GENERAL_CONFIG),
  updateGeneralConfig: vi.fn(),
  resetGeneralConfig: vi.fn().mockResolvedValue(DEFAULT_GENERAL_CONFIG),
}));

vi.mock('../../../api/pipelineSettingsApi', () => ({
  fetchPipelines: vi.fn().mockResolvedValue({
    data: [
      { id: 'standard_onboarding', name: 'Standard Enterprise Onboarding Pipeline', isActive: true, isDefault: true },
      { id: 'executive_onboarding', name: 'Executive Onboarding', isActive: true, isDefault: false },
    ],
  }),
}));

vi.mock('../../../api/checklistSettingsApi', () => ({
  fetchChecklistTemplates: vi.fn().mockResolvedValue({
    data: [
      { id: 'standard_checklists', name: 'Standard New Hire Checklist', isActive: true, isDefault: true },
    ],
  }),
}));

describe('Forms & Onboarding General Settings Management UI Components', () => {
  describe('1. Main Page UI & Four Section Cards (Balanced Configuration)', () => {
    it('renders the General Settings header, reset button, and description', () => {
      const html = renderToStaticMarkup(<OnboardingGeneralSettingsManagement />);

      expect(html).toContain('General Settings');
      expect(html).toContain('Reset to Defaults');
      expect(html).toContain(
        'Configure overarching onboarding preferences, access boundaries, stage workflow rules, and regional date/time formats.',
      );
    });

    it('renders all four section cards in responsive two-column grid', () => {
      const html = renderToStaticMarkup(<OnboardingGeneralSettingsManagement />);

      // Card 1: Onboarding Preferences
      expect(html).toContain('Onboarding Preferences');
      expect(html).toContain('Defaults, registration permissions, and module status');

      // Card 2: Access & Permissions
      expect(html).toContain('Access &amp; Permissions');
      expect(html).toContain('Portal access, HR scopes, and role permissions');

      // Card 3: Workflow Preferences
      expect(html).toContain('Workflow Preferences');
      expect(html).toContain('Stage skipping, backward justifications, and approvals');

      // Card 4: Date & Time Preferences
      expect(html).toContain('Date &amp; Time Preferences');
      expect(html).toContain('Timezone, date formats, and working week');
    });

    it('displays summary details, badges, and Configure buttons on all cards', () => {
      const html = renderToStaticMarkup(<OnboardingGeneralSettingsManagement />);

      // Badges
      expect(html).toContain('MODULE ACTIVE');
      expect(html).toContain('PORTAL ACTIVE');
      expect(html).toContain('STRICT PIPELINE');
      expect(html).toContain('Kolkata');

      // Summary lines
      expect(html).toContain('Default Pipeline &amp; Checklist');
      expect(html).toContain('standard_onboarding • standard_checklists');
      expect(html).toContain('Candidate Registration');
      expect(html).toContain('Candidate Portal');
      expect(html).toContain('Manager Visibility');
      expect(html).toContain('Stage Progression');
      expect(html).toContain('Checklist Tasks');
      expect(html).toContain('Tenant Timezone');
      expect(html).toContain('Display Formats');
      expect(html).toContain('SLA Calculation');
      expect(html).toContain('Mon – Fri (5 Business Days)');

      // Four configure buttons
      const configureBtnCount = (html.match(/>Configure<\/span>/g) || []).length;
      expect(configureBtnCount).toBe(4);
    });
  });

  describe('2. Onboarding Preferences Modal', () => {
    it('renders all fields, toggles, and configuration controls', () => {
      const html = renderToStaticMarkup(
        <OnboardingPreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          initialConfig={DEFAULT_GENERAL_CONFIG.preferences}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Onboarding Preferences');
      expect(html).toContain('Enable Onboarding Module');
      expect(html).toContain('Default Pipeline');
      expect(html).toContain('Default Checklist Template');
      expect(html).toContain('Default Candidate Initial Status');
      expect(html).toContain('Candidate Self-Registration');
      expect(html).toContain('HR Manual Candidate Creation');
      expect(html).toContain('Candidate Profile Editing After Submission');
      expect(html).toContain('Save');
    });
  });

  describe('3. Access & Permissions Modal', () => {
    it('renders candidate portal toggle, role chips, and access scope dropdowns', () => {
      const html = renderToStaticMarkup(
        <AccessPermissionsModal
          isOpen={true}
          onClose={vi.fn()}
          initialConfig={DEFAULT_GENERAL_CONFIG.access}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Access &amp; Permissions');
      expect(html).toContain('Candidate Portal Access');
      expect(html).toContain('HR Onboarding Access Roles');
      expect(html).toContain('Assigned HR Access Scope');
      expect(html).toContain('Hiring Manager Visibility');
      expect(html).toContain('Sensitive Document Access Roles');
      expect(html).toContain('Privileged Onboarding Action Roles');
      expect(html).toContain('Super Admin');
      expect(html).toContain('Company Admin');
      expect(html).toContain('HR Manager');
      expect(html).toContain('Save Permissions');
      expect(html).toContain('Save');
    });
  });

  describe('4. Workflow Preferences Modal', () => {
    it('renders workflow rule switches and stage discipline controls', () => {
      const html = renderToStaticMarkup(
        <WorkflowPreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          initialConfig={DEFAULT_GENERAL_CONFIG.workflow}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Workflow Preferences');
      expect(html).toContain('Allow Stage Skipping');
      expect(html).toContain('Require Reason for Backward Stage Movement');
      expect(html).toContain('Allow Checklist Reassignment');
      expect(html).toContain('Allow Overdue Task Completion');
      expect(html).toContain('Require Approval for Configured Actions');
      expect(html).toContain('Allow Reopening Completed Cases');
      expect(html).toContain('Save Preferences');
      expect(html).toContain('Save');
    });
  });

  describe('5. Date & Time Preferences Modal', () => {
    it('renders timezone, date/time format selects, and working week day buttons', () => {
      const html = renderToStaticMarkup(
        <DateTimePreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          initialConfig={DEFAULT_GENERAL_CONFIG.dateTime}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Date &amp; Time Preferences');
      expect(html).toContain('Tenant Timezone');
      expect(html).toContain('Date Format');
      expect(html).toContain('Time Format');
      expect(html).toContain('Day Calculation for Deadlines &amp; SLAs');
      expect(html).toContain('Working Week Schedule');
      expect(html).toContain('Mon');
      expect(html).toContain('Fri');
      expect(html).toContain('Save Preferences');
      expect(html).toContain('Save');
    });
  });

  describe('6. Forms & Onboarding Tab Integration', () => {
    it('renders the General Settings management component inside FormsOnboardingTab', () => {
      const html = renderToStaticMarkup(<FormsOnboardingTab />);

      expect(html).toContain('Forms &amp; Onboarding');
      expect(html).toContain('Candidate Intake Form');
      expect(html).toContain('Employee Conversion');
      expect(html).toContain('Notifications &amp; Reminders');
      expect(html).toContain('General Settings');
      expect(html).toContain('bezent-genpref-management');
      expect(html).toContain('Onboarding Preferences');
      expect(html).toContain('Access &amp; Permissions');
      expect(html).toContain('Workflow Preferences');
      expect(html).toContain('Date &amp; Time Preferences');
    });
  });
});
