import { randomUUID } from 'node:crypto';
import { AppError, BadRequestError, NotFoundError } from '../../../../../app/errors/AppError.js';
import { ChecklistRepository } from '../repository/checklist.repository.js';
import type {
  ChecklistTemplate,
  ChecklistTaskGroup,
  ChecklistTaskItem,
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  SaveChecklistTasksDto,
  CandidateChecklistTaskInstance,
} from '../types/checklist.types.js';

export class ChecklistService {
  constructor(private readonly repository = new ChecklistRepository()) {}

  async listTemplates(tenantId: string, companyId: string): Promise<ChecklistTemplate[]> {
    return this.repository.getTemplates(tenantId, companyId);
  }

  async getTemplateById(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<ChecklistTemplate> {
    const template = await this.repository.getTemplateById(tenantId, companyId, templateId);
    if (!template) {
      throw new NotFoundError(`Checklist template '${templateId}' not found`);
    }
    return template;
  }

  async createTemplate(
    tenantId: string,
    companyId: string,
    dto: CreateChecklistTemplateDto,
  ): Promise<ChecklistTemplate> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestError('Template name is required', 'TEMPLATE_NAME_REQUIRED');
    }

    const existingTemplates = await this.repository.getTemplates(tenantId, companyId);
    const duplicate = existingTemplates.find(
      (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      throw new AppError(
        `A checklist template named '${trimmedName}' already exists`,
        409,
        'DUPLICATE_TEMPLATE_NAME',
      );
    }

    const now = new Date().toISOString();
    const templateId = `chk_tpl_${randomUUID()}`;

    // Ensure at least one default task group exists
    let groups: ChecklistTaskGroup[] = dto.groups ?? [];
    if (groups.length === 0) {
      groups = [{ id: `grp_${randomUUID()}`, name: 'General Formalities', displayOrder: 1 }];
    }

    const primaryGroupId = groups[0]!.id;

    // Normalize tasks
    const tasks: ChecklistTaskItem[] = (dto.tasks ?? []).map((t, idx) => ({
      id: t.id || `tsk_${randomUUID()}`,
      name: t.name.trim(),
      description: t.description?.trim() ?? null,
      groupId: t.groupId || primaryGroupId,
      assignedTo: t.assignedTo || 'hr',
      specificRoleName: t.specificRoleName?.trim() ?? null,
      isRequired: t.isRequired ?? true,
      dueOffsetDays: typeof t.dueOffsetDays === 'number' ? t.dueOffsetDays : 0,
      attachmentRequirement: t.attachmentRequirement || 'none',
      approvalRequired: Boolean(t.approvalRequired),
      dependencyTaskId: t.dependencyTaskId ?? null,
      visibility: t.visibility || 'employee_visible',
      displayOrder: idx + 1,
    }));

    const newTemplate: ChecklistTemplate = {
      id: templateId,
      tenantId,
      companyId,
      name: trimmedName,
      description: dto.description?.trim() ?? null,
      category: dto.category || 'General',
      applicableTo: dto.applicableTo || 'all',
      applicableValue: dto.applicableValue?.trim() ?? null,
      pipelineIds: dto.pipelineIds ?? [],
      stageKeys: dto.stageKeys ?? [],
      isActive: dto.isActive ?? true,
      version: 1,
      groups,
      tasks,
      createdAt: now,
      updatedAt: now,
    };

    const nextTemplates = [...existingTemplates, newTemplate];
    await this.repository.saveAllTemplates(tenantId, companyId, nextTemplates);

    return newTemplate;
  }

  async updateTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
    dto: UpdateChecklistTemplateDto,
  ): Promise<ChecklistTemplate> {
    const templates = await this.repository.getTemplates(tenantId, companyId);
    const existingIndex = templates.findIndex((t) => t.id === templateId);
    if (existingIndex === -1) {
      throw new NotFoundError(`Checklist template '${templateId}' not found`);
    }

    const existing = templates[existingIndex]!;

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestError('Template name cannot be empty', 'TEMPLATE_NAME_REQUIRED');
      }
      const duplicate = templates.find(
        (t) => t.id !== templateId && t.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) {
        throw new AppError(
          `A checklist template named '${trimmed}' already exists`,
          409,
          'DUPLICATE_TEMPLATE_NAME',
        );
      }
      existing.name = trimmed;
    }

    if (dto.description !== undefined) {
      existing.description = dto.description?.trim() ?? null;
    }
    if (dto.category !== undefined) {
      existing.category = dto.category;
    }
    if (dto.applicableTo !== undefined) {
      existing.applicableTo = dto.applicableTo;
    }
    if (dto.applicableValue !== undefined) {
      existing.applicableValue = dto.applicableValue?.trim() ?? null;
    }
    if (dto.pipelineIds !== undefined) {
      existing.pipelineIds = dto.pipelineIds;
    }
    if (dto.stageKeys !== undefined) {
      existing.stageKeys = dto.stageKeys;
    }
    if (dto.isActive !== undefined) {
      existing.isActive = dto.isActive;
    }

    existing.version += 1;
    existing.updatedAt = new Date().toISOString();

    templates[existingIndex] = existing;
    await this.repository.saveAllTemplates(tenantId, companyId, templates);

    return existing;
  }

  async saveTasks(
    tenantId: string,
    companyId: string,
    templateId: string,
    dto: SaveChecklistTasksDto,
  ): Promise<ChecklistTemplate> {
    const templates = await this.repository.getTemplates(tenantId, companyId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) {
      throw new NotFoundError(`Checklist template '${templateId}' not found`);
    }

    // Ensure at least one group exists
    let groups: ChecklistTaskGroup[] = dto.groups ?? [];
    if (groups.length === 0) {
      groups = [{ id: `grp_${randomUUID()}`, name: 'General Formalities', displayOrder: 1 }];
    }

    // Normalize group display orders
    groups = groups.map((g, idx) => ({
      id: g.id || `grp_${randomUUID()}`,
      name: g.name.trim() || 'Untitled Group',
      displayOrder: idx + 1,
    }));

    const validGroupIds = new Set(groups.map((g) => g.id));
    const fallbackGroupId = groups[0]!.id;

    // Normalize and validate tasks
    const tasks: ChecklistTaskItem[] = (dto.tasks ?? []).map((t, idx) => {
      const trimmedTaskName = t.name?.trim();
      if (!trimmedTaskName) {
        throw new BadRequestError('Task name is required', 'TASK_NAME_REQUIRED');
      }

      return {
        id: t.id || `tsk_${randomUUID()}`,
        name: trimmedTaskName,
        description: t.description?.trim() ?? null,
        groupId: validGroupIds.has(t.groupId) ? t.groupId : fallbackGroupId,
        assignedTo: t.assignedTo || 'hr',
        specificRoleName: t.specificRoleName?.trim() ?? null,
        isRequired: t.isRequired ?? true,
        dueOffsetDays: typeof t.dueOffsetDays === 'number' ? t.dueOffsetDays : 0,
        attachmentRequirement: t.attachmentRequirement || 'none',
        approvalRequired: Boolean(t.approvalRequired),
        dependencyTaskId: t.dependencyTaskId ?? null,
        visibility: t.visibility || 'employee_visible',
        displayOrder: idx + 1,
      };
    });

    target.groups = groups;
    target.tasks = tasks;
    target.version += 1;
    target.updatedAt = new Date().toISOString();

    await this.repository.saveAllTemplates(tenantId, companyId, templates);

    return target;
  }

  async duplicateTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<ChecklistTemplate> {
    const templates = await this.repository.getTemplates(tenantId, companyId);
    const source = templates.find((t) => t.id === templateId);
    if (!source) {
      throw new NotFoundError(`Source checklist template '${templateId}' not found`);
    }

    // Determine unique duplicate name
    let copyIndex = 1;
    let newName = `${source.name} (Copy)`;
    while (templates.some((t) => t.name.toLowerCase() === newName.toLowerCase())) {
      copyIndex += 1;
      newName = `${source.name} (Copy ${copyIndex})`;
    }

    const now = new Date().toISOString();
    const newTemplateId = `chk_tpl_${randomUUID()}`;

    // Map old group IDs to new group IDs
    const groupIdMap = new Map<string, string>();
    const clonedGroups: ChecklistTaskGroup[] = source.groups.map((g) => {
      const newGid = `grp_${randomUUID()}`;
      groupIdMap.set(g.id, newGid);
      return { ...g, id: newGid };
    });

    // Map old task IDs to new task IDs for dependencies
    const taskIdMap = new Map<string, string>();
    source.tasks.forEach((t) => {
      taskIdMap.set(t.id, `tsk_${randomUUID()}`);
    });

    const fallbackGroupId = clonedGroups[0]?.id || `grp_${randomUUID()}`;

    const clonedTasks: ChecklistTaskItem[] = source.tasks.map((t) => ({
      ...t,
      id: taskIdMap.get(t.id) || `tsk_${randomUUID()}`,
      groupId: groupIdMap.get(t.groupId) || fallbackGroupId,
      dependencyTaskId: t.dependencyTaskId ? taskIdMap.get(t.dependencyTaskId) ?? null : null,
    }));

    const duplicate: ChecklistTemplate = {
      ...source,
      id: newTemplateId,
      name: newName,
      version: 1,
      groups: clonedGroups,
      tasks: clonedTasks,
      createdAt: now,
      updatedAt: now,
    };

    const nextTemplates = [...templates, duplicate];
    await this.repository.saveAllTemplates(tenantId, companyId, nextTemplates);

    return duplicate;
  }

  async deleteTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<void> {
    const templates = await this.repository.getTemplates(tenantId, companyId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) {
      throw new NotFoundError(`Checklist template '${templateId}' not found`);
    }

    // Prevent deleting if it's the last remaining template
    if (templates.length <= 1) {
      throw new AppError(
        'Cannot delete the only available checklist template. A minimum of one template must be retained.',
        400,
        'CANNOT_DELETE_LAST_TEMPLATE',
      );
    }

    const nextTemplates = templates.filter((t) => t.id !== templateId);
    await this.repository.saveAllTemplates(tenantId, companyId, nextTemplates);
  }

  /**
   * Generates a candidate-specific checklist snapshot when entering a stage
   */
  async generateCandidateChecklist(
    tenantId: string,
    companyId: string,
    caseId: string,
    joiningDateStr: string,
    templateId?: string,
  ): Promise<CandidateChecklistTaskInstance[]> {
    const templates = await this.repository.getTemplates(tenantId, companyId);
    let selectedTemplate: ChecklistTemplate | undefined;

    if (templateId) {
      selectedTemplate = templates.find((t) => t.id === templateId && t.isActive);
    }

    if (!selectedTemplate) {
      selectedTemplate = templates.find((t) => t.isActive) ?? templates[0];
    }

    if (!selectedTemplate) {
      return [];
    }

    const joiningDate = new Date(joiningDateStr);
    const isValidDate = !Number.isNaN(joiningDate.getTime());

    const groupMap = new Map<string, string>();
    selectedTemplate.groups.forEach((g) => groupMap.set(g.id, g.name));

    return selectedTemplate.tasks.map((task) => {
      let dueDateStr = new Date().toISOString().split('T')[0] ?? '';

      if (isValidDate) {
        const d = new Date(joiningDate);
        d.setDate(d.getDate() + task.dueOffsetDays);
        dueDateStr = d.toISOString().split('T')[0] ?? '';
      }

      return {
        id: `cct_${randomUUID()}`,
        caseId,
        templateId: selectedTemplate!.id,
        templateVersion: selectedTemplate!.version,
        taskId: task.id,
        taskName: task.name,
        groupName: groupMap.get(task.groupId) || 'General Formalities',
        assignedTo: task.assignedTo,
        specificRoleName: task.specificRoleName,
        assignedUserId: null,
        status: 'pending',
        dueDate: dueDateStr,
        approvalRequired: task.approvalRequired,
        attachmentRequirement: task.attachmentRequirement,
      };
    });
  }
}
