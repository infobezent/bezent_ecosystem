import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { SettingsPage } from '../pages/SettingsPage';
import { GeneralSettingsSection } from '../components/GeneralSettingsSection';
import { StagesSection } from '../components/StagesSection';
import { FieldsSection } from '../components/FieldsSection';
import { DocumentsSection } from '../components/DocumentsSection';
import { DocumentModal } from '../components/DocumentModal';
import { ChecklistsSection } from '../components/ChecklistsSection';
import { ChecklistModal } from '../components/ChecklistModal';
import { ConversionSection } from '../components/ConversionSection';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import type {
  OnboardingGeneralSettings,
  OnboardingStageConfig,
  OnboardingFieldConfig,
  OnboardingDocumentRequirement,
  OnboardingChecklistTemplate,
  OnboardingConversionSettings,
} from '../types/settings';

const mockGeneral: OnboardingGeneralSettings = {
  id: 'gen_01',
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  onboardingEnabled: true,
  defaultDurationDays: 45,
  idPrefix: 'NH-',
  defaultLocationId: 'loc_chn_01',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const mockStages: OnboardingStageConfig[] = [
  {
    id: 'stg_1',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'preboarding',
    name: 'Pre-boarding',
    description: 'Initial checks before day 1',
    displayOrder: 1,
    isRequired: true,
    isActive: true,
    isSystem: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'stg_4',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'completed',
    name: 'Completed',
    description: 'Onboarding finalized',
    displayOrder: 4,
    isRequired: true,
    isActive: true,
    isSystem: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockFields: OnboardingFieldConfig[] = [
  {
    id: 'fld_1',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    fieldKey: 'firstName',
    label: 'First Name',
    isRequired: true,
    isEnabled: true,
    displayOrder: 1,
    isSystem: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'fld_2',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    fieldKey: 'phone',
    label: 'Phone Number',
    isRequired: false,
    isEnabled: true,
    displayOrder: 2,
    isSystem: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockDocs: OnboardingDocumentRequirement[] = [
  {
    id: 'doc_1',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    documentType: 'national_id',
    name: 'National ID Card',
    description: 'Government issued photo identity',
    isRequired: true,
    verificationRequired: true,
    expiryTracking: false,
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockChecklists: OnboardingChecklistTemplate[] = [
  {
    id: 'chk_1',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    name: 'Send Welcome Email',
    description: 'Welcome email with login credentials',
    stageKey: 'preboarding',
    assigneeType: 'hr',
    dueOffsetDays: -2,
    isRequired: true,
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockConversion: OnboardingConversionSettings = {
  id: 'conv_01',
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  autoConvertOnJoining: false,
  requireDocumentVerification: true,
  requireChecklistCompletion: true,
  employeeIdPrefix: 'EMP-',
  defaultEmploymentStatus: 'probation',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('HRMS Settings UI Components', () => {
  it('SettingsPage renders header, subtitle, and all 6 navigation tabs', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('HR Settings');
    expect(html).toContain('General');
    expect(html).toContain('Stages');
    expect(html).toContain('Fields');
    expect(html).toContain('Documents');
    expect(html).toContain('Checklists');
    expect(html).toContain('Employee Conversion');
  });

  it('hrmsRoutes routes /hrms/settings to real SettingsPage', () => {
    const basePathRoute = hrmsRoutes[0];
    const settingsRoute = basePathRoute?.children?.find((r) => r.path === 'settings');

    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(settingsRoute!.element as ReactElement);
    expect(html).toContain('HR Settings');
    expect(html).toContain('General');
  });

  it('hrmsRoutes routes /hrms/onboarding/workflow-settings to SettingsPage', () => {
    const basePathRoute = hrmsRoutes[0];
    const workflowSettingsRoute = basePathRoute?.children?.find(
      (r) => r.path === 'onboarding/workflow-settings',
    );

    expect(workflowSettingsRoute).toBeDefined();
    expect(workflowSettingsRoute?.element).toBeDefined();

    const html = renderToStaticMarkup(workflowSettingsRoute!.element as ReactElement);
    expect(html).toContain('HR Settings');
  });

  it('GeneralSettingsSection renders form controls and current values', () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsSection initialData={mockGeneral} onSave={async () => {}} saving={false} />,
    );

    expect(html).toContain('General Onboarding Settings');
    expect(html).toContain('Enable Onboarding Module');
    expect(html).toContain('NH-');
    expect(html).toContain('45');
    expect(html).toContain('loc_chn_01');
    expect(html).toContain('Save General Settings');
  });

  it('StagesSection renders stages in order and marks completed stage as protected', () => {
    const html = renderToStaticMarkup(
      <StagesSection stages={mockStages} onUpdateStage={async () => {}} />,
    );

    expect(html).toContain('Onboarding Pipeline Stages');
    expect(html).toContain('Pre-boarding');
    expect(html).toContain('Completed');
    expect(html).toContain('Protected System');
  });

  it('FieldsSection indicates system protected fields with locked toggles', () => {
    const html = renderToStaticMarkup(
      <FieldsSection fields={mockFields} onUpdateField={async () => {}} />,
    );

    expect(html).toContain('Onboarding Form Fields');
    expect(html).toContain('First Name');
    expect(html).toContain('Phone Number');
    expect(html).toContain('System Protected');
    expect(html).toContain('Standard');
  });

  it('DocumentsSection renders document requirement items and action buttons', () => {
    const html = renderToStaticMarkup(
      <DocumentsSection
        documents={mockDocs}
        onCreateDocument={async () => {}}
        onUpdateDocument={async () => {}}
        onDeleteDocument={async () => {}}
      />,
    );

    expect(html).toContain('Document Requirements');
    expect(html).toContain('National ID Card');
    expect(html).toContain('Mandatory');
    expect(html).toContain('Add Requirement');
  });

  it('DocumentModal renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <DocumentModal
        isOpen={false}
        onClose={() => {}}
        document={null}
        onSubmitCreate={async () => {}}
        onSubmitUpdate={async () => {}}
      />,
    );

    expect(html).toBe('');
  });

  it('DocumentModal renders complete input structure when open', () => {
    const html = renderToStaticMarkup(
      <DocumentModal
        isOpen={true}
        onClose={() => {}}
        document={null}
        onSubmitCreate={async () => {}}
        onSubmitUpdate={async () => {}}
      />,
    );

    expect(html).toContain('Add Document Requirement');
    expect(html).toContain('Document Type Key');
    expect(html).toContain('Document Display Name');
    expect(html).toContain('Mandatory Submission');
    expect(html).toContain('HR Verification Required');
  });

  it('ChecklistsSection renders stage filter tabs and tasks with due offsets', () => {
    const html = renderToStaticMarkup(
      <ChecklistsSection
        checklists={mockChecklists}
        onCreateChecklist={async () => {}}
        onUpdateChecklist={async () => {}}
        onDeleteChecklist={async () => {}}
      />,
    );

    expect(html).toContain('Checklist Task Templates');
    expect(html).toContain('All Stages (1)');
    expect(html).toContain('Send Welcome Email');
    expect(html).toContain('2d before joining');
    expect(html).toContain('Add Task Template');
  });

  it('ChecklistModal renders task name, stage, and assignee responsibility options', () => {
    const html = renderToStaticMarkup(
      <ChecklistModal
        isOpen={true}
        onClose={() => {}}
        checklist={null}
        onSubmitCreate={async () => {}}
        onSubmitUpdate={async () => {}}
      />,
    );

    expect(html).toContain('Add Checklist Task');
    expect(html).toContain('Task Name');
    expect(html).toContain('Assigned Stage');
    expect(html).toContain('Assignee Responsibility Category');
    expect(html).toContain('HR Team');
    expect(html).toContain('IT Administrator');
  });

  it('ConversionSection renders employee conversion switches and prefix fields', () => {
    const html = renderToStaticMarkup(
      <ConversionSection initialData={mockConversion} onSave={async () => {}} saving={false} />,
    );

    expect(html).toContain('Employee Conversion Rules');
    expect(html).toContain('Auto-Convert on Joining Date');
    expect(html).toContain('Mandate Document Verification');
    expect(html).toContain('Mandate Checklist Completion');
    expect(html).toContain('EMP-');
    expect(html).toContain('probation');
    expect(html).toContain('Save Conversion Rules');
  });
});
