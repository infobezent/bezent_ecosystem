import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  EmployeeConversionManagement,
  DEFAULT_CONVERSION_CONFIG,
} from '../tabs/employee-conversion/EmployeeConversionManagement';
import { ConversionSettingsModal } from '../tabs/employee-conversion/ConversionSettingsModal';
import { FieldMappingModal } from '../tabs/employee-conversion/FieldMappingModal';
import { RequiredInformationModal } from '../tabs/employee-conversion/RequiredInformationModal';
import { PostConversionActionsModal } from '../tabs/employee-conversion/PostConversionActionsModal';
import { ConversionRulesModal } from '../tabs/employee-conversion/ConversionRulesModal';
import { FormsOnboardingTab } from '../tabs/FormsOnboardingTab';

// Mock API calls
vi.mock('../../../api/employeeConversionApi', () => ({
  fetchConversionConfig: vi.fn().mockResolvedValue(DEFAULT_CONVERSION_CONFIG),
  updateConversionConfig: vi.fn(),
  resetConversionConfig: vi.fn().mockResolvedValue(DEFAULT_CONVERSION_CONFIG),
  fetchConversionPreview: vi.fn(),
  executeCandidateConversion: vi.fn(),
  retryConversionActions: vi.fn(),
}));

describe('Employee Conversion Settings & Management UI Components', () => {
  describe('1. Main Page UI & Five Section Cards', () => {
    it('renders the Employee Conversion main page with header, reset button, and description', () => {
      const html = renderToStaticMarkup(<EmployeeConversionManagement />);

      expect(html).toContain('Employee Conversion');
      expect(html).toContain('Reset to Defaults');
      expect(html).toContain('Configure criteria, field mappings, mandatory prerequisites');
    });

    it('renders all five configuration section cards in responsive layout', () => {
      const html = renderToStaticMarkup(<EmployeeConversionManagement />);

      // Card 1
      expect(html).toContain('Conversion Settings');
      expect(html).toContain('Mode, default trigger stage, and status defaults');

      // Card 2
      expect(html).toContain('Field Mapping');
      expect(html).toContain('Candidate intake to employee directory mappings');

      // Card 3
      expect(html).toContain('Required Information');
      expect(html).toContain('Prerequisite fields validated before conversion');

      // Card 4
      expect(html).toContain('Post-Conversion Actions');
      expect(html).toContain('Automated workflows triggered on employee creation');

      // Card 5
      expect(html).toContain('Conversion Rules &amp; Safeguards');
      expect(html).toContain('Duplicate prevention, transactional integrity, and authorized roles');
    });

    it('displays summary badges and status values on the cards', () => {
      const html = renderToStaticMarkup(<EmployeeConversionManagement />);

      expect(html).toContain('BOTH');
      expect(html).toContain('Active Mappings');
      expect(html).toContain('Mandatory');
      expect(html).toContain('Actions Active');
      expect(html).toContain('Safeguards Protected');
    });
  });

  describe('2. Conversion Settings Modal', () => {
    it('renders compact Conversion Settings popup with mode, trigger, status, and HR override', () => {
      const html = renderToStaticMarkup(
        <ConversionSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          initialSettings={DEFAULT_CONVERSION_CONFIG.settings}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Conversion Settings');
      expect(html).toContain('Conversion Mode');
      expect(html).toContain('Default Mode');
      expect(html).toContain('Conversion Trigger Stage');
      expect(html).toContain('Initial Employee Status');
      expect(html).toContain('Effective Joining Date');
      expect(html).toContain('Allow HR Override');
      expect(html).toContain('Save Settings');
      expect(html).toContain('Cancel');
    });
  });

  describe('3. Field Mapping Modal', () => {
    it('renders Field Mapping popup with table, mapping rows, and add button', () => {
      const html = renderToStaticMarkup(
        <FieldMappingModal
          isOpen={true}
          onClose={vi.fn()}
          initialMappings={DEFAULT_CONVERSION_CONFIG.fieldMappings}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Field Mapping');
      expect(html).toContain('Mapped Fields');
      expect(html).toContain('Candidate Field');
      expect(html).toContain('Employee Field');
      expect(html).toContain('Full Name');
      expect(html).toContain('displayName');
      expect(html).toContain('Work Email');
      expect(html).toContain('Add Mapping');
      expect(html).toContain('Save Mappings');
    });
  });

  describe('4. Required Information Modal', () => {
    it('renders Required Information popup with grouped sections and mandatory/optional toggles', () => {
      const html = renderToStaticMarkup(
        <RequiredInformationModal
          isOpen={true}
          onClose={vi.fn()}
          initialItems={DEFAULT_CONVERSION_CONFIG.requiredInformation}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Required Information');
      expect(html).toContain('1. Personal Information');
      expect(html).toContain('2. Employment Information');
      expect(html).toContain('3. Additional Information');
      expect(html).toContain('Full Name');
      expect(html).toContain('System Mandatory');
      expect(html).toContain('Work Email');
      expect(html).toContain('Save Required Information');
    });
  });

  describe('5. Post-Conversion Actions Modal', () => {
    it('renders Post-Conversion Actions popup with supported workflow handoffs and idempotency note', () => {
      const html = renderToStaticMarkup(
        <PostConversionActionsModal
          isOpen={true}
          onClose={vi.fn()}
          initialActions={DEFAULT_CONVERSION_CONFIG.postConversionActions}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Post-Conversion Actions');
      expect(html).toContain('Create Employee Profile');
      expect(html).toContain('Apply Applicable Checklist Templates');
      expect(html).toContain('Apply Applicable Required Documents');
      expect(html).toContain('Enable Employee Self-Service (ESS) Access');
      expect(html).toContain('Send Configured Welcome Notifications');
      expect(html).toContain('Idempotent Guarantee');
      expect(html).toContain('Save Actions');
    });
  });

  describe('6. Conversion Rules & Safeguards Modal', () => {
    it('renders Conversion Rules popup with safeguard switches and authorized roles selection', () => {
      const html = renderToStaticMarkup(
        <ConversionRulesModal
          isOpen={true}
          onClose={vi.fn()}
          initialRules={DEFAULT_CONVERSION_CONFIG.conversionRules}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Configure Conversion Rules &amp; Safeguards');
      expect(html).toContain('Prevent Duplicate Employee Creation');
      expect(html).toContain('Validate Required Fields Before Conversion');
      expect(html).toContain('Preserve Candidate &amp; Onboarding History');
      expect(html).toContain('Allow Retry After Failed Conversion');
      expect(html).toContain('Record Conversion Activity &amp; Audit Log');
      expect(html).toContain('Authorized Roles for Conversion');
      expect(html).toContain('Super Admin');
      expect(html).toContain('HR Manager');
      expect(html).toContain('Save Rules');
    });
  });

  describe('7. Forms & Onboarding Tab Integration', () => {
    it('renders Employee Conversion within FormsOnboardingTab as full-width section', () => {
      const html = renderToStaticMarkup(<FormsOnboardingTab />);

      expect(html).toContain('Employee Conversion');
      expect(html).toContain('Conversion Settings');
      expect(html).toContain('Field Mapping');
      expect(html).toContain('Required Information');
      expect(html).toContain('Post-Conversion Actions');
      expect(html).toContain('Conversion Rules &amp; Safeguards');
    });
  });
});
