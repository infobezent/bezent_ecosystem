import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ChecklistTemplatesManagement } from '../tabs/checklist-templates/ChecklistTemplatesManagement';
import { CreateEditTemplateModal } from '../tabs/checklist-templates/CreateEditTemplateModal';
import { AddEditTaskModal } from '../tabs/checklist-templates/AddEditTaskModal';
import type {
  ChecklistTemplate,
  ChecklistTaskGroup,
  ChecklistTaskItem,
} from '../../types/checklist.types';

// Mock API calls
vi.mock('../../../api/checklistSettingsApi', () => ({
  fetchChecklistTemplates: vi.fn().mockResolvedValue([
    {
      id: 'chk_test_01',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_demo_01',
      name: 'Standard Employee Onboarding Checklist',
      description: 'Default onboarding checklist for regular employees',
      category: 'General',
      applicableTo: 'all',
      isActive: true,
      version: 1,
      groups: [
        {
          id: 'grp_test_1',
          name: 'Pre-boarding & Day 1',
          displayOrder: 1,
        },
      ],
      tasks: [
        {
          id: 'tsk_test_1',
          name: 'Verify ID Documents',
          groupId: 'grp_test_1',
          assignedTo: 'hr',
          isRequired: true,
          dueOffsetDays: 0,
          attachmentRequirement: 'required',
          approvalRequired: false,
          visibility: 'internal',
          displayOrder: 1,
        },
      ],
      createdAt: 'Recently',
      updatedAt: 'Recently',
    },
  ]),
  createChecklistTemplate: vi.fn(),
  updateChecklistTemplate: vi.fn(),
  saveChecklistTasks: vi.fn(),
  duplicateChecklistTemplate: vi.fn(),
  deleteChecklistTemplate: vi.fn(),
}));

describe('Checklist Templates Management UI Components', () => {
  const mockGroups: ChecklistTaskGroup[] = [
    { id: 'grp_1', name: 'Pre-boarding & Day 1', displayOrder: 1 },
    { id: 'grp_2', name: 'Week 1 Compliance', displayOrder: 2 },
  ];

  const mockTasks: ChecklistTaskItem[] = [
    {
      id: 'tsk_1',
      name: 'Verify Government ID and Tax Forms',
      groupId: 'grp_1',
      assignedTo: 'hr',
      isRequired: true,
      dueOffsetDays: 0,
      attachmentRequirement: 'required',
      approvalRequired: true,
      visibility: 'internal',
      displayOrder: 1,
    },
    {
      id: 'tsk_2',
      name: 'Complete Workplace Safety Module',
      groupId: 'grp_2',
      assignedTo: 'employee',
      isRequired: false,
      dueOffsetDays: 3,
      attachmentRequirement: 'none',
      approvalRequired: false,
      visibility: 'employee_visible',
      displayOrder: 1,
    },
  ];

  const mockTemplate: ChecklistTemplate = {
    id: 'chk_demo_01',
    tenantId: 'default',
    companyId: 'default',
    name: 'Executive Onboarding Checklist',
    description: 'Custom checklist designed for leadership onboarding',
    category: 'Custom',
    applicableTo: 'all',
    isActive: true,
    version: 1,
    groups: mockGroups,
    tasks: mockTasks,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  };

  it('renders ChecklistTemplatesManagement in embedded mode without empty state or banner', () => {
    const html = renderToStaticMarkup(<ChecklistTemplatesManagement isEmbedded={true} />);

    // In embedded mode, the redundant header is suppressed
    expect(html).not.toContain('bezent-checklist-header-copy');

    // Section title and count badge are rendered
    expect(html).toContain('Checklist Templates');
    expect(html).toContain('Create Template');

    // Pre-seeded templates are immediately rendered (zero flash)
    expect(html).toContain('Standard Employee Onboarding Checklist');
    expect(html).toContain('Configure Tasks');
  });

  it('renders ChecklistTemplatesManagement in standalone mode with full header and actions', () => {
    const html = renderToStaticMarkup(<ChecklistTemplatesManagement isEmbedded={false} />);

    expect(html).toContain('bezent-checklist-header');
    expect(html).toContain('Create and assign onboarding task checklists');
    expect(html).toContain('Create Template');
  });

  it('renders CreateEditTemplateModal in Create Mode with details and tasks tabs', () => {
    const html = renderToStaticMarkup(
      <CreateEditTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        template={null}
        initialTab="details"
      />,
    );

    expect(html).toContain('Create Checklist Template');
    expect(html).toContain('Template Details');
    expect(html).toContain('Checklist Tasks');
    expect(html).toContain('Template Name');
    expect(html).toContain('Category');
    expect(html).toContain('Applicable To');
  });

  it('renders CreateEditTemplateModal in Edit Mode with existing template loaded', () => {
    const html = renderToStaticMarkup(
      <CreateEditTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        template={mockTemplate}
        initialTab="details"
      />,
    );

    expect(html).toContain('Edit Checklist Template');
    expect(html).toContain('Executive Onboarding Checklist');
    expect(html).toContain('Checklist Tasks (2)');
  });

  it('renders CreateEditTemplateModal with tasks tab showing grouped checklist tasks', () => {
    const html = renderToStaticMarkup(
      <CreateEditTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        template={mockTemplate}
        initialTab="tasks"
      />,
    );

    expect(html).toContain('Task Groups &amp; Items');
    expect(html).toContain('Add Group');
    expect(html).toContain('Pre-boarding &amp; Day 1');
    expect(html).toContain('Week 1 Compliance');
    expect(html).toContain('Verify Government ID and Tax Forms');
    expect(html).toContain('Complete Workplace Safety Module');
  });

  it('renders AddEditTaskModal with all required and advanced properties', () => {
    const html = renderToStaticMarkup(
      <AddEditTaskModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        task={null}
        groups={mockGroups}
        defaultGroupId="grp_1"
        allExistingTasks={mockTasks}
      />,
    );

    expect(html).toContain('Add Task');
    expect(html).toContain('Task Name');
    expect(html).toContain('Task Group');
    expect(html).toContain('Assigned To');
    expect(html).toContain('Due Date Offset');
    expect(html).toContain('Advanced Configuration');
  });

  it('renders AddEditTaskModal in Edit Mode with pre-populated task details', () => {
    const html = renderToStaticMarkup(
      <AddEditTaskModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        task={mockTasks[0]!}
        groups={mockGroups}
        defaultGroupId="grp_1"
        allExistingTasks={mockTasks}
      />,
    );

    expect(html).toContain('Edit Task');
    expect(html).toContain('Verify Government ID and Tax Forms');
    expect(html).toContain('Update Task');
  });
});
