import type { Request, Response, NextFunction } from 'express';
import {
  AttendanceOverviewService,
  attendanceOverviewService,
} from '../service/attendanceOverview.service.js';

export class AttendanceOverviewController {
  constructor(private readonly service: AttendanceOverviewService = attendanceOverviewService) {}

  /**
   * GET /hrms/attendance/overview
   * Returns complete overview payload.
   */
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const trendRange: '7d' | '30d' | 'custom' =
        req.query.trendRange === '30d'
          ? '30d'
          : req.query.trendRange === 'custom'
            ? 'custom'
            : '7d';

      const params = {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        trendRange,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
      };

      const data = await this.service.getCombinedOverview(
        tenantId,
        companyId,
        params,
        req.user,
        req.access,
      );

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/today
   */
  getTodayKpis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);

      const data = await this.service.getTodayKpis(tenantId, companyId, date, req.access, req.user);

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/trends
   */
  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const trendRange: '7d' | '30d' | 'custom' =
        req.query.trendRange === '30d'
          ? '30d'
          : req.query.trendRange === 'custom'
            ? 'custom'
            : '7d';

      const params = {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        trendRange,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      };

      const data = await this.service.getTrends(tenantId, companyId, params, req.access, req.user);

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/departments
   */
  getDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);

      const data = await this.service.getDepartmentComparison(
        tenantId,
        companyId,
        date,
        req.access,
        req.user,
      );

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/actions
   */
  getActionQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getActionQueue(tenantId, companyId, req.access, req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/processing-health
   */
  getProcessingHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);

      const data = await this.service.getProcessingHealth(
        tenantId,
        companyId,
        date,
        req.access,
        req.user,
      );

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /hrms/attendance/overview/monthly-readiness
   */
  getMonthlyReadiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const month =
        typeof req.query.month === 'string'
          ? req.query.month
          : new Date().toISOString().slice(0, 7);

      const data = await this.service.getMonthlyPayrollReadiness(
        tenantId,
        companyId,
        month,
        req.access,
        req.user,
      );

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceOverviewController = new AttendanceOverviewController();
