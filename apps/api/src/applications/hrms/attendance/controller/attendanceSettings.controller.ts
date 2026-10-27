import type { Request, Response, NextFunction } from 'express';
import {
  AttendanceSettingsService,
  attendanceSettingsService,
} from '../service/attendanceSettings.service.js';
import {
  AttendanceImportService,
  attendanceImportService,
} from '../service/attendanceImport.service.js';
import type { SettingsAuditFilter } from '../types/attendance.types.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';

export class AttendanceSettingsController {
  constructor(
    private readonly service: AttendanceSettingsService = attendanceSettingsService,
    private readonly importService: AttendanceImportService = attendanceImportService,
  ) {}

  /* ── 1. General Settings ────────────────────────────────────────── */

  getGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getGeneralSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateGeneralSettings(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /* ── 2. Policies & Overrides ────────────────────────────────────── */

  listPolicies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const scope =
        typeof req.query.scope === 'string'
          ? (req.query.scope as 'company' | 'department' | 'employee')
          : undefined;
      const status =
        typeof req.query.status === 'string'
          ? (req.query.status as 'draft' | 'published' | 'archived')
          : undefined;
      const data = await this.service.listPolicies(tenantId, companyId, { scope, status });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getPolicyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Policy ID is required');
      const data = await this.service.getPolicyById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  resolveEffectivePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const employeeId =
        typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
      const departmentId =
        typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const data = await this.service.resolveEffectivePolicy(
        tenantId,
        companyId,
        employeeId,
        departmentId,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.createPolicy(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Policy ID is required');
      const data = await this.service.updatePolicy(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  rollbackPolicyVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Policy ID is required');
      const data = await this.service.rollbackPolicyVersion(
        tenantId,
        companyId,
        id,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  publishPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Policy ID is required');
      const data = await this.service.publishPolicy(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /* ── 3. Regularization Settings ─────────────────────────────────── */

  getRegularizationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getRegularizationSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateRegularizationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateRegularizationSettings(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /* ── 4. Capture & Devices ───────────────────────────────────────── */

  listDevices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listDevices(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  registerDevice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.registerDevice(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateDevice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Device ID is required');
      const data = await this.service.updateDevice(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  testDeviceConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Device ID is required');
      const data = await this.service.testDeviceConnection(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  listImportBatches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listImportBatches(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  processBulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const { batchType, fileName, rows, columnMapping } = req.body;
      if (!batchType || !fileName || !Array.isArray(rows)) {
        throw new BadRequestError('batchType, fileName, and rows array are required');
      }
      const data = await this.importService.processBulkImport(
        tenantId,
        companyId,
        { batchType, fileName, rows, columnMapping },
        req.user?.id,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  rollbackImportBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) throw new BadRequestError('Batch ID is required');
      await this.importService.rollbackImportBatch(tenantId, companyId, id, req.user?.id);
      res.json({ success: true, message: 'Import batch reversed successfully' });
    } catch (err) {
      next(err);
    }
  };

  /* ── 5. Location & Security Settings ────────────────────────────── */

  getSecuritySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getSecuritySettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateSecuritySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateSecuritySettings(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /* ── 6. Payroll & Locking ───────────────────────────────────────── */

  getPayrollSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getPayrollSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updatePayrollSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updatePayrollSettings(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  listPeriods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listPeriods(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  checkPeriodLockReadiness = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      if (!code) throw new BadRequestError('Period code is required');
      const data = await this.service.checkPeriodLockReadiness(tenantId, companyId, code);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  lockPeriod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      if (!code) throw new BadRequestError('Period code is required');
      const data = await this.service.lockPeriod(
        tenantId,
        companyId,
        code,
        req.user?.id ?? 'system',
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  unlockPeriod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      if (!code) throw new BadRequestError('Period code is required');
      const { reason } = req.body;
      const data = await this.service.unlockPeriod(
        tenantId,
        companyId,
        code,
        reason,
        req.user?.id ?? 'system',
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  listHandoverBatches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listHandoverBatches(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  generatePayrollHandover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const { periodCode, format } = req.body;
      if (!periodCode) throw new BadRequestError('periodCode is required');
      const exportFormat = format === 'json' ? 'json' : 'csv';
      const result = await this.service.generatePayrollHandover(
        tenantId,
        companyId,
        periodCode,
        exportFormat,
        req.user?.id,
        req.ip,
      );

      if (req.query.download === 'true' && exportFormat === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="payroll_handover_${periodCode}.csv"`,
        );
        res.send(result.exportData);
        return;
      }

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /* ── 7. Audit & History ─────────────────────────────────────────── */

  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const category =
        typeof req.query.category === 'string'
          ? (req.query.category as SettingsAuditFilter['category'])
          : undefined;
      const action = typeof req.query.action === 'string' ? req.query.action : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = (page - 1) * limit;

      const result = await this.service.getAuditLogs(tenantId, companyId, {
        category,
        action,
        limit,
        offset,
      });
      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  /* ── 8. Shift & Roster Configuration ────────────────────────────── */

  getShiftSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getShiftRosterSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateShiftSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateShiftRosterSettings(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.createCompanyShift(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateCompanyShift(
        tenantId,
        companyId,
        req.params.id as string,
        req.body,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  deleteShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.deleteCompanyShift(
        tenantId,
        companyId,
        req.params.id as string,
        req.user?.id,
        req.ip,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceSettingsController = new AttendanceSettingsController();
