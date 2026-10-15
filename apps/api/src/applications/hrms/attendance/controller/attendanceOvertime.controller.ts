/**
 * BEZENT HRMS — Overtime Controller (V1.0)
 *
 * Exposes REST endpoints for:
 * - Overtime overview metrics
 * - Overtime eligibility checking
 * - Request creation, listing, detail, withdrawal, cancellation
 * - Approval queue & review decision
 * - Settlement allocation & reversal
 * - Policy management
 */

import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { AttendanceOvertimeService } from '../service/attendanceOvertime.service.js';
import type {
  CreateOvertimeRequestInput,
  DecideOvertimeRequestInput,
  AllocateOvertimeSettlementInput,
  ReverseOvertimeSettlementInput,
  OvertimeFilterQuery,
  OvertimeRequestStatus,
  OvertimeSettlementStatus,
  OvertimeSettlementRecordStatus,
  OvertimeSettlementFilterQuery,
} from '../types/attendanceOvertime.types.js';

export class AttendanceOvertimeController {
  constructor(private readonly service = new AttendanceOvertimeService()) {}

  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter = {
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
      };
      const data = await this.service.getOverview(tenantId, companyId, filter);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  checkEligibility = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const employeeId = req.query.employeeId as string;
      const workDate = req.query.workDate as string;

      if (!employeeId || !workDate) {
        throw new BadRequestError('employeeId and workDate query parameters are required.');
      }

      const result = await this.service.getWorkdayContext(
        tenantId,
        companyId,
        employeeId,
        workDate,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter: OvertimeFilterQuery = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as OvertimeRequestStatus)
            : undefined,
        settlementStatus:
          typeof req.query.settlementStatus === 'string'
            ? (req.query.settlementStatus as OvertimeSettlementStatus)
            : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        workDate: typeof req.query.workDate === 'string' ? req.query.workDate : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
      };

      const result = await this.service.queryRequests(tenantId, companyId, filter);
      res.json({
        success: true,
        data: result.items,
        meta: {
          total: result.totalCount,
          page: filter.page,
          limit: filter.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getRequestDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getRequestById(tenantId, companyId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const role = req.user?.memberships?.[0]?.role ?? 'employee';
      const body = req.body as CreateOvertimeRequestInput;

      const data = await this.service.createRequest(tenantId, companyId, body, userId, role);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  decideRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const userId = req.user?.id ?? 'system';
      const role = req.user?.memberships?.[0]?.role ?? 'manager';
      const body = req.body as DecideOvertimeRequestInput;

      const data = await this.service.decideRequest(tenantId, companyId, id, body, userId, role);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  withdrawRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const userId = req.user?.id ?? 'system';
      const reason = req.body?.reason || 'Withdrawn by requester';

      const data = await this.service.withdrawRequest(tenantId, companyId, id, reason, userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const userId = req.user?.id ?? 'system';
      const role = req.user?.memberships?.[0]?.role ?? 'admin';
      const reason = req.body?.reason || 'Cancelled by administrator';

      const data = await this.service.cancelRequest(tenantId, companyId, id, reason, userId, role);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  allocateSettlement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const userId = req.user?.id ?? 'system';
      const role = req.user?.memberships?.[0]?.role ?? 'payroll_admin';
      const body = req.body as AllocateOvertimeSettlementInput;

      const data = await this.service.allocateSettlement(
        tenantId,
        companyId,
        id,
        body,
        userId,
        role,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  reverseSettlement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const settlementId = req.params.settlementId as string;
      const userId = req.user?.id ?? 'system';
      const role = req.user?.memberships?.[0]?.role ?? 'payroll_admin';
      const reversalReason = req.body?.reversalReason;

      const input: ReverseOvertimeSettlementInput = {
        settlementId,
        reversalReason,
      };

      const data = await this.service.reverseSettlement(tenantId, companyId, input, userId, role);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  listSettlements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter: OvertimeSettlementFilterQuery = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as OvertimeSettlementRecordStatus | 'all')
            : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
      };
      const result = await this.service.querySettlements(tenantId, companyId, filter);
      res.json({
        success: true,
        data: result.items,
        meta: {
          total: result.totalCount,
          page: filter.page,
          limit: filter.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  listPolicies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listPolicies(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getPolicyDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getPolicyById(tenantId, companyId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.createPolicy(tenantId, companyId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.updatePolicy(tenantId, companyId, id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceOvertimeController = new AttendanceOvertimeController();
