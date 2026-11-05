import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkforceSettingsSection } from '../WorkforceSettingsSection';
import { GeneralNumberingTab } from '../tabs/GeneralNumberingTab';
import { ProbationConfirmationTab } from '../tabs/ProbationConfirmationTab';
import { TransfersLifecycleTab } from '../tabs/TransfersLifecycleTab';
import { OffboardingClearanceTab } from '../tabs/OffboardingClearanceTab';
import type {
  WorkforceGeneralSettings,
  WorkforceEmploymentType,
  WorkforceProbationPolicy,
  WorkforceLifecyclePolicy,
  WorkforceOffboardingPolicy,
  WorkforceClearanceChecklistTemplate,
} from '../types/workforceSettings.types';

const mockGeneralSettings: WorkforceGeneralSettings = {
  id: 'set-gen-1',
  tenantId: 'tenant-1',
  companyId: 'comp-1',
  generationMode: 'automatic',
  idPrefix: 'EMP-',
  idSuffix: null,
  sequenceLength: 4,
  startingNumber: 1001,
  currentCounter: 1000,
  resetFrequency: 'never',
  allowManualOverride: true,
  preventIdReuse: true,
  autoProvisionUser: true,
  activationTiming: 'instant',
  nextSuggestedId: 'EMP-1001',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockEmploymentTypes: WorkforceEmploymentType[] = [
  {
    id: 'et-1',
    tenantId: 'tenant-1',
    companyId: 'comp-1',
    code: 'FT',
    name: 'Full Time Regular',
    description: 'Permanent employee',
    workHoursPerWeek: '40.0',
    isBenefitsEligible: true,
    defaultNoticeDays: 60,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'et-2',
    tenantId: 'tenant-1',
    companyId: 'comp-1',
    code: 'PT',
    name: 'Part Time',
    description: 'Part time employee',
    workHoursPerWeek: '20.0',
    isBenefitsEligible: false,
    defaultNoticeDays: 30,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockProbationPolicy: WorkforceProbationPolicy = {
  id: 'prob-1',
  tenantId: 'tenant-1',
  companyId: 'comp-1',
  defaultProbationDays: 90,
  confirmationMode: 'manager_review',
  reminderLeadDays: 14,
  maxExtensionDays: 90,
  maxExtensionsAllowed: 1,
  autoGenerateLetter: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockLifecyclePolicy: WorkforceLifecyclePolicy = {
  id: 'life-1',
  tenantId: 'tenant-1',
  companyId: 'comp-1',
  requireReleasingManagerApproval: true,
  effectiveDateAlignment: 'next_payroll_month',
  autoReassignShifts: true,
  autoReassignLeaveApprover: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockOffboardingPolicy: WorkforceOffboardingPolicy = {
  id: 'off-1',
  tenantId: 'tenant-1',
  companyId: 'comp-1',
  probationNoticeDays: 15,
  confirmedNoticeDays: 60,
  leadershipNoticeDays: 90,
  allowNoticeBuyout: true,
  allowLeaveOffset: true,
  resignationWithdrawalWindowDays: 7,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockClearanceTemplates: WorkforceClearanceChecklistTemplate[] = [
  {
    id: 'clr-1',
    tenantId: 'tenant-1',
    companyId: 'comp-1',
    department: 'it',
    itemTitle: 'Collect MacBook & Peripherals',
    description: 'Hardware handover',
    isMandatory: true,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'clr-2',
    tenantId: 'tenant-1',
    companyId: 'comp-1',
    department: 'finance',
    itemTitle: 'Clear Pending Expense Vouchers',
    description: null,
    isMandatory: true,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

describe('Workforce Settings Canonical 7 Tabs UI', () => {
  it('WorkforceSettingsSection renders loading state initially', () => {
    const html = renderToStaticMarkup(<WorkforceSettingsSection />);
    expect(html).toContain('Loading Workforce Settings...');
  });

  it('Tab 1: GeneralNumberingTab renders auto-numbering live preview and employment types', () => {
    const html = renderToStaticMarkup(
      <GeneralNumberingTab
        initialSettings={mockGeneralSettings}
        initialEmploymentTypes={mockEmploymentTypes}
        onReload={() => {}}
      />,
    );

    expect(html).toContain('Employee Auto-Numbering Engine');
    expect(html).toContain('Next ID Preview:');
    expect(html).toContain('EMP-1001');
    expect(html).toContain('Generation Mode');
    expect(html).toContain('Employment Types Master');
    expect(html).toContain('Full Time Regular');
    expect(html).toContain('Part Time');
    expect(html).toContain('Auto-provision User Account');
  });

  it('Tab 5: ProbationConfirmationTab renders evaluation rules and confirmation mode', () => {
    const html = renderToStaticMarkup(
      <ProbationConfirmationTab initialPolicy={mockProbationPolicy} onReload={() => {}} />,
    );

    expect(html).toContain('Probation &amp; Confirmation Policy');
    expect(html).toContain('Default Probation Duration (Days)');
    expect(html).toContain('Confirmation Mode');
    expect(html).toContain('Manager Review Required');
    expect(html).toContain('Auto-generate Confirmation Letter');
  });

  it('Tab 6: TransfersLifecycleTab renders dual-manager and cross-module policies', () => {
    const html = renderToStaticMarkup(
      <TransfersLifecycleTab initialPolicy={mockLifecyclePolicy} onReload={() => {}} />,
    );

    expect(html).toContain('Internal Transfers &amp; Lifecycle Governance');
    expect(html).toContain('Effective Date Alignment');
    expect(html).toContain('Require Dual-Manager Approval');
    expect(html).toContain('Auto-Reassign Attendance Shifts');
    expect(html).toContain('Auto-Reassign Leave Approver');
  });

  it('Tab 7: OffboardingClearanceTab renders notice matrix and department clearance items', () => {
    const html = renderToStaticMarkup(
      <OffboardingClearanceTab
        initialPolicy={mockOffboardingPolicy}
        initialClearanceTemplates={mockClearanceTemplates}
        onReload={() => {}}
      />,
    );

    expect(html).toContain('Notice Period Governance Matrix');
    expect(html).toContain('Probationary Notice');
    expect(html).toContain('Confirmed Employee Notice');
    expect(html).toContain('Department Clearance Checklist Templates');
    expect(html).toContain('Collect MacBook &amp; Peripherals');
    expect(html).toContain('Clear Pending Expense Vouchers');
    expect(html).toContain('Mandatory (Blocks F&amp;F)');
  });
});
