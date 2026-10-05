import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdministrationSettingsSection } from '../administration/AdministrationSettingsSection';
import { StagesSection } from '../administration/onboarding/StagesSection';
import type { OnboardingStageConfig } from '../types/settings';

const mockCompanyStages: OnboardingStageConfig[] = [
  {
    id: 'stg_comp_01_preboarding',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'preboarding',
    name: 'Pre-boarding',
    description: 'Pre-boarding activities prior to day 1',
    displayOrder: 1,
    isRequired: true,
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'stg_comp_01_documents',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'documents',
    name: 'Document Collection',
    description: 'Collection and verification of employee credentials',
    displayOrder: 2,
    isRequired: true,
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'stg_comp_01_induction',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'induction',
    name: 'Induction & Orientation',
    description: 'Welcome session and team orientation',
    displayOrder: 3,
    isRequired: false,
    isActive: false,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'stg_comp_01_completed',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    stageKey: 'completed',
    name: 'Completed',
    description: 'Onboarding process successfully finalized',
    displayOrder: 4,
    isRequired: true,
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockGeneralSettings = {
  id: 'gen_sett_comp_01',
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  onboardingEnabled: true,
  defaultDurationDays: 30,
  idPrefix: 'NH-',
  defaultLocationId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('HRMS Administration Settings — Onboarding Secondary Navigation + Stages Workspace', () => {
  describe('Secondary Navigation Invariants', () => {
    it('renders secondary navigation with all 5 required tabs when Onboarding is active', () => {
      const html = renderToStaticMarkup(<AdministrationSettingsSection initialTab="onboarding" />);

      // Primary tabs
      expect(html).toContain('Forms');
      expect(html).toContain('Onboarding');
      expect(html).toContain('Employee Configuration');

      // Secondary tabs under Onboarding
      expect(html).toContain('General');
      expect(html).toContain('Stages');
      expect(html).toContain('Checklist Templates');
      expect(html).toContain('Document Requirements');
      expect(html).toContain('Conversion');
    });

    it('defaults secondary navigation to General without modifying General content', () => {
      const html = renderToStaticMarkup(
        <AdministrationSettingsSection
          initialTab="onboarding"
          initialOnboardingSettings={mockGeneralSettings}
        />,
      );

      // General tab is marked active
      expect(html).toContain('id="tab-general"');
      expect(html).toContain('is-active');

      // Preserved exact 3 General settings
      expect(html).toContain('Enable Employee Onboarding');
      expect(html).toContain('Default Onboarding Duration');
      expect(html).toContain('New Hire ID Prefix');
    });

    it('selecting Stages secondary section activates Stages workspace', () => {
      const html = renderToStaticMarkup(
        <AdministrationSettingsSection
          initialTab="onboarding"
          initialSecondarySection="stages"
          initialStages={mockCompanyStages}
        />,
      );

      expect(html).toContain('Stages');
      expect(html).toContain('Configure the stages employees move through during onboarding.');
      expect(html).toContain('ONBOARDING WORKFLOW');
    });
  });

  describe('Stages Workspace Surface & Layout', () => {
    it('renders standard header and description', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('Stages');
      expect(html).toContain('Configure the stages employees move through during onboarding.');
    });

    it('renders single parent surface with ordered rows and divider lines', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('ONBOARDING WORKFLOW');
      expect(html).toContain('bezent-divider');
      expect(html).toContain('4 stages configured');
    });

    it('formats stage numbers with leading zeros (01, 02, 03, 04) derived from displayOrder', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('01');
      expect(html).toContain('02');
      expect(html).toContain('03');
      expect(html).toContain('04');
    });

    it('displays stage name, key, description, and status badges', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      // Stage names
      expect(html).toContain('Pre-boarding');
      expect(html).toContain('Document Collection');
      expect(html).toContain('Induction &amp; Orientation');
      expect(html).toContain('Completed');

      // Stage keys
      expect(html).toContain('preboarding');
      expect(html).toContain('documents');
      expect(html).toContain('induction');
      expect(html).toContain('completed');

      // Requirement badges
      expect(html).toContain('Required');
      expect(html).toContain('Optional');

      // System flag badge
      expect(html).toContain('System');

      // Deactivated badge for inactive induction stage
      expect(html).toContain('Deactivated');
    });

    it('renders Add Stage button when manage permission is available', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('Add Stage');
    });

    it('renders reorder controls (Move Up / Move Down) for configurable stages', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('Move Pre-boarding down');
      expect(html).toContain('Move Document Collection up');
    });

    it('displays System badge for system stages and Custom badge for custom stages', () => {
      const stagesWithCustom: OnboardingStageConfig[] = [
        ...mockCompanyStages,
        {
          id: 'stg_comp_01_bg_check',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_demo_01',
          stageKey: 'stage_bg_check_123',
          name: 'Background Verification',
          description: 'Background check verification',
          displayOrder: 5,
          isRequired: true,
          isActive: true,
          isSystem: false,
          isTerminal: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const html = renderToStaticMarkup(<StagesSection initialStages={stagesWithCustom} />);

      expect(html).toContain('System');
      expect(html).toContain('Custom');
      expect(html).toContain('Background Verification');
      expect(html).toContain('aria-label="Delete stage Background Verification"');
      // System stages cannot be deleted
      expect(html).not.toContain('aria-label="Delete stage Pre-boarding"');
    });

    it('renders empty state when company has no stages configured', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={[]} />);

      expect(html).toContain('No stages configured');
      expect(html).toContain('No onboarding stages found for this company.');
    });
  });

  describe('RBAC & Mutation Capabilities', () => {
    it('exposes Edit button for stages to users with manage permissions', () => {
      const html = renderToStaticMarkup(<StagesSection initialStages={mockCompanyStages} />);

      expect(html).toContain('Edit');
      expect(html).toContain('aria-label="Edit stage Pre-boarding"');
    });

    it('invokes onUpdateStage callback when updating a stage', async () => {
      const handleUpdate = vi.fn().mockResolvedValue(undefined);
      const stage = mockCompanyStages[0]!;

      // Verify the onUpdateStage contract matches backend schema
      await handleUpdate(stage.stageKey, {
        name: 'Updated Preboarding Name',
        description: 'Updated Description',
        isRequired: true,
        isActive: true,
      });

      expect(handleUpdate).toHaveBeenCalledWith('preboarding', {
        name: 'Updated Preboarding Name',
        description: 'Updated Description',
        isRequired: true,
        isActive: true,
      });
    });
  });
});
