import {
  LeaveApprovalsRepository,
  leaveApprovalsRepository,
  type ApprovalQueueItem,
} from '../repository/leaveApprovals.repository.js';
import {
  LeaveRepository,
  leaveRepository,
  type ApprovalStepInput,
  type DecisionOutcome,
  type LeaveEmployeeProfile,
  type LeaveNotification,
} from '../repository/leave.repository.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  assertEnum,
  isDuplicateKeyError,
  isHalfDayMultiple,
  parseOptionalInteger,
  parseOptionalNumber,
} from '../rules/leaveValidation.js';
import { addHours, planApprovalSteps, type ResolvedApprover } from '../rules/leaveApproval.js';
import type {
  EmployeeLeaveRequest,
  LeaveApprovalLevel,
  LeaveApprovalWorkflowRecord,
} from '../../../../db/schema.js';

const APPROVER_TYPES = [
  'reporting_manager',
  'department_head',
  'hr_role',
  'specific_employee',
] as const;
const SLA_ACTIONS = ['escalate_to_next', 'notify_only', 'auto_approve'] as const;
export const STANDARD_WORKFLOW_NAME = 'Standard Approval';

export interface WorkflowDto {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  levels: LeaveApprovalLevel[];
  autoApproveUpToDays?: number | null;
  skipIfApproverIsApplicant?: boolean;
  fallbackApproverRoleId?: string | null;
  cancellationRequiresApproval?: boolean;
  allowSelfApprovalForHr?: boolean;
}

export interface WorkflowView extends Omit<LeaveApprovalWorkflowRecord, 'autoApproveUpToDays'> {
  autoApproveUpToDays: number | null;
  leaveTypeCount: number;
}

/** Who is acting on the queue: their employee record, roles, and whether they hold HR override. */
export interface ApprovalActor {
  userId: string;
  employeeId: string | null;
  roleIds: string[];
  isHrOverride: boolean;
}

export class LeaveApprovalsService {
  constructor(
    private readonly repo: LeaveApprovalsRepository = leaveApprovalsRepository,
    private readonly leaveRepo: Pick<
      LeaveRepository,
      'decide' | 'escalate' | 'markSlaBreached' | 'findRequest'
    > = leaveRepository,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  // ── Workflow management (Tab 7) ────────────────────────────────────────────

  async listWorkflows(tenantId: string, companyId: string): Promise<WorkflowView[]> {
    await this.ensureDefaultWorkflow(tenantId, companyId);
    const rows = await this.repo.listWorkflows(tenantId, companyId);
    return Promise.all(rows.map((w) => this.toView(w)));
  }

  async getWorkflow(tenantId: string, companyId: string, id: string): Promise<WorkflowView> {
    return this.toView(await this.requireWorkflow(tenantId, companyId, id));
  }

  async createWorkflow(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: WorkflowDto,
  ): Promise<WorkflowView> {
    const fields = await this.validate(tenantId, companyId, dto, null);
    const id = generateSurrogateId('lvwf');
    await this.withDuplicateGuard(() =>
      this.repo.saveWorkflow(
        { id, tenantId, companyId, createdByUserId: userId, ...fields },
        'create',
      ),
    );
    await this.logAudit(userId, 'leave_workflow_created', tenantId, companyId, id, {
      name: fields.name,
    });
    return this.getWorkflow(tenantId, companyId, id);
  }

  async updateWorkflow(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    dto: Partial<WorkflowDto>,
  ): Promise<WorkflowView> {
    const existing = await this.requireWorkflow(tenantId, companyId, id);
    const merged: WorkflowDto = {
      name: existing.name,
      description: existing.description,
      isDefault: existing.isDefault,
      isActive: existing.isActive,
      levels: existing.levels,
      autoApproveUpToDays:
        existing.autoApproveUpToDays === null ? null : Number(existing.autoApproveUpToDays),
      skipIfApproverIsApplicant: existing.skipIfApproverIsApplicant,
      fallbackApproverRoleId: existing.fallbackApproverRoleId,
      cancellationRequiresApproval: existing.cancellationRequiresApproval,
      allowSelfApprovalForHr: existing.allowSelfApprovalForHr,
      ...dto,
    };
    const fields = await this.validate(tenantId, companyId, merged, existing);
    await this.withDuplicateGuard(() =>
      this.repo.saveWorkflow(
        { id, tenantId, companyId, createdByUserId: existing.createdByUserId, ...fields },
        'update',
      ),
    );
    await this.logAudit(userId, 'leave_workflow_updated', tenantId, companyId, id, {
      fieldsUpdated: Object.keys(dto ?? {}),
    });
    return this.getWorkflow(tenantId, companyId, id);
  }

  /** Every company has exactly one default workflow: a single reporting-manager level. */
  async ensureDefaultWorkflow(
    tenantId: string,
    companyId: string,
  ): Promise<LeaveApprovalWorkflowRecord> {
    const existing = await this.repo.findDefaultWorkflow(tenantId, companyId);
    if (existing) return existing;
    try {
      await this.repo.saveWorkflow(
        {
          id: generateSurrogateId('lvwf'),
          tenantId,
          companyId,
          name: STANDARD_WORKFLOW_NAME,
          description: 'Default single-level approval by the reporting manager.',
          isDefault: true,
          isActive: true,
          levels: [
            {
              approverType: 'reporting_manager',
              approverRef: null,
              slaHours: 48,
              onSlaBreach: 'notify_only',
            },
          ],
          autoApproveUpToDays: null,
          skipIfApproverIsApplicant: true,
          fallbackApproverRoleId: null,
          cancellationRequiresApproval: false,
          allowSelfApprovalForHr: false,
          createdByUserId: 'system',
        },
        'create',
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
    return (await this.repo.findDefaultWorkflow(tenantId, companyId))!;
  }

  /** The leave type's workflow override when active, otherwise the company default. */
  async resolveWorkflow(
    tenantId: string,
    companyId: string,
    workflowId: string | null,
  ): Promise<LeaveApprovalWorkflowRecord> {
    if (workflowId) {
      const own = await this.repo.findWorkflow(tenantId, companyId, workflowId);
      if (own?.isActive) return own;
    }
    return this.ensureDefaultWorkflow(tenantId, companyId);
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  /** Approval steps (and first-approver notification) for a new request. */
  async planForRequest(
    tenantId: string,
    companyId: string,
    workflow: LeaveApprovalWorkflowRecord,
    employee: LeaveEmployeeProfile,
    totalDays: number,
    now: Date,
  ): Promise<{
    steps: ApprovalStepInput[];
    autoApprove: boolean;
    notifications: LeaveNotification[];
  }> {
    const approvers = await Promise.all(
      workflow.levels.map((level) =>
        this.resolveApprover(tenantId, companyId, level, employee, workflow),
      ),
    );
    const isApplicantHr = await this.repo.isEmployeeHr(tenantId, companyId, employee.id, workflow);
    const plan = planApprovalSteps({
      levels: workflow.levels,
      approvers,
      applicantEmployeeId: employee.id,
      skipIfApproverIsApplicant: workflow.skipIfApproverIsApplicant,
      autoApproveUpToDays:
        workflow.autoApproveUpToDays === null ? null : Number(workflow.autoApproveUpToDays),
      totalDays,
      now,
      fallbackApproverRoleId: workflow.fallbackApproverRoleId,
      allowSelfApprovalForHr: workflow.allowSelfApprovalForHr,
      isApplicantHr,
    });
    const first = plan.steps.find((s) => s.action === 'pending');
    return {
      steps: plan.steps.map((s) => ({ ...s, purpose: 'approval' as const })),
      autoApprove: plan.autoApprove,
      notifications: first?.approverEmployeeId
        ? [
            {
              employeeId: first.approverEmployeeId,
              title: 'Leave approval required',
              message: `A leave request of ${totalDays} day(s) is awaiting your approval.`,
              type: 'action_required',
              link: '/ess/leave',
            },
          ]
        : [],
    };
  }

  /** A cancellation step for an approved request, or null when cancellation needs no approval. */
  async planCancellation(
    tenantId: string,
    companyId: string,
    request: EmployeeLeaveRequest,
    employee: LeaveEmployeeProfile,
    now: Date,
  ): Promise<ApprovalStepInput | null> {
    const workflow = await this.resolveWorkflow(tenantId, companyId, request.workflowId);
    if (!workflow.cancellationRequiresApproval) return null;

    // The approver of the final approval decides the cancellation.
    const decided = (await this.repo.getSteps(request.id))
      .filter((s) => s.purpose === 'approval' && s.action === 'approved')
      .pop();
    const approver: ResolvedApprover = decided
      ? { employeeId: decided.approverEmployeeId, roleId: decided.approverRoleId }
      : await this.resolveApprover(tenantId, companyId, workflow.levels[0]!, employee, workflow);
    const firstLevel = workflow.levels[0]!;
    return {
      purpose: 'cancellation',
      level: 1,
      approverEmployeeId: approver.employeeId,
      approverRoleId: approver.roleId,
      action: 'pending',
      slaDueAt: addHours(now, firstLevel.slaHours),
      onSlaBreach:
        firstLevel.onSlaBreach === 'auto_approve' ? 'notify_only' : firstLevel.onSlaBreach,
    };
  }

  private async resolveApprover(
    tenantId: string,
    companyId: string,
    level: LeaveApprovalLevel,
    employee: LeaveEmployeeProfile,
    workflow: LeaveApprovalWorkflowRecord,
  ): Promise<ResolvedApprover> {
    let employeeId: string | null = null;
    switch (level.approverType) {
      case 'reporting_manager':
        employeeId = employee.reportingManagerId;
        break;
      case 'department_head':
        employeeId = employee.departmentId
          ? await this.repo.getDepartmentHeadId(tenantId, companyId, employee.departmentId)
          : null;
        break;
      case 'specific_employee':
        employeeId = level.approverRef;
        break;
      case 'hr_role':
        return { employeeId: null, roleId: level.approverRef };
    }
    if (employeeId && (await this.repo.isActiveEmployee(tenantId, companyId, employeeId))) {
      return { employeeId, roleId: null };
    }
    // Missing or inactive approver: route to the fallback role; HR override can always act.
    return { employeeId: null, roleId: workflow.fallbackApproverRoleId };
  }

  // ── Queue & decisions ──────────────────────────────────────────────────────

  async resolveActor(
    tenantId: string,
    companyId: string,
    userId: string,
    isHrOverride: boolean,
  ): Promise<ApprovalActor> {
    const [employeeId, roleIds] = await Promise.all([
      this.repo.getEmployeeIdForUser(tenantId, companyId, userId),
      this.repo.getUserRoleIds(companyId, userId),
    ]);
    return { userId, employeeId, roleIds, isHrOverride };
  }

  /** `mine`: steps assigned to the actor; `all`: every pending step (HR override only). */
  async getQueue(
    tenantId: string,
    companyId: string,
    actor: ApprovalActor,
    scope: 'mine' | 'all',
  ): Promise<ApprovalQueueItem[]> {
    if (scope === 'all') {
      if (!actor.isHrOverride)
        throw new ForbiddenError('Only HR administrators can view all pending approvals.');
      return this.repo.listPending(tenantId, companyId, null);
    }
    return this.repo.listPending(tenantId, companyId, {
      employeeId: actor.employeeId,
      roleIds: actor.roleIds,
    });
  }

  async decide(
    tenantId: string,
    companyId: string,
    approvalId: string,
    actor: ApprovalActor,
    decision: 'approved' | 'rejected',
    rawComment: unknown,
  ): Promise<DecisionOutcome> {
    const comment = typeof rawComment === 'string' ? rawComment.trim().slice(0, 500) : '';
    if (decision === 'rejected' && comment.length < 3) {
      throw new BadRequestError('A comment is required when rejecting.');
    }
    const step = await this.repo.findStep(approvalId);
    if (!step || step.companyId !== companyId || step.tenantId !== tenantId) {
      throw new NotFoundError('Approval step not found.');
    }
    const request = await this.leaveRepo.findRequest(tenantId, companyId, step.requestId);
    if (!request) throw new NotFoundError('Leave request not found.');
    const workflow = await this.resolveWorkflow(tenantId, companyId, request.workflowId);

    const isAssignee =
      (step.approverEmployeeId !== null && step.approverEmployeeId === actor.employeeId) ||
      (step.approverRoleId !== null && actor.roleIds.includes(step.approverRoleId));
    if (!isAssignee && !actor.isHrOverride) {
      throw new ForbiddenError('You are not the approver for this step.');
    }
    if (
      actor.employeeId === request.employeeId &&
      !(workflow.allowSelfApprovalForHr && actor.isHrOverride)
    ) {
      throw new ForbiddenError('You cannot decide your own leave request.');
    }

    const outcome = await this.leaveRepo.decide({
      tenantId,
      companyId,
      requestId: request.id,
      approvalId,
      decision,
      actorUserId: actor.userId,
      comment: comment || null,
      now: new Date(),
      slaDueAtFor: (level) => {
        const cfg = workflow.levels[level - 1];
        return cfg ? addHours(new Date(), cfg.slaHours) : null;
      },
      notifications: (o) => this.decisionNotifications(o),
    });
    await this.logAudit(
      actor.userId,
      `leave_request_${decision}`,
      tenantId,
      companyId,
      request.id,
      {
        approvalId,
        level: step.level,
        purpose: step.purpose,
        resultingStatus: outcome.status,
        overridden: !isAssignee,
      },
    );
    return outcome;
  }

  private decisionNotifications(o: DecisionOutcome): LeaveNotification[] {
    const range = `${o.request.startDate} to ${o.request.endDate}`;
    if (o.nextStep) {
      return o.nextStep.approverEmployeeId
        ? [
            {
              employeeId: o.nextStep.approverEmployeeId,
              title: 'Leave approval required',
              message: `A leave request (${range}) is awaiting your approval.`,
              type: 'action_required',
            },
          ]
        : [];
    }
    const messages: Record<string, [string, string, LeaveNotification['type']]> = {
      'approval:approved': [
        'Leave approved',
        `Your leave (${range}) has been approved.`,
        'success',
      ],
      'approval:rejected': ['Leave rejected', `Your leave (${range}) was rejected.`, 'warning'],
      'cancellation:cancelled': [
        'Leave cancelled',
        `Your leave (${range}) has been cancelled.`,
        'info',
      ],
      'cancellation:approved': [
        'Cancellation declined',
        `Your request to cancel leave (${range}) was declined; the leave stands.`,
        'warning',
      ],
    };
    const msg = messages[`${o.purpose}:${o.status}`];
    return msg
      ? [{ employeeId: o.request.employeeId, title: msg[0], message: msg[1], type: msg[2] }]
      : [];
  }

  /** Applies each overdue step's SLA action once (spec §9.2 step 4). */
  async runSlaSweep(
    now: Date = new Date(),
  ): Promise<{ escalated: number; autoApproved: number; notified: number }> {
    let escalated = 0;
    let autoApproved = 0;
    let notified = 0;
    for (const step of await this.repo.findOverdue(now)) {
      const request = await this.leaveRepo.findRequest(
        step.tenantId,
        step.companyId,
        step.requestId,
      );
      if (!request) continue;
      const workflow = await this.resolveWorkflow(
        step.tenantId,
        step.companyId,
        request.workflowId,
      );
      const slaDueAtFor = (level: number) => {
        const cfg = workflow.levels[level - 1];
        return cfg ? addHours(now, cfg.slaHours) : null;
      };
      try {
        if (step.onSlaBreach === 'auto_approve' && step.purpose === 'approval') {
          await this.leaveRepo.decide({
            tenantId: step.tenantId,
            companyId: step.companyId,
            requestId: request.id,
            approvalId: step.id,
            decision: 'approved',
            actorUserId: 'system',
            comment: 'Auto-approved after SLA breach',
            now,
            slaDueAtFor,
            notifications: (o) => this.decisionNotifications(o),
          });
          autoApproved++;
        } else if (step.onSlaBreach === 'escalate_to_next') {
          await this.leaveRepo.escalate(step.id, now, slaDueAtFor);
          escalated++;
        } else {
          await this.leaveRepo.markSlaBreached(step.id, now);
          notified++;
        }
      } catch (err) {
        // A concurrent decision already moved this step on; nothing to do.
        if (!(err instanceof ConflictError)) throw err;
      }
    }
    return { escalated, autoApproved, notified };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async validate(
    tenantId: string,
    companyId: string,
    dto: WorkflowDto,
    existing: LeaveApprovalWorkflowRecord | null,
  ) {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const name = typeof dto.name === 'string' ? dto.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestError(
        'Workflow name is required and must be between 2 and 100 characters.',
      );
    }
    if (await this.repo.findWorkflowByName(companyId, name, existing?.id)) {
      throw new ConflictError(`A workflow named "${name}" already exists.`);
    }

    if (!Array.isArray(dto.levels) || dto.levels.length < 1 || dto.levels.length > 2) {
      throw new BadRequestError('A workflow needs one or two approval levels.');
    }
    const levels: LeaveApprovalLevel[] = [];
    for (const [i, raw] of dto.levels.entries()) {
      const label = `Level ${i + 1}`;
      const approverType = assertEnum(raw?.approverType, APPROVER_TYPES, `${label} approver type`);
      const slaHours = parseOptionalInteger(raw?.slaHours, `${label} SLA hours`);
      if (slaHours === null || slaHours < 1 || slaHours > 168) {
        throw new BadRequestError(`${label} SLA must be between 1 and 168 hours.`);
      }
      const onSlaBreach = assertEnum(
        raw?.onSlaBreach ?? 'notify_only',
        SLA_ACTIONS,
        `${label} SLA action`,
      );
      let approverRef: string | null = null;
      if (approverType === 'hr_role' || approverType === 'specific_employee') {
        approverRef =
          typeof raw?.approverRef === 'string' && raw.approverRef ? raw.approverRef : null;
        const ok =
          approverRef !== null &&
          (approverType === 'hr_role'
            ? await this.repo.roleExists(companyId, approverRef)
            : await this.repo.isActiveEmployee(tenantId, companyId, approverRef));
        if (!ok) {
          throw new BadRequestError(
            `${label}: select an active ${approverType === 'hr_role' ? 'role' : 'employee'}.`,
          );
        }
      }
      levels.push({ approverType, approverRef, slaHours, onSlaBreach });
    }

    const autoApprove = parseOptionalNumber(dto.autoApproveUpToDays, 'Auto-approve threshold');
    if (
      autoApprove !== null &&
      (autoApprove <= 0 || autoApprove > 30 || !isHalfDayMultiple(autoApprove))
    ) {
      throw new BadRequestError(
        'Auto-approve threshold must be between 0.5 and 30 days, in steps of 0.5.',
      );
    }

    const fallback =
      typeof dto.fallbackApproverRoleId === 'string' && dto.fallbackApproverRoleId
        ? dto.fallbackApproverRoleId
        : null;
    if (fallback && !(await this.repo.roleExists(companyId, fallback))) {
      throw new BadRequestError('Fallback approver must be an active role.');
    }

    const bool = (v: unknown, field: string, fallbackValue: boolean) => {
      if (v === undefined) return fallbackValue;
      if (typeof v !== 'boolean') throw new BadRequestError(`${field} must be true or false.`);
      return v;
    };
    const isDefault = bool(dto.isDefault, 'isDefault', false);
    const isActive = bool(dto.isActive, 'isActive', true);
    if (existing?.isDefault && !isDefault) {
      throw new BadRequestError(
        'Make another workflow the default instead of unsetting the default.',
      );
    }
    if (isDefault && !isActive) throw new BadRequestError('The default workflow must be active.');

    return {
      name,
      description:
        typeof dto.description === 'string' ? dto.description.trim().slice(0, 500) || null : null,
      isDefault,
      isActive,
      levels,
      autoApproveUpToDays: autoApprove === null ? null : autoApprove.toFixed(2),
      skipIfApproverIsApplicant: bool(
        dto.skipIfApproverIsApplicant,
        'skipIfApproverIsApplicant',
        true,
      ),
      fallbackApproverRoleId: fallback,
      cancellationRequiresApproval: bool(
        dto.cancellationRequiresApproval,
        'cancellationRequiresApproval',
        false,
      ),
      allowSelfApprovalForHr: bool(dto.allowSelfApprovalForHr, 'allowSelfApprovalForHr', false),
    };
  }

  private async toView(w: LeaveApprovalWorkflowRecord): Promise<WorkflowView> {
    return {
      ...w,
      autoApproveUpToDays: w.autoApproveUpToDays === null ? null : Number(w.autoApproveUpToDays),
      leaveTypeCount: await this.repo.countLeaveTypesUsingWorkflow(w.companyId, w.id),
    };
  }

  private async requireWorkflow(tenantId: string, companyId: string, id: string) {
    const workflow = await this.repo.findWorkflow(tenantId, companyId, id);
    if (!workflow) throw new NotFoundError(`Approval workflow "${id}" not found.`);
    return workflow;
  }

  private async withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isDuplicateKeyError(err))
        throw new ConflictError('A workflow with this name already exists.');
      throw err;
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    tenantId: string,
    companyId: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.logEvent({
      actorUserId: userId,
      action,
      targetType: action.startsWith('leave_request') ? 'leave_request' : 'leave_workflow',
      targetId,
      tenantId,
      companyId,
      metadata,
    });
  }
}

export const leaveApprovalsService = new LeaveApprovalsService();
