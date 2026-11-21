export type ChecklistCategory = 'General' | 'HR' | 'IT' | 'Finance' | 'Custom';

export type TaskAssigneeRole =
  | 'hr'
  | 'it'
  | 'finance'
  | 'manager'
  | 'employee'
  | 'specific_role';

export type AttachmentRequirement = 'none' | 'optional' | 'required';

export type TaskVisibility = 'internal' | 'employee_visible';

export type ChecklistApplicableTo =
  | 'all'
  | 'employment_type'
  | 'department'
  | 'location';

export interface ChecklistTaskGroup {
  id: string;
  name: string;
  displayOrder: number;
}

export interface ChecklistTaskItem {
  id: string;
  name: string;
  description?: string | null;
  groupId: string;
  assignedTo: TaskAssigneeRole;
  specificRoleName?: string | null;
  isRequired: boolean;
  dueOffsetDays: number;
  attachmentRequirement: AttachmentRequirement;
  approvalRequired: boolean;
  dependencyTaskId?: string | null;
  visibility: TaskVisibility;
  displayOrder: number;
}

export interface ChecklistTemplate {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description?: string | null;
  category: ChecklistCategory;
  applicableTo: ChecklistApplicableTo;
  applicableValue?: string | null;
  pipelineIds?: string[];
  stageKeys?: string[];
  isActive: boolean;
  version: number;
  groups: ChecklistTaskGroup[];
  tasks: ChecklistTaskItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChecklistTemplateDto {
  name: string;
  description?: string | null;
  category?: ChecklistCategory;
  applicableTo?: ChecklistApplicableTo;
  applicableValue?: string | null;
  pipelineIds?: string[];
  stageKeys?: string[];
  isActive?: boolean;
  groups?: ChecklistTaskGroup[];
  tasks?: ChecklistTaskItem[];
}

export interface UpdateChecklistTemplateDto {
  name?: string;
  description?: string | null;
  category?: ChecklistCategory;
  applicableTo?: ChecklistApplicableTo;
  applicableValue?: string | null;
  pipelineIds?: string[];
  stageKeys?: string[];
  isActive?: boolean;
}

export interface SaveChecklistTasksDto {
  groups: ChecklistTaskGroup[];
  tasks: ChecklistTaskItem[];
}

export interface CandidateChecklistTaskInstance {
  id: string;
  caseId: string;
  templateId: string;
  templateVersion: number;
  taskId: string;
  taskName: string;
  groupName: string;
  assignedTo: TaskAssigneeRole;
  specificRoleName?: string | null;
  assignedUserId?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  dueDate: string;
  completedAt?: string | null;
  completedByUserId?: string | null;
  approvalRequired: boolean;
  isApproved?: boolean | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  attachmentRequirement: AttachmentRequirement;
  attachmentFileUrl?: string | null;
  notes?: string | null;
}
