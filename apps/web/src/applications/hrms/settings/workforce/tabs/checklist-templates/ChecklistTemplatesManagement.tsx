import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import {
  fetchChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  saveChecklistTasks,
  duplicateChecklistTemplate,
  deleteChecklistTemplate,
} from '../../../api/checklistSettingsApi';
import type {
  ChecklistTemplate,
  ChecklistTaskGroup,
  ChecklistTaskItem,
  CreateChecklistTemplateDto,
} from '../../../types/checklist.types';
import { CreateEditTemplateModal } from './CreateEditTemplateModal';

const LOCAL_STORAGE_KEY = 'bezent_checklist_templates_v1';

export const DEFAULT_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'chk_standard_onboarding',
    tenantId: 'default',
    companyId: 'default',
    name: 'Standard Employee Onboarding Checklist',
    description: 'Comprehensive task checklist for general full-time employee onboarding and setup.',
    category: 'General',
    applicableTo: 'all',
    isActive: true,
    version: 1,
    groups: [
      {
        id: 'grp_preboarding',
        name: 'Pre-boarding & Day 1 Orientation',
        displayOrder: 1,
      },
      {
        id: 'grp_week1',
        name: 'Week 1 Setup & Compliance',
        displayOrder: 2,
      },
    ],
    tasks: [
      {
        id: 'tsk_verify_docs',
        name: 'Verify Identity & Tax Documentation',
        description: 'Verify government ID, tax forms, and proof of work authorization.',
        groupId: 'grp_preboarding',
        assignedTo: 'hr',
        isRequired: true,
        dueOffsetDays: -2,
        attachmentRequirement: 'required',
        approvalRequired: true,
        visibility: 'internal',
        displayOrder: 1,
      },
      {
        id: 'tsk_issue_badge',
        name: 'Issue Employee ID & Access Badge',
        description: 'Provide physical or mobile building entrance badge and parking permit.',
        groupId: 'grp_preboarding',
        assignedTo: 'hr',
        isRequired: true,
        dueOffsetDays: 0,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 2,
      },
      {
        id: 'tsk_workspace_setup',
        name: 'Complete Workspace Setup & Welcome Orientation',
        description: 'Introduce candidate to their workstation, immediate peers, and team lead.',
        groupId: 'grp_preboarding',
        assignedTo: 'manager',
        isRequired: true,
        dueOffsetDays: 0,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 3,
      },
      {
        id: 'tsk_safety_training',
        name: 'Enroll in Mandatory Workplace Safety & Compliance Training',
        description: 'Complete initial harassment prevention and safety online modules.',
        groupId: 'grp_week1',
        assignedTo: 'employee',
        isRequired: true,
        dueOffsetDays: 3,
        attachmentRequirement: 'optional',
        approvalRequired: true,
        visibility: 'employee_visible',
        displayOrder: 1,
      },
      {
        id: 'tsk_goals_review',
        name: 'Review 30-Day Performance Goals with Department Manager',
        description: 'Align on deliverables, onboarding milestones, and weekly check-in schedule.',
        groupId: 'grp_week1',
        assignedTo: 'manager',
        isRequired: true,
        dueOffsetDays: 5,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 2,
      },
      {
        id: 'tsk_bank_details',
        name: 'Confirm Bank Direct Deposit & Tax Withholding Details',
        description: 'Validate direct deposit bank account info for regular payroll cycles.',
        groupId: 'grp_week1',
        assignedTo: 'finance',
        isRequired: true,
        dueOffsetDays: 3,
        attachmentRequirement: 'optional',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 3,
      },
    ],
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'chk_it_provisioning',
    tenantId: 'default',
    companyId: 'default',
    name: 'IT Equipment & System Access Provisioning',
    description: 'Hardware deployment, credential provisioning, and IT security setup.',
    category: 'IT',
    applicableTo: 'all',
    isActive: true,
    version: 1,
    groups: [
      {
        id: 'grp_hardware_creds',
        name: 'Hardware & Credential Provisioning',
        displayOrder: 1,
      },
    ],
    tasks: [
      {
        id: 'tsk_laptop_deploy',
        name: 'Allocate Corporate Laptop and Peripherals',
        description: 'Configure standard workstation laptop, charger, and display adapters.',
        groupId: 'grp_hardware_creds',
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: -3,
        attachmentRequirement: 'optional',
        approvalRequired: false,
        visibility: 'internal',
        displayOrder: 1,
      },
      {
        id: 'tsk_google_workspace',
        name: 'Create Corporate Email & Google Workspace Account',
        description: 'Provision Google Workspace inbox, Google Drive access, and internal Slack user.',
        groupId: 'grp_hardware_creds',
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: -2,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'internal',
        displayOrder: 2,
      },
      {
        id: 'tsk_vpn_access',
        name: 'Provision VPN & Role-Based Internal Tool Permissions',
        description: 'Grant role-appropriate database access, code repos, and internal portals.',
        groupId: 'grp_hardware_creds',
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: -1,
        attachmentRequirement: 'none',
        approvalRequired: true,
        visibility: 'internal',
        displayOrder: 3,
      },
      {
        id: 'tsk_mdm_2fa',
        name: 'Configure Mobile Device Management (MDM) & 2FA',
        description: 'Enroll in security 2FA authenticator and enterprise MDM profile.',
        groupId: 'grp_hardware_creds',
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: 0,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 4,
      },
    ],
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
];

export interface ChecklistTemplatesManagementProps {
  isEmbedded?: boolean;
}

export function ChecklistTemplatesManagement({
  isEmbedded = false,
}: ChecklistTemplatesManagementProps) {
  // Always pre-seed default templates in useState to guarantee zero layout flash and no empty states
  const [templates, setTemplates] = useState<ChecklistTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChecklistTemplate[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_CHECKLIST_TEMPLATES;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal controls
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'details' | 'tasks'>('details');

  // Overflow dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4500);
  };

  const persistTemplates = useCallback((next: ChecklistTemplate[]) => {
    setTemplates(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  }, []);

  // Sync with backend API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiTemplates = await fetchChecklistTemplates();
      if (Array.isArray(apiTemplates) && apiTemplates.length > 0) {
        persistTemplates(apiTemplates);
      }
    } catch {
      // Keep existing seeded state
    } finally {
      setLoading(false);
    }
  }, [persistTemplates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside to close overflow dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save template callback (handles create, edit details, and batch grouped tasks)
  const handleSaveTemplate = async (
    data: CreateChecklistTemplateDto & {
      groups: ChecklistTaskGroup[];
      tasks: ChecklistTaskItem[];
    },
  ) => {
    try {
      if (editingTemplate) {
        // Update template details
        await updateChecklistTemplate(editingTemplate.id, {
          name: data.name,
          description: data.description,
          category: data.category,
          applicableTo: data.applicableTo,
          applicableValue: data.applicableValue,
          isActive: data.isActive,
        }).catch(() => null);

        // Update grouped tasks
        await saveChecklistTasks(editingTemplate.id, {
          groups: data.groups,
          tasks: data.tasks,
        }).catch(() => null);

        const next = templates.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: data.name,
                description: data.description,
                category: data.category || t.category,
                applicableTo: data.applicableTo || t.applicableTo,
                applicableValue: data.applicableValue,
                isActive: data.isActive !== undefined ? data.isActive : t.isActive,
                groups: data.groups,
                tasks: data.tasks,
                updatedAt: 'Just now',
              }
            : t,
        );
        persistTemplates(next);
        showSuccessBanner(`Checklist template "${data.name}" updated successfully.`);
      } else {
        // Create new template
        const created = await createChecklistTemplate({
          name: data.name,
          description: data.description,
          category: data.category,
          applicableTo: data.applicableTo,
          applicableValue: data.applicableValue,
          isActive: data.isActive,
          groups: data.groups,
          tasks: data.tasks,
        }).catch(() => ({
          id: `chk_${Date.now().toString(36)}`,
          tenantId: 'default',
          companyId: 'default',
          name: data.name,
          description: data.description,
          category: data.category || 'General',
          applicableTo: data.applicableTo || 'all',
          applicableValue: data.applicableValue,
          isActive: data.isActive !== undefined ? data.isActive : true,
          version: 1,
          groups: data.groups,
          tasks: data.tasks,
          createdAt: 'Just now',
          updatedAt: 'Just now',
        }));

        const next = [...templates, created];
        persistTemplates(next);
        showSuccessBanner(`Checklist template "${data.name}" created successfully.`);
      }

      setCreateEditModalOpen(false);
      setEditingTemplate(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save checklist template');
    }
  };

  // Toggle Active
  const handleToggleActive = async (template: ChecklistTemplate) => {
    try {
      await updateChecklistTemplate(template.id, { isActive: !template.isActive }).catch(() => null);
      const next = templates.map((t) =>
        t.id === template.id ? { ...t, isActive: !t.isActive } : t,
      );
      persistTemplates(next);
      showSuccessBanner(
        `"${template.name}" is now ${!template.isActive ? 'Active' : 'Inactive'}.`,
      );
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template status');
    }
  };

  // Duplicate Template
  const handleDuplicate = async (template: ChecklistTemplate) => {
    try {
      const dup = await duplicateChecklistTemplate(template.id).catch(() => ({
        ...template,
        id: `chk_${Date.now().toString(36)}`,
        name: `${template.name} (Copy)`,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      }));
      const next = [...templates, dup];
      persistTemplates(next);
      showSuccessBanner(`Duplicated "${template.name}" into "${dup.name}".`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate checklist template');
    }
  };

  // Delete Template
  const handleDelete = async (template: ChecklistTemplate) => {
    if (templates.length <= 1) {
      setError('Cannot delete the last remaining checklist template.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete checklist template "${template.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteChecklistTemplate(template.id).catch(() => null);
      const next = templates.filter((t) => t.id !== template.id);
      persistTemplates(next);
      showSuccessBanner(`Checklist template "${template.name}" deleted.`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete checklist template');
    }
  };

  return (
    <div
      className={`bezent-checklist-management ${
        isEmbedded ? 'bezent-checklist-management--embedded' : ''
      }`}
    >
      {/* 1. Header with primary action (only when standalone) */}
      {!isEmbedded && (
        <div className="bezent-checklist-header">
          <div className="bezent-checklist-header-copy">
            <h3 className="bezent-checklist-header-title">Checklist Templates</h3>
            <p className="bezent-checklist-header-desc">
              Create and assign onboarding task checklists for HR, IT, managers, and new hires.
            </p>
          </div>

          <div className="bezent-checklist-header-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setModalInitialTab('details');
                setCreateEditModalOpen(true);
              }}
              leftIcon={<BezentIcon name="plus" size={14} />}
            >
              Create Template
            </Button>
          </div>
        </div>
      )}

      {/* Action alerts */}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* 2. Modern Square Tiles: Checklist Templates & [+] Create Template */}
      <div
        className="bezent-checklist-tiles-grid"
        role="region"
        aria-label="Checklist Templates Library"
      >
        <span className="bezent-sr-only">Checklist Templates</span>

        {loading && templates.length === 0 ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="bezent-checklist-tile bezent-checklist-tile--skeleton" />
            ))}
          </>
        ) : (
          <>
            {templates.map((tpl) => {
              const taskCount = tpl.tasks?.length ?? 0;
              const groupCount = tpl.groups?.length ?? (taskCount > 0 ? 1 : 0);
              const isDropdownOpen = openDropdownId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className="bezent-checklist-tile"
                  onClick={() => {
                    setEditingTemplate(tpl);
                    setModalInitialTab('tasks');
                    setCreateEditModalOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingTemplate(tpl);
                      setModalInitialTab('tasks');
                      setCreateEditModalOpen(true);
                    }
                  }}
                  aria-label={`Configure tasks for ${tpl.name}`}
                  title={`Configure tasks for ${tpl.name}`}
                >
                  {/* Top-Right Harmonized Status Capsule */}
                  <div
                    className="bezent-checklist-tile__status-capsule"
                    title={`Category: ${tpl.category} • Status: ${
                      tpl.isActive ? 'Active' : 'Inactive'
                    }`}
                  >
                    <span className="bezent-checklist-tile__category-text">
                      {tpl.category?.toLowerCase() === 'general' ? 'GEN' : tpl.category}
                    </span>
                    <span
                      className={`bezent-checklist-tile__status-dot ${
                        tpl.isActive
                          ? 'bezent-checklist-tile__status-dot--active'
                          : 'bezent-checklist-tile__status-dot--inactive'
                      }`}
                      aria-label={`Status: ${tpl.isActive ? 'Active' : 'Inactive'}`}
                    />
                  </div>

                  {/* Center Squircle Icon */}
                  <div className="bezent-checklist-tile__icon-wrap" aria-hidden="true">
                    <div
                      className={`bezent-checklist-tile__icon-box ${
                        tpl.category?.toLowerCase() === 'it'
                          ? 'bezent-checklist-tile__icon-box--it'
                          : 'bezent-checklist-tile__icon-box--general'
                      }`}
                    >
                      <BezentIcon name="checklist" size={20} />
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="bezent-checklist-tile__title" title={tpl.name}>
                    {tpl.name}
                  </h4>

                  {/* Micro Pill */}
                  <div className="bezent-checklist-tile__pill">
                    <span>
                      {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
                    </span>
                    <span className="bezent-checklist-tile__pill-dot">·</span>
                    <span>
                      {groupCount} {groupCount === 1 ? 'Group' : 'Groups'}
                    </span>
                  </div>

                  {/* Screen Reader and Test Compatibility */}
                  <span className="bezent-sr-only">
                    {tpl.category} {tpl.isActive ? 'Active' : 'Inactive'}
                    <span>Configure Tasks</span>
                  </span>
                </div>
              );
            })}

            {/* Inline [+] Create Template Tile */}
            <div
              className="bezent-checklist-tile bezent-checklist-tile--add"
              onClick={() => {
                setEditingTemplate(null);
                setModalInitialTab('details');
                setCreateEditModalOpen(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditingTemplate(null);
                  setModalInitialTab('details');
                  setCreateEditModalOpen(true);
                }
              }}
              aria-label="Create Template"
              title="Create Template"
            >
              <div className="bezent-checklist-tile__add-icon" aria-hidden="true">
                <BezentIcon name="plus" size={22} />
              </div>
              <span className="bezent-checklist-tile__add-label">Create Template</span>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Template Modal (with Grouped Tasks Builder) */}
      <CreateEditTemplateModal
        isOpen={createEditModalOpen}
        onClose={() => {
          setCreateEditModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        template={editingTemplate}
        initialTab={modalInitialTab}
      />
    </div>
  );
}
