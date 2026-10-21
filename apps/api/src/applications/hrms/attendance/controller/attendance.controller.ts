import type { Request, Response, NextFunction } from 'express';
import { AttendanceService, attendanceService } from '../service/attendance.service.js';
import {
  AttendancePolicyService,
  attendancePolicyService,
} from '../service/attendancePolicy.service.js';
import {
  AttendanceOnDutyService,
  attendanceOnDutyService,
} from '../service/attendanceOnDuty.service.js';
import {
  attendanceMissingPunchDetectorService,
} from '../service/attendanceMissingPunchDetector.service.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';

export class AttendanceController {
  constructor(
    private readonly service: AttendanceService = attendanceService,
    private readonly policyService: AttendancePolicyService = attendancePolicyService,
    private readonly onDutyService: AttendanceOnDutyService = attendanceOnDutyService,
  ) {}

  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
      const data = await this.service.getOverview(tenantId, companyId, date);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getDailyLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
      const result = await this.service.getDailyLog(tenantId, companyId, {
        date,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        processingState:
          typeof req.query.processingState === 'string' ? req.query.processingState : undefined,
        shiftRef: typeof req.query.shiftRef === 'string' ? req.query.shiftRef : undefined,
        locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
        indicator: typeof req.query.indicator === 'string' ? req.query.indicator : undefined,
        punchSource: typeof req.query.punchSource === 'string' ? req.query.punchSource : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 25,
        sortBy:
          typeof req.query.sortBy === 'string'
            ? (req.query.sortBy as
                'name' | 'code' | 'department' | 'checkIn' | 'checkOut' | 'workedHours' | 'status')
            : undefined,
        sortOrder:
          req.query.sortOrder === 'asc' || req.query.sortOrder === 'desc'
            ? req.query.sortOrder
            : undefined,
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

  getEmployeeDailyDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const rawId = req.params.employeeId;
      const employeeId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!employeeId) {
        throw new BadRequestError('employeeId is required');
      }
      const date =
        typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
      const detail = await this.service.getEmployeeDailyDetail(
        tenantId,
        companyId,
        employeeId,
        date,
      );
      if (!detail) {
        res.status(404).json({ error: { message: 'Employee not found' } });
        return;
      }
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  };

  recalculateDailyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const { employeeIds, date } = req.body;
      if (!Array.isArray(employeeIds) || !date) {
        throw new BadRequestError('employeeIds array and date are required');
      }
      const result = await this.service.recalculateEmployeeAttendance(
        tenantId,
        companyId,
        employeeIds,
        date,
        req.user?.id ?? 'system',
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  bulkFinalizeDailyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const { employeeIds, date } = req.body;
      if (!Array.isArray(employeeIds) || !date) {
        throw new BadRequestError('employeeIds array and date are required');
      }
      const result = await this.service.bulkFinalizeAttendance(
        tenantId,
        companyId,
        employeeIds,
        date,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getMonthlySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const now = new Date();
      const year = req.query.year ? Number(req.query.year) : now.getFullYear();
      const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
      const data = await this.service.getMonthlySummary(tenantId, companyId, {
        year,
        month,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getPunchLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const result = await this.service.getPunchLogs(tenantId, companyId, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
        dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
        dateInterpretation:
          req.query.dateInterpretation === 'workday' ? 'workday' : 'event_timestamp',
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        punchType: typeof req.query.punchType === 'string' ? req.query.punchType : undefined,
        validationStatus:
          typeof req.query.validationStatus === 'string' ? req.query.validationStatus : undefined,
        processingState:
          typeof req.query.processingState === 'string' ? req.query.processingState : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 30,
      });
      res.json({ data: result.punches, counters: result.counters, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getPunchDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        throw new BadRequestError('Punch event ID is required');
      }
      const data = await this.service.getPunchDetails(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updatePunchInvestigation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.updateInvestigation(
        tenantId,
        companyId,
        req.body,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  retryPunchProcessing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const punchIds = Array.isArray(req.body.punchIds)
        ? req.body.punchIds
        : [req.body.punchId].filter(Boolean);
      const data = await this.service.retryProcessing(
        tenantId,
        companyId,
        punchIds,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  bulkPunchAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.bulkPunchAction(
        tenantId,
        companyId,
        req.body,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  exportPunchLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const selectedIds = req.query.selectedIds
        ? String(req.query.selectedIds).split(',')
        : undefined;

      const result = await this.service.exportPunchLogsCsv(
        tenantId,
        companyId,
        {
          date: typeof req.query.date === 'string' ? req.query.date : undefined,
          dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
          dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
          dateInterpretation:
            req.query.dateInterpretation === 'workday' ? 'workday' : 'event_timestamp',
          employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
          source: typeof req.query.source === 'string' ? req.query.source : undefined,
          punchType: typeof req.query.punchType === 'string' ? req.query.punchType : undefined,
          validationStatus:
            typeof req.query.validationStatus === 'string' ? req.query.validationStatus : undefined,
          processingState:
            typeof req.query.processingState === 'string' ? req.query.processingState : undefined,
          departmentId:
            typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
          locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        },
        selectedIds,
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.content);
    } catch (err) {
      next(err);
    }
  };

  getExceptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;

      // If rich V1 query parameters are provided
      if (
        req.query.v1 === 'true' ||
        req.query.status !== undefined ||
        req.query.severity !== undefined ||
        req.query.page !== undefined ||
        req.query.dateInterpretation !== undefined ||
        req.query.assignment !== undefined
      ) {
        const result = await this.service.getExceptionsList(tenantId, companyId, {
          dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
          dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
          dateInterpretation:
            req.query.dateInterpretation === 'detected_at' ? 'detected_at' : 'workday',
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
          exceptionType:
            typeof req.query.exceptionType === 'string' ? req.query.exceptionType : undefined,
          source: typeof req.query.source === 'string' ? req.query.source : undefined,
          assignment: typeof req.query.assignment === 'string' ? req.query.assignment : undefined,
          assignedTo: typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined,
          departmentId:
            typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
          pendingActionReason:
            typeof req.query.pendingActionReason === 'string'
              ? req.query.pendingActionReason
              : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
          page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
          limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
          sortBy:
            (req.query.sortBy as
              | 'workday'
              | 'severity'
              | 'detectedAt'
              | 'status'
              | 'employeeName'
              | 'exceptionType') || undefined,
          sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
        });
        return res.json({ data: result });
      }

      // Legacy fallback
      const data = await this.service.getExceptions(tenantId, companyId, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        type:
          typeof req.query.type === 'string'
            ? (req.query.type as 'missing_punch' | 'late' | 'early_exit' | 'short_hours' | 'all')
            : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getExceptionDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const exceptionId = String(req.params.id);
      const data = await this.service.getExceptionDetails(tenantId, companyId, exceptionId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  assignException = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const exceptionId = String(req.params.id);
      const data = await this.service.assignException(
        tenantId,
        companyId,
        {
          exceptionId,
          assignedTo: req.body.assignedTo,
          assignedQueue: req.body.assignedQueue,
          notes: req.body.notes,
        },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateExceptionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const exceptionId = String(req.params.id);
      const data = await this.service.updateExceptionStatus(
        tenantId,
        companyId,
        {
          exceptionId,
          status: req.body.status,
          pendingActionReason: req.body.pendingActionReason,
          pendingActionAwaitedFrom: req.body.pendingActionAwaitedFrom,
          notes: req.body.notes,
          resolutionNotes: req.body.resolutionNotes,
          resolutionType: req.body.resolutionType,
        },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  overrideExceptionSeverity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const exceptionId = String(req.params.id);
      const data = await this.service.overrideExceptionSeverity(
        tenantId,
        companyId,
        {
          exceptionId,
          severity: req.body.severity,
          reason: req.body.reason,
        },
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  verifyAndResolveException = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const exceptionId = String(req.params.id);
      const data = await this.service.verifyAndResolveException(
        tenantId,
        companyId,
        exceptionId,
        req.body.resolutionNotes,
        req.user?.id ?? 'system',
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  bulkExceptionAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const result = await this.service.bulkExceptionAction(
        tenantId,
        companyId,
        req.body,
        req.user?.id ?? 'system',
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  triggerMissingPunchSweep = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const targetDate = typeof req.body?.targetDate === 'string' ? req.body.targetDate : undefined;
      const result = await attendanceMissingPunchDetectorService.runSweep({
        tenantId,
        companyId,
        targetDate,
      });
      res.json({
        success: true,
        data: result,
        message: `Missing punch sweep completed: detected ${result.detectedCount} missing punch(es) and sent ${result.alertCount} alert(s)`,
      });
    } catch (err) {
      next(err);
    }
  };

  exportExceptionsCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const selectedIds = req.query.selectedIds
        ? String(req.query.selectedIds).split(',').filter(Boolean)
        : undefined;

      const result = await this.service.exportExceptionsCsv(
        tenantId,
        companyId,
        {
          dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
          dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
          dateInterpretation:
            req.query.dateInterpretation === 'detected_at' ? 'detected_at' : 'workday',
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
          exceptionType:
            typeof req.query.exceptionType === 'string' ? req.query.exceptionType : undefined,
          source: typeof req.query.source === 'string' ? req.query.source : undefined,
          assignedTo: typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined,
          departmentId:
            typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
        },
        selectedIds,
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (err) {
      next(err);
    }
  };

  getRegularizationRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getRegularizationRequests(tenantId, companyId, {
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as 'pending' | 'approved' | 'rejected' | 'all')
            : undefined,
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  reviewRegularization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        throw new BadRequestError('Regularization request ID is required');
      }
      const { status, remarks } = req.body;
      if (status !== 'approved' && status !== 'rejected') {
        throw new BadRequestError('Status must be approved or rejected');
      }

      const reviewed = await this.service.reviewRegularization(
        tenantId,
        companyId,
        id,
        status,
        remarks ?? '',
        req.user?.id ?? 'system',
      );
      res.json({ data: reviewed });
    } catch (err) {
      next(err);
    }
  };

  manualCorrection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const record = await this.service.manualCorrection(
        tenantId,
        companyId,
        req.body,
        req.user?.id ?? 'system',
        {
          roleCodes: (req.access?.roles ?? []).map((role) => role.code),
          isSuperAdmin: Boolean(req.user?.isSuperAdmin),
          isTenantAdmin: Boolean(req.access?.isTenantAdmin),
        },
      );
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  };

  getPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const policy = await this.policyService.getPolicy(tenantId, companyId);
      res.json({ data: policy });
    } catch (err) {
      next(err);
    }
  };

  updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const policy = await this.policyService.updatePolicy(tenantId, companyId, req.body);
      res.json({ data: policy });
    } catch (err) {
      next(err);
    }
  };

  exportReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const type = req.query.type ?? 'daily';
      const now = new Date();

      if (type === 'monthly') {
        const year = req.query.year ? Number(req.query.year) : now.getFullYear();
        const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
        const csv = await this.service.exportMonthlySummaryCsv(tenantId, companyId, {
          year,
          month,
          departmentId:
            typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance_monthly_${year}_${month}.csv"`,
        );
        res.send(csv);
      } else {
        const date =
          typeof req.query.date === 'string' ? req.query.date : now.toISOString().slice(0, 10);
        const csv = await this.service.exportDailyLogCsv(tenantId, companyId, {
          date,
          departmentId:
            typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_daily_${date}.csv"`);
        res.send(csv);
      }
    } catch (err) {
      next(err);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // ON-DUTY (OD) WORKFLOW CONTROLLERS
  // ════════════════════════════════════════════════════════════════════════

  getConfiguredOdTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const types = await this.onDutyService.getConfiguredOdTypes(tenantId, companyId);
      res.json({ data: types });
    } catch (err) {
      next(err);
    }
  };

  createOnDutyRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const isDraft = req.query.draft === 'true';
      const created = await this.onDutyService.createRequest(
        tenantId,
        companyId,
        req.body,
        req.user?.id,
        isDraft,
      );
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  listOnDutyRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const filter = {
        employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        departmentId:
          typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
      };
      const items = await this.onDutyService.listRequests(tenantId, companyId, filter);
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  getOnDutyRequestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const item = await this.onDutyService.getRequestById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  submitOnDutyDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const submitted = await this.onDutyService.submitDraft(
        tenantId,
        companyId,
        id,
        req.user?.id ?? 'system',
      );
      res.json({ data: submitted });
    } catch (err) {
      next(err);
    }
  };

  withdrawOnDutyRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const withdrawn = await this.onDutyService.withdrawRequest(
        tenantId,
        companyId,
        id,
        req.user?.id ?? 'system',
        req.body?.reason,
      );
      res.json({ data: withdrawn });
    } catch (err) {
      next(err);
    }
  };

  cancelOnDutyRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const cancelled = await this.onDutyService.cancelRequest(
        tenantId,
        companyId,
        id,
        req.user?.id ?? 'system',
        req.body?.reason,
      );
      res.json({ data: cancelled });
    } catch (err) {
      next(err);
    }
  };

  reviewOnDutyRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = req.params.id as string;
      const reviewed = await this.onDutyService.reviewRequest(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id ?? 'system',
        (req as unknown as { employeeId?: string }).employeeId,
      );
      res.json({ data: reviewed });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceController = new AttendanceController();
