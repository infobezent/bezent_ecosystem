import type { Request, Response, NextFunction } from 'express';
import {
  attendanceMonthlySummaryService,
  type AttendanceMonthlySummaryService,
} from '../service/attendanceMonthlySummary.service.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import type {
  MonthlySummaryFilter,
  AttendancePayrollReadiness,
  AttendanceReviewState,
} from '../types/attendanceMonthlySummary.types.js';

export class AttendanceMonthlySummaryController {
  constructor(
    private readonly service: AttendanceMonthlySummaryService = attendanceMonthlySummaryService,
  ) {}

  getWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      let month =
        typeof req.query.month === 'string'
          ? req.query.month
          : new Date().toISOString().slice(0, 7);
      if (req.query.year && typeof req.query.month === 'string' && !req.query.month.includes('-')) {
        month = `${req.query.year}-${String(req.query.month).padStart(2, '0')}`;
      }

      const filter: MonthlySummaryFilter = {
        month,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        payrollReadiness:
          typeof req.query.payrollReadiness === 'string'
            ? (req.query.payrollReadiness as AttendancePayrollReadiness)
            : undefined,
        reviewState:
          typeof req.query.reviewState === 'string'
            ? (req.query.reviewState as AttendanceReviewState)
            : undefined,
        isLocked:
          req.query.isLocked === 'true'
            ? true
            : req.query.isLocked === 'false'
              ? false
              : undefined,
        hasExceptions: req.query.hasExceptions === 'true',
        hasPendingCorrections: req.query.hasPendingCorrections === 'true',
        hasProcessingIssues: req.query.hasProcessingIssues === 'true',
        counterFilter:
          typeof req.query.counterFilter === 'string'
            ? (req.query.counterFilter as MonthlySummaryFilter['counterFilter'])
            : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      };

      const result = await this.service.getWorkspace(tenantId, companyId, filter);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getSummaryById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getDailyBreakdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getDailyBreakdown(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getReadiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getReadinessReport(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const data = await this.service.getReviewHistory(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  assignReviewer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const { reviewerId } = req.body;
      const actorUserId = (req.user as any)?.id;

      if (!reviewerId) {
        throw new BadRequestError('reviewerId is required');
      }

      const data = await this.service.assignReviewer(
        tenantId,
        companyId,
        id,
        reviewerId,
        actorUserId,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const actorUserId = (req.user as any)?.id || 'system';

      const data = await this.service.startReview(tenantId, companyId, id, actorUserId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  requestCorrection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const { notes } = req.body;
      const actorUserId = (req.user as any)?.id || 'system';

      const data = await this.service.requestCorrection(
        tenantId,
        companyId,
        id,
        notes,
        actorUserId,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  markReviewed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const { notes } = req.body;
      const actorUserId = (req.user as any)?.id || 'system';

      const data = await this.service.markReviewed(tenantId, companyId, id, notes, actorUserId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  reopenReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const { reason } = req.body;
      const actorUserId = (req.user as any)?.id || 'system';

      const data = await this.service.reopenReview(tenantId, companyId, id, reason, actorUserId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  recalculateSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const actorUserId = (req.user as any)?.id;

      const data = await this.service.recalculateSummary(
        tenantId,
        companyId,
        id,
        actorUserId,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  bulkPreview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const { action, summaryIds } = req.body;

      if (!action || !Array.isArray(summaryIds)) {
        throw new BadRequestError('action and summaryIds array are required');
      }

      const data = await this.service.bulkPreview(tenantId, companyId, action, summaryIds);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  bulkExecute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actorUserId = (req.user as any)?.id || 'system';
      const data = await this.service.bulkExecute(tenantId, companyId, req.body, actorUserId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  exportSummaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actorUserId = (req.user as any)?.id || 'system';
      const payload = req.method === 'POST' ? req.body : req.query;

      const month =
        typeof payload.month === 'string'
          ? payload.month
          : new Date().toISOString().slice(0, 7);

      const exportResult = await this.service.exportSummaries(
        tenantId,
        companyId,
        {
          month,
          format: (payload.format as 'csv' | 'excel' | 'pdf') || 'csv',
          level: (payload.level as 'standard' | 'detailed' | 'audit') || 'standard',
          selectedIds: Array.isArray(payload.selectedIds) ? payload.selectedIds : undefined,
          departmentId:
            typeof payload.departmentId === 'string' ? payload.departmentId : undefined,
          search: typeof payload.search === 'string' ? payload.search : undefined,
        },
        actorUserId,
      );

      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportResult.filename}"`,
      );
      res.send(exportResult.content);
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceMonthlySummaryController = new AttendanceMonthlySummaryController();
