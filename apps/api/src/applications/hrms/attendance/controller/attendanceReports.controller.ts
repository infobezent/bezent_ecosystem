import type { Request, Response, NextFunction } from 'express';
import {
  AttendanceReportsService,
  attendanceReportsService,
} from '../service/attendanceReports.service.js';
import type { ReportId } from '../types/attendanceReports.types.js';

export class AttendanceReportsController {
  constructor(private readonly service: AttendanceReportsService = attendanceReportsService) {}

  getCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalog = this.service.getCatalog(req.access);
      res.json({ data: catalog });
    } catch (err) {
      next(err);
    }
  };

  previewReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const reportId = req.params.reportId as string;
      const options = {
        filters: req.body?.filters || {},
        sorting: req.body?.sorting,
        pagination: req.body?.pagination,
        selectedColumns: req.body?.selectedColumns,
      };

      const result = await this.service.previewReport(
        tenantId,
        companyId,
        reportId,
        options,
        req.user,
        req.access,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getReportAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const reportId = req.params.reportId as string;
      const filters = req.body?.filters || {};

      const result = await this.service.getReportAnalytics(
        tenantId,
        companyId,
        reportId,
        filters,
        req.user,
        req.access,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  exportReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const reportId = req.params.reportId as string;
      const exportInput = {
        format: req.body?.format || 'csv',
        filters: req.body?.filters || {},
        sorting: req.body?.sorting,
        selectedColumns: req.body?.selectedColumns,
        configurationName: req.body?.configurationName,
        includeAnalytics: req.body?.includeAnalytics !== false,
      };

      const exportResult = await this.service.exportReport(
        tenantId,
        companyId,
        reportId,
        exportInput,
        req.user,
        req.access,
      );

      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      res.setHeader('X-Report-Row-Count', String(exportResult.rowCount));
      res.setHeader('X-Report-History-Id', exportResult.historyId);
      res.send(exportResult.buffer);
    } catch (err) {
      next(err);
    }
  };

  getSavedReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const ownerUserId = req.user?.id ?? 'system';
      const reportId =
        typeof req.query.reportId === 'string' ? (req.query.reportId as ReportId) : undefined;

      const list = await this.service.listSavedConfigurations(
        tenantId,
        companyId,
        ownerUserId,
        reportId,
      );
      res.json({ data: list });
    } catch (err) {
      next(err);
    }
  };

  createSavedReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const ownerUserId = req.user?.id ?? 'system';
      const input = {
        reportId: req.body?.reportId,
        configurationName: req.body?.configurationName,
        filters: req.body?.filters || {},
        selectedColumns: req.body?.selectedColumns,
        sorting: req.body?.sorting,
      };

      const created = await this.service.createSavedConfiguration(
        tenantId,
        companyId,
        ownerUserId,
        input,
      );
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateSavedReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const ownerUserId = req.user?.id ?? 'system';
      const id = req.params.id as string;
      const input = {
        configurationName: req.body?.configurationName,
        filters: req.body?.filters,
        selectedColumns: req.body?.selectedColumns,
        sorting: req.body?.sorting,
      };

      const updated = await this.service.updateSavedConfiguration(
        tenantId,
        companyId,
        ownerUserId,
        id,
        input,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  deleteSavedReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const ownerUserId = req.user?.id ?? 'system';
      const id = req.params.id as string;

      await this.service.deleteSavedConfiguration(tenantId, companyId, ownerUserId, id);
      res.json({ data: { success: true, message: 'Configuration deleted successfully' } });
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actorUserId = req.query.mine === 'true' ? req.user?.id : undefined;
      const reportId =
        typeof req.query.reportId === 'string' ? (req.query.reportId as ReportId) : undefined;

      const history = await this.service.listHistory(tenantId, companyId, actorUserId, reportId);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  };

  downloadHistoryFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;

      const exportResult = await this.service.downloadHistoryFile(
        tenantId,
        companyId,
        id,
        req.user,
        req.access,
      );

      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
      res.setHeader('X-Report-Row-Count', String(exportResult.rowCount));
      res.setHeader('X-Report-History-Id', exportResult.historyId);
      res.send(exportResult.buffer);
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceReportsController = new AttendanceReportsController();
