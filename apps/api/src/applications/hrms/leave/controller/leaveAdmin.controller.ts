import type { Request, Response, NextFunction } from 'express';
import {
  leaveApprovalsService,
  type LeaveApprovalsService,
} from '../service/leaveApprovals.service.js';
import {
  leaveRestrictionsService,
  type LeaveRestrictionsService,
} from '../service/leaveRestrictions.service.js';
import { leaveAccrualService, type LeaveAccrualService } from '../service/leaveAccrual.service.js';
import { leaveService, type LeaveService } from '../service/leave.service.js';
import { leaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import { localDateInTimezone } from '../rules/leaveValidation.js';

type Ctx = { tenantId: string; companyId: string; userId: string; isHrOverride: boolean };
type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const HR_OVERRIDE_PERMISSIONS = ['hrms.leave.settings_manage', 'hrms.leave.settings.manage'];

function handle(fn: (req: Request, ctx: Ctx) => Promise<unknown>, status = 200): Handler {
  return async (req, res, next) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const permissions = req.access?.permissions ?? [];
      const data = await fn(req, {
        tenantId,
        companyId,
        userId: req.user?.id || 'system',
        isHrOverride: HR_OVERRIDE_PERMISSIONS.some((p) => permissions.includes(p)),
      });
      res.status(status).json({ data });
    } catch (err) {
      next(err);
    }
  };
}

async function companyToday(tenantId: string, companyId: string): Promise<string> {
  return localDateInTimezone(
    await leaveGeneralSettingsRepository.getCompanyTimezone(tenantId, companyId),
  );
}

/** Tab 7 — approval workflows and the HR approval queue. */
export class LeaveApprovalsController {
  constructor(
    private readonly service: LeaveApprovalsService = leaveApprovalsService,
    private readonly leave: Pick<
      LeaveService,
      'getApprovalQueue' | 'decideApproval'
    > = leaveService,
  ) {}

  listWorkflows = handle((_req, c) => this.service.listWorkflows(c.tenantId, c.companyId));
  getWorkflow = handle((req, c) =>
    this.service.getWorkflow(c.tenantId, c.companyId, String(req.params.id)),
  );
  createWorkflow = handle(
    (req, c) => this.service.createWorkflow(c.tenantId, c.companyId, c.userId, req.body),
    201,
  );
  updateWorkflow = handle((req, c) =>
    this.service.updateWorkflow(c.tenantId, c.companyId, String(req.params.id), c.userId, req.body),
  );

  queue = handle((req, c) =>
    this.leave.getApprovalQueue(
      c.tenantId,
      c.companyId,
      c.userId,
      c.isHrOverride,
      req.query.scope === 'all' ? 'all' : 'mine',
    ),
  );
  approve = handle((req, c) =>
    this.leave.decideApproval(
      c.tenantId,
      c.companyId,
      c.userId,
      c.isHrOverride,
      String(req.params.approvalId),
      'approved',
      req.body?.comment,
    ),
  );
  reject = handle((req, c) =>
    this.leave.decideApproval(
      c.tenantId,
      c.companyId,
      c.userId,
      c.isHrOverride,
      String(req.params.approvalId),
      'rejected',
      req.body?.comment,
    ),
  );
}

/** Tab 5 — restriction rules. */
export class LeaveRestrictionsController {
  constructor(private readonly service: LeaveRestrictionsService = leaveRestrictionsService) {}

  list = handle((_req, c) => this.service.list(c.tenantId, c.companyId));
  history = handle((req, c) =>
    this.service.history(c.tenantId, c.companyId, String(req.params.ruleKey)),
  );
  create = handle(
    (req, c) => this.service.create(c.tenantId, c.companyId, c.userId, req.body),
    201,
  );
  update = handle((req, c) =>
    this.service.update(c.tenantId, c.companyId, String(req.params.ruleKey), c.userId, req.body),
  );
}

/** Tab 4 — accrual & carry-forward rules and year-end processing. */
export class LeaveAccrualController {
  constructor(private readonly service: LeaveAccrualService = leaveAccrualService) {}

  listRules = handle(async (_req, c) =>
    this.service.listRules(c.tenantId, c.companyId, await companyToday(c.tenantId, c.companyId)),
  );
  saveRule = handle(async (req, c) =>
    this.service.saveRule(
      c.tenantId,
      c.companyId,
      String(req.params.leaveTypeId),
      c.userId,
      req.body,
      await companyToday(c.tenantId, c.companyId),
    ),
  );
  previewYearEnd = handle(async (req, c) => {
    const { rows, cycle, nextCycle, alreadyClosed, runStatus } =
      await this.service.previewCycleClose(
        c.tenantId,
        c.companyId,
        String(req.query.cycleStart ?? ''),
      );
    return { cycle, nextCycle, alreadyClosed, runStatus, rows };
  });
  reviewYearEnd = handle(async (req, c) =>
    this.service.reviewCycleClose(
      c.tenantId,
      c.companyId,
      String(req.body?.cycleStart ?? ''),
      c.userId,
    ),
  );
  commitYearEnd = handle(async (req, c) =>
    this.service.commitCycleClose(
      c.tenantId,
      c.companyId,
      String(req.body?.cycleStart ?? ''),
      c.userId,
      await companyToday(c.tenantId, c.companyId),
    ),
  );
  listRuns = handle((_req, c) => this.service.listCloseRuns(c.tenantId, c.companyId));
  listEncashments = handle((req, c) =>
    this.service.listEncashments(
      c.tenantId,
      c.companyId,
      typeof req.query.cycleStart === 'string' ? req.query.cycleStart : undefined,
    ),
  );
}

export const leaveApprovalsController = new LeaveApprovalsController();
export const leaveRestrictionsController = new LeaveRestrictionsController();
export const leaveAccrualController = new LeaveAccrualController();
