import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { PipelineStagesManagement } from '../tabs/pipeline-stages/PipelineStagesManagement';
import { CreateEditPipelineModal } from '../tabs/pipeline-stages/CreateEditPipelineModal';
import { ConfigureStagesModal } from '../tabs/pipeline-stages/ConfigureStagesModal';
import { AddEditStageModal } from '../tabs/pipeline-stages/AddEditStageModal';
import { PipelineAssignmentRulesModal } from '../tabs/pipeline-stages/PipelineAssignmentRulesModal';
import type { OnboardingPipeline, PipelineAssignmentRule } from '../../types/pipeline.types';

// Mock authorizedFetch and APIs
vi.mock('../../../api/pipelineSettingsApi', () => ({
  fetchPipelines: vi.fn().mockResolvedValue([
    {
      id: 'pipe_std_01',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_demo_01',
      name: 'Standard Employee Onboarding',
      code: 'standard',
      description: 'Default onboarding pipeline for regular employees',
      isDefault: true,
      isActive: true,
      version: 1,
      stages: [
        {
          id: 'stg_1',
          stageKey: 'preboarding',
          name: 'Pre-boarding',
          stageType: 'standard',
          displayOrder: 1,
          isRequired: true,
          isActive: true,
          isTerminal: false,
          allowManualEntry: true,
          allowManualExit: true,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
        {
          id: 'stg_2',
          stageKey: 'completed',
          name: 'Completed',
          stageType: 'final',
          displayOrder: 2,
          isRequired: true,
          isActive: true,
          isTerminal: true,
          allowManualEntry: true,
          allowManualExit: false,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
      ],
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
  ]),
  fetchPipelineRules: vi.fn().mockResolvedValue([
    {
      id: 'rule_1',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_demo_01',
      name: 'Contractor Pipeline Route',
      priority: 1,
      conditionField: 'employmentType',
      operator: 'equals',
      conditionValue: 'contract',
      targetPipelineId: 'pipe_std_01',
      isActive: true,
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
  ]),
  createPipeline: vi.fn(),
  updatePipeline: vi.fn(),
  savePipelineStages: vi.fn(),
  duplicatePipeline: vi.fn(),
  deletePipeline: vi.fn(),
  savePipelineRules: vi.fn(),
}));

describe('Pipeline Stages Management UI Components', () => {
  const mockPipeline: OnboardingPipeline = {
    id: 'pipe_std_01',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    name: 'Standard Employee Onboarding',
    code: 'standard',
    description: 'Default onboarding pipeline for regular employees',
    isDefault: true,
    isActive: true,
    version: 1,
    stages: [
      {
        id: 'stg_1',
        stageKey: 'preboarding',
        name: 'Pre-boarding',
        stageType: 'standard',
        displayOrder: 1,
        isRequired: true,
        isActive: true,
        isTerminal: false,
        allowManualEntry: true,
        allowManualExit: true,
        requireChecklist: false,
        requireDocVerification: false,
        requireHrApproval: false,
      },
      {
        id: 'stg_2',
        stageKey: 'completed',
        name: 'Completed',
        stageType: 'final',
        displayOrder: 2,
        isRequired: true,
        isActive: true,
        isTerminal: true,
        allowManualEntry: true,
        allowManualExit: false,
        requireChecklist: false,
        requireDocVerification: false,
        requireHrApproval: false,
      },
    ],
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
  };

  const mockRule: PipelineAssignmentRule = {
    id: 'rule_1',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    name: 'Contractor Pipeline Route',
    priority: 1,
    conditionField: 'employmentType',
    operator: 'equals',
    conditionValue: 'contract',
    targetPipelineId: 'pipe_std_01',
    isActive: true,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
  };

  it('renders PipelineStagesManagement main page structure with header and assignment section', () => {
    const html = renderToStaticMarkup(<PipelineStagesManagement />);
    expect(html).toContain('Pipeline Stages');
    expect(html).toContain('Configure onboarding pipelines for different employee categories.');
    expect(html).toContain('Create Pipeline');
    expect(html).toContain('Pipeline Library');
    expect(html).toContain('Pipeline Assignment');
    expect(html).toContain('Configure Assignment Rules');
  });

  it('renders CreateEditPipelineModal with form controls', () => {
    const html = renderToStaticMarkup(
      <CreateEditPipelineModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} pipeline={null} />,
    );
    expect(html).toContain('Create Pipeline');
    expect(html).toContain('Pipeline Name');
    expect(html).toContain('Description');
    expect(html).toContain('Set as Default Pipeline');
    expect(html).toContain('Cancel');
  });

  it('renders ConfigureStagesModal with ordered stages, entry badge, and final milestone', () => {
    const html = renderToStaticMarkup(
      <ConfigureStagesModal
        isOpen={true}
        onClose={vi.fn()}
        pipeline={mockPipeline}
        onSaveStages={vi.fn()}
      />,
    );
    expect(html).toContain('Configure Stages — Standard Employee Onboarding');
    expect(html).toContain('Add Stage');
    expect(html).toContain('Pre-boarding');
    expect(html).toContain('Entry Stage');
    expect(html).toContain('Completed');
    expect(html).toContain('Final Milestone');
    expect(html).toContain('Save Changes');
  });

  it('renders AddEditStageModal with stage types and gating controls', () => {
    const html = renderToStaticMarkup(
      <AddEditStageModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        stage={mockPipeline.stages[0]}
        existingStages={mockPipeline.stages}
      />,
    );
    expect(html).toContain('Edit Stage');
    expect(html).toContain('Stage Name');
    expect(html).toContain('Stage Type');
    expect(html).toContain('Stage Controls &amp; Gating');
    expect(html).toContain('Allow Manual Entry');
    expect(html).toContain('Require Checklist Completion');
    expect(html).toContain('Require Document Verification');
    expect(html).toContain('Require HR Approval');
  });

  it('renders PipelineAssignmentRulesModal with rule table and precedence policy', () => {
    const html = renderToStaticMarkup(
      <PipelineAssignmentRulesModal
        isOpen={true}
        onClose={vi.fn()}
        pipelines={[mockPipeline]}
        rules={[mockRule]}
        onSaveRules={vi.fn()}
      />,
    );
    expect(html).toContain('Pipeline Assignment Rules');
    expect(html).toContain('Contractor Pipeline Route');
    expect(html).toContain('Employment Type equals &quot;contract&quot;');
    expect(html).toContain('Assignment Precedence Order');
    expect(html).toContain('1. Priority Matching Rule');
    expect(html).toContain('2. Manual HR Selection');
    expect(html).toContain('3. Organization Default');
  });
});
