import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import { formCustomizations, onboardingChecklistTemplates } from '../../../../../db/schema.js';
import type {
  ChecklistTemplate,
  ChecklistTaskGroup,
  ChecklistTaskItem,
} from '../types/checklist.types.js';

const CHECKLIST_TEMPLATES_FORM_KEY = 'onboarding_checklist_builder_templates';

export class ChecklistRepository {
  private get db() {
    return getDb();
  }

  /**
   * Generates clean enterprise default checklist templates for a new tenant/company
   */
  private createDefaultTemplates(tenantId: string, companyId: string): ChecklistTemplate[] {
    const now = new Date().toISOString();

    const hrGroups: ChecklistTaskGroup[] = [
      { id: `grp_hr_pre_${companyId}`, name: 'Pre-Joining Formalities', displayOrder: 1 },
      { id: `grp_hr_day1_${companyId}`, name: 'Day 1 & Induction', displayOrder: 2 },
    ];

    const hrTasks: ChecklistTaskItem[] = [
      {
        id: `tsk_hr_1_${companyId}`,
        name: 'Send Welcome Kit & First-Day Schedule',
        description:
          'Send greeting email with first day schedule, reporting manager, and dress code.',
        groupId: hrGroups[0]!.id,
        assignedTo: 'hr',
        isRequired: true,
        dueOffsetDays: -3,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 1,
      },
      {
        id: `tsk_hr_2_${companyId}`,
        name: 'Collect Emergency Contact & Personal Details',
        description: 'Ensure candidate emergency contacts and primary phone details are submitted.',
        groupId: hrGroups[0]!.id,
        assignedTo: 'employee',
        isRequired: true,
        dueOffsetDays: -1,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'employee_visible',
        displayOrder: 2,
      },
      {
        id: `tsk_hr_3_${companyId}`,
        name: 'Conduct HR Induction & Orientation Session',
        description:
          'Walkthrough of company values, policies, leaves, and attendance expectations.',
        groupId: hrGroups[1]!.id,
        assignedTo: 'hr',
        isRequired: true,
        dueOffsetDays: 0,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'internal',
        displayOrder: 3,
      },
      {
        id: `tsk_hr_4_${companyId}`,
        name: 'Sign Employee Handbook & Code of Conduct',
        description:
          'Obtain digital acknowledgment of company handbook and non-disclosure agreement.',
        groupId: hrGroups[1]!.id,
        assignedTo: 'employee',
        isRequired: true,
        dueOffsetDays: 1,
        attachmentRequirement: 'optional',
        approvalRequired: true,
        visibility: 'employee_visible',
        displayOrder: 4,
      },
    ];

    const itGroups: ChecklistTaskGroup[] = [
      { id: `grp_it_prov_${companyId}`, name: 'Asset Provisioning', displayOrder: 1 },
      { id: `grp_it_acc_${companyId}`, name: 'Accounts & Security Access', displayOrder: 2 },
    ];

    const itTasks: ChecklistTaskItem[] = [
      {
        id: `tsk_it_1_${companyId}`,
        name: 'Configure Laptop & Peripheral Hardware',
        description:
          'Set up company workstation with corporate image and endpoint protection software.',
        groupId: itGroups[0]!.id,
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: -2,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'internal',
        displayOrder: 1,
      },
      {
        id: `tsk_it_2_${companyId}`,
        name: 'Provision Corporate Email & Slack Accounts',
        description: 'Create Google Workspace / M365 and Slack collaboration accounts.',
        groupId: itGroups[1]!.id,
        assignedTo: 'it',
        isRequired: true,
        dueOffsetDays: -1,
        attachmentRequirement: 'none',
        approvalRequired: false,
        visibility: 'internal',
        displayOrder: 2,
      },
      {
        id: `tsk_it_3_${companyId}`,
        name: 'Set up Multi-Factor Authentication (MFA)',
        description: 'Guide new hire through corporate MFA setup and password manager onboarding.',
        groupId: itGroups[1]!.id,
        assignedTo: 'employee',
        isRequired: true,
        dueOffsetDays: 0,
        attachmentRequirement: 'none',
        approvalRequired: true,
        visibility: 'employee_visible',
        displayOrder: 3,
      },
    ];

    return [
      {
        id: `chk_tpl_hr_${companyId}`,
        tenantId,
        companyId,
        name: 'Standard HR Onboarding Checklist',
        description: 'Core human resources tasks covering pre-boarding verification and induction.',
        category: 'HR',
        applicableTo: 'all',
        isActive: true,
        version: 1,
        groups: hrGroups,
        tasks: hrTasks,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `chk_tpl_it_${companyId}`,
        tenantId,
        companyId,
        name: 'IT Hardware & Access Checklist',
        description:
          'Technical provisioning tasks for equipment allocation, security, and credentials.',
        category: 'IT',
        applicableTo: 'all',
        isActive: true,
        version: 1,
        groups: itGroups,
        tasks: itTasks,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * Retrieves all checklist templates for a tenant & company
   */
  async getTemplates(tenantId: string, companyId: string): Promise<ChecklistTemplate[]> {
    const existing = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, CHECKLIST_TEMPLATES_FORM_KEY),
        ),
      )
      .limit(1);

    const row = existing[0];
    if (!row || !row.metadata) {
      return this.createDefaultTemplates(tenantId, companyId);
    }

    const metadata = row.metadata as { templates?: ChecklistTemplate[] };
    if (
      !metadata.templates ||
      !Array.isArray(metadata.templates) ||
      metadata.templates.length === 0
    ) {
      return this.createDefaultTemplates(tenantId, companyId);
    }

    return metadata.templates;
  }

  /**
   * Retrieves a single template by ID
   */
  async getTemplateById(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<ChecklistTemplate | null> {
    const templates = await this.getTemplates(tenantId, companyId);
    return templates.find((t) => t.id === templateId) ?? null;
  }

  /**
   * Saves the entire collection of templates in formCustomizations and synchronizes tasks
   */
  async saveAllTemplates(
    tenantId: string,
    companyId: string,
    templates: ChecklistTemplate[],
  ): Promise<ChecklistTemplate[]> {
    const existing = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, CHECKLIST_TEMPLATES_FORM_KEY),
        ),
      );

    const row = existing[0];

    if (row) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: { templates },
          version: row.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, row.id));
    } else {
      await this.db.insert(formCustomizations).values({
        id: randomUUID(),
        tenantId,
        companyId,
        formKey: CHECKLIST_TEMPLATES_FORM_KEY,
        metadata: { templates },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Synchronize default tasks with legacy onboardingChecklistTemplates for backward compatibility
    await this.syncLegacyChecklistTasks(tenantId, companyId, templates);

    return templates;
  }

  /**
   * Synchronizes active tasks into onboarding_checklist_templates table
   */
  private async syncLegacyChecklistTasks(
    tenantId: string,
    companyId: string,
    templates: ChecklistTemplate[],
  ): Promise<void> {
    try {
      const activeTemplates = templates.filter((t) => t.isActive);
      const allTasks: ChecklistTaskItem[] = [];
      activeTemplates.forEach((t) => {
        allTasks.push(...t.tasks);
      });

      if (allTasks.length === 0) return;

      // Delete existing tasks for this company
      await this.db
        .delete(onboardingChecklistTemplates)
        .where(
          and(
            eq(onboardingChecklistTemplates.tenantId, tenantId),
            eq(onboardingChecklistTemplates.companyId, companyId),
          ),
        );

      // Insert synchronized tasks
      const records = allTasks.map((task, idx) => ({
        id: task.id.length <= 64 ? task.id : randomUUID(),
        tenantId,
        companyId,
        name: task.name.slice(0, 150),
        description: task.description?.slice(0, 255) ?? null,
        stageKey: 'preboarding',
        assigneeType: task.assignedTo,
        dueOffsetDays: task.dueOffsetDays,
        isRequired: task.isRequired,
        displayOrder: idx + 1,
        isActive: true,
      }));

      for (const rec of records) {
        await this.db.insert(onboardingChecklistTemplates).values(rec);
      }
    } catch {
      // Non-fatal sync error; formCustomizations remains the authoritative rich store
    }
  }
}
