import type { Request, Response, NextFunction } from 'express';
import {
  leaveOperationsService,
  type LeaveOperationsService,
  type OperationsViewer,
} from '../service/leaveOperations.service.js';
import { leaveReportsService, type LeaveReportsService } from '../service/leaveReports.service.js';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
type Ctx = { tenantId: string; companyId: string; viewer: OperationsViewer };

const HR_OVERRIDE_PERMISSIONS = ['hrms.leave.settings_manage', 'hrms.leave.settings.manage'];
/** Holding any of these makes the leave data scope company-wide; otherwise it is the reportees. */
const COMPANY_SCOPE_PERMISSIONS = [
  ...HR_OVERRIDE_PERMISSIONS,
  'hrms.leave.settings_view',
  'hrms.leave.settings.view',
  'hrms.leave.apply_on_behalf',
];

export function resolveViewer(req: Request): OperationsViewer {
  const access = req.access;
  const permissions = access?.permissions ?? [];
  const has = (keys: string[]) => keys.some((p) => permissions.includes(p));
  const companyWide =
    !!access?.isTenantAdmin || !!access?.isPlatformOversight || has(COMPANY_SCOPE_PERMISSIONS);
  return {
    userId: req.user?.id || 'system',
    scope: companyWide
      ? { kind: 'company' }
      : { kind: 'team', managerEmployeeId: access?.employeeId ?? null },
    isHrOverride: has(HR_OVERRIDE_PERMISSIONS),
    canBackdateOverride: has(['hrms.leave.backdated_override']),
    canPayrollOverride: has(['hrms.leave.payroll_override']),
  };
}

function handle(fn: (req: Request, ctx: Ctx) => Promise<unknown>, status = 200): Handler {
  return async (req, res, next) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await fn(req, { tenantId, companyId, viewer: resolveViewer(req) });
      res.status(status).json({ data });
    } catch (err) {
      next(err);
    }
  };
}

/** Leave Operations (sidebar → Leave): overview, request register, approvals helpers. */
export class LeaveOperationsController {
  constructor(private readonly service: LeaveOperationsService = leaveOperationsService) {}

  overview = handle((req, c) =>
    this.service.getOverview(c.tenantId, c.companyId, c.viewer, req.query),
  );

  listRequests = handle((req, c) =>
    this.service.listRequests(c.tenantId, c.companyId, c.viewer, req.query),
  );
  getRequest = handle((req, c) =>
    this.service.getRequest(c.tenantId, c.companyId, c.viewer, String(req.params.id)),
  );
  applyOnBehalf = handle(
    (req, c) => this.service.applyOnBehalf(c.tenantId, c.companyId, c.viewer, req.body ?? {}),
    201,
  );
  cancelRequest = handle((req, c) =>
    this.service.cancelRequest(
      c.tenantId,
      c.companyId,
      c.viewer,
      String(req.params.id),
      req.body?.reason,
    ),
  );
  employeeWorkspace = handle((req, c) =>
    this.service.getEmployeeWorkspace(c.tenantId, c.companyId, String(req.params.employeeId)),
  );

  calendar = handle((req, c) =>
    this.service.getCalendar(c.tenantId, c.companyId, c.viewer, req.query),
  );

  balances = handle((req, c) =>
    this.service.getBalances(c.tenantId, c.companyId, c.viewer, req.query),
  );
  ledger = handle((req, c) =>
    this.service.getLedger(
      c.tenantId,
      c.companyId,
      c.viewer,
      String(req.params.employeeId),
      req.query,
    ),
  );
  adjustBalance = handle(
    (req, c) => this.service.adjustBalance(c.tenantId, c.companyId, c.viewer, req.body ?? {}),
    201,
  );

  holidayCalendar = handle((req, c) =>
    this.service.getHolidayCalendar(c.tenantId, c.companyId, c.viewer, req.query),
  );
  yearEnd = handle((req, c) =>
    this.service.getYearEnd(c.tenantId, c.companyId, c.viewer, req.query),
  );
  closeYear = handle((req, c) =>
    this.service.closeYear(c.tenantId, c.companyId, c.viewer, req.body?.cycleStart),
  );

  approvalStats = handle((_req, c) =>
    this.service.approvalStats(c.tenantId, c.companyId, c.viewer),
  );
  bulkApprove = handle((req, c) =>
    this.service.bulkApprove(
      c.tenantId,
      c.companyId,
      c.viewer,
      req.body?.approvalIds,
      req.body?.comment,
    ),
  );
}

/** Leave Operations → Reports: JSON for the page, CSV when `format=csv`. */
export class LeaveReportsController {
  constructor(private readonly service: LeaveReportsService = leaveReportsService) {}

  report: Handler = async (req, res, next) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const report = await this.service.getReport(
        tenantId,
        companyId,
        resolveViewer(req),
        String(req.params.reportId),
        req.query,
      );
      if (req.query.format === 'csv') {
        const file = `leave-${report.reportId}-${report.range.from}-to-${report.range.to}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
        res.status(200).send(this.service.toCsv(report));
        return;
      }
      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  };
}

export const leaveOperationsController = new LeaveOperationsController();
export const leaveReportsController = new LeaveReportsController();
