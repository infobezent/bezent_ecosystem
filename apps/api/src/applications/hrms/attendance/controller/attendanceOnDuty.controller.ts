import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { attendanceOnDutyService } from '../service/attendanceOnDuty.service.js';
import type {
  CreateOnDutyRequestPayload,
  ReviewOnDutyDecisionInput,
  BulkOnDutyActionInput,
  OnDutyFilterV1,
} from '../types/attendance.types.js';

export class AttendanceOnDutyController {
  constructor(private readonly service = attendanceOnDutyService) {}

  getConfiguredOdTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const types = await this.service.getConfiguredOdTypes(tenantId, companyId);
      res.json({ success: true, data: types });
    } catch (err) {
      next(err);
    }
  };

  listWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;

      let approvalStatus = typeof req.query.approvalStatus === 'string' ? req.query.approvalStatus : undefined;
      if (!approvalStatus && typeof req.query.status === 'string') {
        if (req.query.status === 'pending') approvalStatus = 'submitted';
        else if (req.query.status !== 'all') approvalStatus = req.query.status;
      }

      const filter: OnDutyFilterV1 = {
        approvalStatus,
        processingStatus: typeof req.query.processingStatus === 'string' ? req.query.processingStatus : undefined,
        odTypeId: typeof req.query.odTypeId === 'string' ? req.query.odTypeId : undefined,
        durationType: typeof req.query.durationType === 'string' ? req.query.durationType : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        submittedFrom: typeof req.query.submittedFrom === 'string' ? req.query.submittedFrom : undefined,
        submittedTo: typeof req.query.submittedTo === 'string' ? req.query.submittedTo : undefined,
        assignedTo: typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined,
        departmentId: typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        pageSize: req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 10,
      };

      const result = await this.service.listWorkspace(tenantId, companyId, filter);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getRequestDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const result = await this.service.getRequestById(tenantId, companyId, id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const body = req.body as CreateOnDutyRequestPayload;
      const result = await this.service.createRequest(tenantId, companyId, body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  assignReviewer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const { assignedTo, role } = req.body as { assignedTo: string; role?: string };
      if (!assignedTo) throw new BadRequestError('assignedTo user ID is required');

      const result = await this.service.assignReviewer(tenantId, companyId, id, assignedTo, userId, role);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const result = await this.service.startReview(tenantId, companyId, id, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  requestClarification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const { notes } = req.body as { notes: string };
      const result = await this.service.requestClarification(tenantId, companyId, id, notes, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  provideClarification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const { response } = req.body as { response: string };
      const result = await this.service.provideClarification(tenantId, companyId, id, response, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  private async resolveEmployeeId(
    req: Request,
    tenantId: string,
    companyId: string,
    userId: string,
  ): Promise<string | undefined> {
    const fromCtx =
      req.employeeContext?.id ||
      (req.user as unknown as { employeeId?: string })?.employeeId;
    if (fromCtx) return fromCtx;
    if (userId && userId !== 'system') {
      const resolved = await this.service.resolveEmployeeIdByUserId(tenantId, companyId, userId);
      if (resolved) return resolved;
    }
    return undefined;
  }

  reviewDecision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const employeeId = await this.resolveEmployeeId(req, tenantId, companyId, userId);
      const id = req.params.id as string;
      const body = req.body as ReviewOnDutyDecisionInput;
      const result = await this.service.reviewDecision(tenantId, companyId, id, body, userId, employeeId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const { reason } = req.body as { reason?: string };
      const result = await this.service.cancelRequest(tenantId, companyId, id, userId, reason);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  previewBulkApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const employeeId = await this.resolveEmployeeId(req, tenantId, companyId, userId);
      const { requestIds } = req.body as { requestIds: string[] };
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new BadRequestError('requestIds array is required');
      }

      const result = await this.service.previewBulkApproval(tenantId, companyId, requestIds, userId, employeeId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  bulkAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id ?? 'system';
      const employeeId = await this.resolveEmployeeId(req, tenantId, companyId, userId);
      const body = req.body as BulkOnDutyActionInput;
      if (!body.action || !Array.isArray(body.requestIds) || body.requestIds.length === 0) {
        throw new BadRequestError('action and non-empty requestIds array are required');
      }

      const result = await this.service.executeBulkAction(tenantId, companyId, body, userId, employeeId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  exportRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter: OnDutyFilterV1 = {
        ...req.query,
        page: 1,
        pageSize: 1000,
      };
      const queryResult = await this.service.listWorkspace(tenantId, companyId, filter);

      // RFC-4180 CSV export with formula injection defense
      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        // Prefix with quote if starts with formula trigger
        if (/^[=+\-@]/.test(str)) str = `'${str}`;
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        'Request Number',
        'Employee Code',
        'Employee Name',
        'Department',
        'OD Type',
        'Start Date',
        'End Date',
        'Duration',
        'Location / Site',
        'Purpose',
        'Approval Status',
        'Processing Status',
        'Submitted At',
      ];

      const lines = [headers.join(',')];
      for (const item of queryResult.items) {
        lines.push(
          [
            escapeCsv(item.requestNumber),
            escapeCsv(item.employeeCode),
            escapeCsv(item.employeeName),
            escapeCsv(item.departmentName || ''),
            escapeCsv(item.odTypeName),
            escapeCsv(item.startDate),
            escapeCsv(item.endDate),
            escapeCsv(item.durationType),
            escapeCsv(item.locationOrSite || ''),
            escapeCsv(item.purpose),
            escapeCsv(item.approvalStatus),
            escapeCsv(item.processingStatus),
            escapeCsv(item.submittedAt),
          ].join(','),
        );
      }

      const csvContent = lines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="on_duty_register_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceOnDutyController = new AttendanceOnDutyController();
