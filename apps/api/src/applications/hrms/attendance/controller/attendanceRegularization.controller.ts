import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { attendanceRegularizationService } from '../service/attendanceRegularization.service.js';
import { attendanceRegularizationEligibilityService } from '../service/attendanceRegularizationEligibility.service.js';
import type {
  RegularizationRequestType,
  BulkRegularizationActionInput,
} from '../types/attendance.types.js';

export class AttendanceRegularizationController {
  constructor(
    private readonly service = attendanceRegularizationService,
    private readonly eligibilityService = attendanceRegularizationEligibilityService,
  ) {}

  /**
   * List regularization requests with summary counters and filters
   */
  listWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;

      // Map legacy status filter if present
      let approvalStatus = typeof req.query.approvalStatus === 'string' ? req.query.approvalStatus : undefined;
      if (!approvalStatus && typeof req.query.status === 'string') {
        if (req.query.status === 'pending') {
          approvalStatus = 'submitted';
        } else if (req.query.status !== 'all') {
          approvalStatus = req.query.status;
        }
      }

      const result = await this.service.listRegularizations(tenantId, companyId, {
        approvalStatus,
        applicationStatus:
          typeof req.query.applicationStatus === 'string'
            ? req.query.applicationStatus
            : undefined,
        requestType:
          typeof req.query.requestType === 'string' ? req.query.requestType : undefined,
        workdayFrom:
          typeof req.query.workdayFrom === 'string'
            ? req.query.workdayFrom
            : typeof req.query.dateFrom === 'string'
              ? req.query.dateFrom
              : undefined,
        workdayTo:
          typeof req.query.workdayTo === 'string'
            ? req.query.workdayTo
            : typeof req.query.dateTo === 'string'
              ? req.query.dateTo
              : undefined,
        submittedFrom:
          typeof req.query.submittedFrom === 'string' ? req.query.submittedFrom : undefined,
        submittedTo:
          typeof req.query.submittedTo === 'string' ? req.query.submittedTo : undefined,
        assignedTo:
          typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        locationId:
          typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
        relatedException:
          typeof req.query.relatedException === 'string'
            ? req.query.relatedException
            : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        employeeId:
          typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : 'submittedAt',
        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      });

      res.json({
        data: result.items,
        counters: result.counters,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Pre-submission eligibility check
   */
  checkEligibility = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const employeeId = (req.query.employeeId || req.body?.employeeId) as string;
      const workday = (req.query.workday || req.body?.workday) as string;
      const requestType =
        ((req.query.requestType || req.body?.requestType) as RegularizationRequestType) ||
        'missing_in';

      if (!employeeId || !workday) {
        throw new BadRequestError('employeeId and workday parameters are required');
      }

      const result = await this.eligibilityService.checkEligibility(tenantId, companyId, {
        employeeId,
        workday,
        requestType,
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get single request details for review drawer
   */
  getDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.getRegularizationDetails(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Submit or draft new regularization
   */
  submitRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.submitRequest(
        tenantId,
        companyId,
        req.body,
        req.user?.id ?? 'system',
        false,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Assign / reassign reviewer
   */
  assignReviewer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const assignedTo =
        req.body.assignedTo !== undefined
          ? req.body.assignedTo
          : req.body.reviewerUserId !== undefined
            ? req.body.reviewerUserId
            : null;
      const data = await this.service.assignReviewer(
        tenantId,
        companyId,
        id,
        assignedTo,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Start review (submitted -> under_review)
   */
  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.startReview(
        tenantId,
        companyId,
        id,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Request clarification from employee (under_review -> awaiting_info)
   */
  requestClarification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const notes = req.body.notes || req.body.question || '';
      const data = await this.service.requestClarification(
        tenantId,
        companyId,
        id,
        { notes },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Employee clarifies (awaiting_info -> under_review)
   */
  provideClarification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.provideClarification(
        tenantId,
        companyId,
        id,
        { response: req.body.response, attachments: req.body.attachments },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Review request decision: Approve or Reject
   */
  reviewRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const status = req.body.status || req.body.decision;
      const reason = req.body.reason;
      const remarks = req.body.remarks;

      if (status !== 'approved' && status !== 'rejected') {
        throw new BadRequestError('Status must be approved or rejected');
      }

      const data = await this.service.reviewRequest(
        tenantId,
        companyId,
        id,
        { status, reason, remarks },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cancel request
   */
  cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.cancelRequest(
        tenantId,
        companyId,
        id,
        req.body.reason ?? '',
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Controlled bulk operations
   */
  bulkAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const input = req.body as BulkRegularizationActionInput;
      if (!input.action || !Array.isArray(input.requestIds) || input.requestIds.length === 0) {
        throw new BadRequestError('action and non-empty requestIds array are required');
      }

      const data = await this.service.bulkAction(
        tenantId,
        companyId,
        input,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Export regularizations dataset (CSV)
   */
  exportCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filterBody = req.body?.filter || {};
      const selectedIds = req.query.selectedIds
        ? String(req.query.selectedIds).split(',')
        : Array.isArray(req.body?.selectedIds)
          ? req.body.selectedIds
          : undefined;

      const approvalStatus =
        (typeof req.query.approvalStatus === 'string'
          ? req.query.approvalStatus
          : filterBody.approvalStatus) || undefined;
      const applicationStatus =
        (typeof req.query.applicationStatus === 'string'
          ? req.query.applicationStatus
          : filterBody.applicationStatus) || undefined;
      const requestType =
        (typeof req.query.requestType === 'string'
          ? req.query.requestType
          : filterBody.requestType) || undefined;
      const workdayFrom =
        (typeof req.query.workdayFrom === 'string'
          ? req.query.workdayFrom
          : filterBody.workdayFrom) || undefined;
      const workdayTo =
        (typeof req.query.workdayTo === 'string'
          ? req.query.workdayTo
          : filterBody.workdayTo) || undefined;
      const assignedTo =
        (typeof req.query.assignedTo === 'string'
          ? req.query.assignedTo
          : filterBody.assignedTo) || undefined;
      const departmentId =
        (typeof req.query.departmentId === 'string'
          ? req.query.departmentId
          : filterBody.departmentId) || undefined;

      const result = await this.service.exportRegularizationsCsv(tenantId, companyId, {
        approvalStatus,
        applicationStatus,
        requestType,
        workdayFrom,
        workdayTo,
        assignedTo,
        departmentId,
        selectedIds,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceRegularizationController = new AttendanceRegularizationController();
