/**
 * BEZENT HRMS — Comp-Off Controller (V1.0)
 *
 * Exposes REST endpoints for:
 * - Comp-Off overview metrics & KPIs
 * - Workday eligibility evaluation
 * - Earning request submission, listing, detail, and withdrawal
 * - Approval queue & review decisions (approve, reject)
 * - Approved entitlements register & controlled reversal
 * - Leave handoff ledger status & retry
 * - Conversion of Overtime Comp-Off settlements
 * - Policy management & audit visibility
 */

import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { AttendanceCompOffService } from '../service/attendanceCompOff.service.js';
import type {
  CreateCompOffRequestInput,
  DecideCompOffRequestInput,
  CompOffFilterQuery,
  CompOffRequestStatus,
  CompOffEntitlementStatus,
  CompOffHandoffStatus,
} from '../types/attendanceCompOff.types.js';

export class AttendanceCompOffController {
  constructor(private readonly service = new AttendanceCompOffService()) {}

  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter = {
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
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
      const filter: CompOffFilterQuery = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as CompOffRequestStatus | 'all')
            : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        workDate: typeof req.query.workDate === 'string' ? req.query.workDate : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.service.listRequests(tenantId, companyId, filter);
      res.json({
        success: true,
        data: result.items,
        pagination: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      next(err);
    }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actorUserId = req.user?.id ?? 'usr_anonymous';
      const actorRole = req.user?.memberships?.[0]?.role ?? 'employee';

      const input: CreateCompOffRequestInput = {
        employeeId: req.body.employeeId,
        workDate: req.body.workDate,
        dayType: req.body.dayType,
        requestedCreditDays: Number(req.body.requestedCreditDays || 1),
        reason: req.body.reason,
        locationOrSite: req.body.locationOrSite,
        taskOrProject: req.body.taskOrProject,
        sourceIntervals: req.body.sourceIntervals,
        evidenceAttachments: req.body.evidenceAttachments,
      };

      const data = await this.service.createRequest(
        tenantId,
        companyId,
        input,
        actorUserId,
        actorRole,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getRequestDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const requestId = req.params.id as string;
      const data = await this.service.getRequestById(tenantId, companyId, requestId);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'Comp-Off request not found.' } });
        return;
      }

      const audits = await this.service.getAuditsForRequest(tenantId, companyId, requestId);
      res.json({ success: true, data: { ...data, audits } });
    } catch (err) {
      next(err);
    }
  };

  getApprovalQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const reviewerUserId = req.user?.id;
      const primaryRole = req.user?.memberships?.[0]?.role ?? 'manager';
      const isHrAdmin =
        primaryRole === 'hr_manager' || primaryRole === 'admin' || primaryRole === 'super_admin';

      const data = await this.service.getApprovalQueue(tenantId, companyId, {
        reviewerUserId,
        reviewerEmpId: req.user?.id,
        isHrAdmin,
      });

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  decideRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const requestId = req.params.id as string;
      const reviewerUserId = req.user?.id ?? 'usr_anonymous';
      const reviewerRole = req.user?.memberships?.[0]?.role ?? 'manager';

      const input: DecideCompOffRequestInput = {
        decision: req.body.decision,
        approvedCreditDays:
          req.body.approvedCreditDays !== undefined
            ? Number(req.body.approvedCreditDays)
            : undefined,
        reviewNotes: req.body.reviewNotes,
        expectedVersion:
          req.body.expectedVersion !== undefined ? Number(req.body.expectedVersion) : undefined,
      };

      const data = await this.service.decideRequest(
        tenantId,
        companyId,
        requestId,
        input,
        reviewerUserId,
        reviewerRole,
      );

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  withdrawRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const requestId = req.params.id as string;
      const userId = req.user?.id ?? 'usr_anonymous';
      const reason = req.body.reason || 'Withdrawn by requester';

      const data = await this.service.withdrawRequest(
        tenantId,
        companyId,
        requestId,
        userId,
        reason,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  listEntitlements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as CompOffEntitlementStatus | 'all')
            : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.service.listEntitlements(tenantId, companyId, filter);
      res.json({
        success: true,
        data: result.items,
        pagination: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      next(err);
    }
  };

  reverseEntitlement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const entitlementId = req.params.id as string;
      const userId = req.user?.id ?? 'usr_anonymous';
      const reversalReason = req.body.reversalReason;

      if (!reversalReason) {
        throw new BadRequestError('reversalReason is required to reverse an entitlement.');
      }

      const data = await this.service.reverseEntitlement(
        tenantId,
        companyId,
        entitlementId,
        userId,
        reversalReason,
      );

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  convertFromOvertime = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const settlementId = req.params.settlementId as string;
      const userId = req.user?.id ?? 'usr_anonymous';

      const data = await this.service.convertOvertimeSettlementToCompOff(
        tenantId,
        companyId,
        settlementId,
        userId,
      );

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  listHandoffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as CompOffHandoffStatus | 'all')
            : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.service.listHandoffs(tenantId, companyId, filter);
      res.json({
        success: true,
        data: result.items,
        pagination: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      next(err);
    }
  };

  listPolicies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const status =
        typeof req.query.status === 'string'
          ? (req.query.status as 'draft' | 'published' | 'archived')
          : undefined;
      const data = await this.service.listPolicies(tenantId, companyId, status);
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

  getPolicyDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const policyId = req.params.id as string;
      const data = await this.service.getPolicyById(tenantId, companyId, policyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const policyId = req.params.id as string;
      const data = await this.service.updatePolicy(tenantId, companyId, policyId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getRequestAudits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const requestId = req.params.id as string;
      const data = await this.service.getAuditsForRequest(tenantId, companyId, requestId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceCompOffController = new AttendanceCompOffController();
