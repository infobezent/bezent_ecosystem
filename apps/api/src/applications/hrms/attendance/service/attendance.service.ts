import { getDb } from '../../../../db/connection.js';
import { AttendanceRepository, attendanceRepository } from '../repository/attendance.repository.js';
import {
  AttendanceCalculationService,
  attendanceCalculationService,
} from './attendanceCalculation.service.js';
import { AttendancePolicyService, attendancePolicyService } from './attendancePolicy.service.js';
import { AttendanceAlertService, attendanceAlertService } from './attendanceAlert.service.js';
import {
  AttendanceManualEntryService,
  attendanceManualEntryService,
  type ManualEntryActor,
} from './attendanceManualEntry.service.js';
import {
  AttendanceSecurityService,
  attendanceSecurityService,
} from './attendanceSecurity.service.js';
import {
  DefaultShiftScheduleProvider,
  defaultShiftScheduleProvider,
} from './shiftSchedule.provider.js';
import { attendanceWorkdayService, formatTimeInTimezone } from './attendanceWorkday.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import type {
  CheckInInput,
  EmployeeAttendance,
  DailyLogFilter,
  DailyLogResult,
  DailyLogEmployeeDetail,
  PunchLogFilter,
  RegularizationFilter,
  RegularizationItem,
  AttendanceExceptionFilter,
  AttendanceExceptionItem,
  AttendanceOverviewKpis,
  MonthlySummaryFilter,
  MonthlySummaryEmployeeRow,
  ManualCorrectionInput,
  PunchLogResult,
  PunchLogItem,
  PunchEventDetail,
  UpdatePunchInvestigationInput,
  BulkPunchActionInput,
  ExceptionFilter,
  ExceptionQueryResult,
  AttendanceExceptionCaseItem,
  ExceptionCaseDetail,
  AssignExceptionInput,
  UpdateExceptionStatusInput,
  OverrideExceptionSeverityInput,
  BulkExceptionActionInput,
} from '../types/attendance.types.js';

export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository = attendanceRepository,
    private readonly calculator: AttendanceCalculationService = attendanceCalculationService,
    private readonly policyService: AttendancePolicyService = attendancePolicyService,
    private readonly scheduleProvider: DefaultShiftScheduleProvider = defaultShiftScheduleProvider,
    private readonly securityService: AttendanceSecurityService = attendanceSecurityService,
    private readonly manualEntryService: AttendanceManualEntryService = attendanceManualEntryService,
    private readonly alertService: AttendanceAlertService = attendanceAlertService,
  ) {}

  getCurrentTimeString(now: Date = new Date(), timeZone?: string): string {
    if (timeZone) {
      return formatTimeInTimezone(now, timeZone);
    }
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async getTodayAttendance(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<EmployeeAttendance | null> {
    return this.repo.getTodayAttendance(tenantId, companyId, employeeId, date);
  }

  async recordCheckIn(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    input: CheckInInput,
  ): Promise<{ record: EmployeeAttendance; checkInTime: string }> {
    // 1. Check payroll lock before mutation
    const isLocked = await this.repo.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new BadRequestError(
        `Cannot record attendance check-in for date ${date}: Period is locked for payroll`,
      );
    }

    // 2. Resolve timezone & authoritative punch time
    const now = new Date();
    const effectiveTz = await attendanceWorkdayService.resolveTimezone(
      tenantId,
      companyId,
      employeeId,
    );
    const checkInTime = this.getCurrentTimeString(now, effectiveTz);

    const security = await this.securityService.assertPunchAllowed(
      tenantId,
      companyId,
      employeeId,
      {
        punchType: 'in',
        clientIp: input.clientIp,
        deviceMetadata: input.deviceMetadata,
      },
    );

    try {
      const db = getDb();
      const { updated, lateArrivalAlert } = await db.transaction(async (tx) => {
        // 1. Base check-in record (handles atomic insertion or row-locked update)
        const record = await this.repo.checkIn(
          tenantId,
          companyId,
          employeeId,
          date,
          checkInTime,
          input.workLocation ?? 'office',
          input.notes,
          tx,
        );

        // 2. Audit punch event
        await this.repo.recordPunch(
          tenantId,
          companyId,
          employeeId,
          'in',
          input.source ?? 'web',
          input.workLocation ?? 'office',
          input.notes,
          security.deviceMetadata,
          now,
          date,
          tx,
        );

        // 3. Calculation engine
        const [schedule, policy, onLeave] = await Promise.all([
          this.scheduleProvider.getEmployeeSchedule(tenantId, companyId, employeeId, date),
          this.policyService.getEffectivePolicy(tenantId, companyId, date, employeeId),
          this.scheduleProvider.isEmployeeOnApprovedLeave(tenantId, companyId, employeeId, date),
        ]);

        const calc = this.calculator.calculate({
          date,
          checkInTime,
          checkOutTime: null,
          schedule,
          policy,
          isOnApprovedLeave: onLeave,
          isToday: true,
        });

        // 4. Update metrics
        const updatedRecord = await this.repo.updateDailyAttendance(
          record.id,
          {
            lateMinutes: calc.lateMinutes,
            isLate: calc.isLate,
            status: calc.status,
            processingState: calc.processingState,
            shiftScheduleRef: calc.shiftScheduleRef,
            calculationMetadata: calc.calculationMetadata,
          },
          tx,
        );

        return {
          updated: updatedRecord,
          lateArrivalAlert: calc.isLate ? { lateMinutes: calc.lateMinutes } : null,
        };
      });

      if (lateArrivalAlert) {
        await this.alertService.notify(
          tenantId,
          companyId,
          'lateArrival',
          { employeeId },
          {
            title: 'Late arrival',
            detail: `checked in at ${checkInTime}, ${lateArrivalAlert.lateMinutes} minute(s) after the allowed start.`,
            link: '/hrms/attendance/daily-log',
            type: 'warning',
          },
        );
      }

      return { record: updated, checkInTime };
    } catch (err: unknown) {
      if (err instanceof ConflictError) {
        throw err;
      }
      const causeMsg =
        err &&
        typeof err === 'object' &&
        'cause' in err &&
        (err as { cause?: { message?: string } }).cause?.message
          ? String((err as { cause?: { message?: string } }).cause?.message)
          : '';
      const raw = `${err instanceof Error ? err.message : ''} ${causeMsg}`;
      if (
        raw.includes('already recorded') ||
        raw.includes('ER_DUP_ENTRY') ||
        raw.includes('Duplicate entry') ||
        raw.includes('ER_LOCK_DEADLOCK') ||
        raw.includes('Deadlock')
      ) {
        throw new ConflictError('Attendance check-in already recorded for today');
      }
      throw err;
    }
  }

  async recordCheckOut(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    input?: {
      source?: 'web' | 'mobile' | 'biometric' | 'manual' | 'api';
      notes?: string;
      clientIp?: string;
      deviceMetadata?: Record<string, unknown>;
    },
  ): Promise<{ updated: EmployeeAttendance; checkOutTime: string }> {
    // 1. Check payroll lock before mutation
    const isLocked = await this.repo.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new BadRequestError(
        `Cannot record attendance check-out for date ${date}: Period is locked for payroll`,
      );
    }

    // 2. Resolve timezone & authoritative punch time
    const now = new Date();
    const effectiveTz = await attendanceWorkdayService.resolveTimezone(
      tenantId,
      companyId,
      employeeId,
    );
    const checkOutTime = this.getCurrentTimeString(now, effectiveTz);

    const security = await this.securityService.assertPunchAllowed(
      tenantId,
      companyId,
      employeeId,
      {
        punchType: 'out',
        clientIp: input?.clientIp,
        deviceMetadata: input?.deviceMetadata,
      },
    );

    try {
      const db = getDb();
      const { updated, earlyExitAlert } = await db.transaction(async (tx) => {
        const todayAtt = await this.repo.getTodayAttendanceForUpdate(
          tenantId,
          companyId,
          employeeId,
          date,
          tx,
        );
        if (!todayAtt || !todayAtt.checkInTime) {
          throw new BadRequestError('Cannot check out before checking in today');
        }
        if (todayAtt.checkOutTime) {
          throw new ConflictError('Check out already recorded for today');
        }

        // 1. Audit punch event
        await this.repo.recordPunch(
          tenantId,
          companyId,
          employeeId,
          'out',
          input?.source ?? 'web',
          todayAtt.workLocation,
          input?.notes,
          security.deviceMetadata,
          now,
          date,
          tx,
        );

        // 2. Base check-out record
        await this.repo.checkOut(todayAtt.id, checkOutTime, tx);

        // 3. Calculation engine
        const [schedule, policy, onLeave] = await Promise.all([
          this.scheduleProvider.getEmployeeSchedule(tenantId, companyId, employeeId, date),
          this.policyService.getEffectivePolicy(tenantId, companyId, date, employeeId),
          this.scheduleProvider.isEmployeeOnApprovedLeave(tenantId, companyId, employeeId, date),
        ]);

        const calc = this.calculator.calculate({
          date,
          checkInTime: todayAtt.checkInTime,
          checkOutTime,
          schedule,
          policy,
          isOnApprovedLeave: onLeave,
          isToday: true,
        });

        // 4. Update metrics
        const updatedRecord = await this.repo.updateDailyAttendance(
          todayAtt.id,
          {
            workedMinutes: calc.workedMinutes,
            earlyMinutes: calc.earlyMinutes,
            isEarlyExit: calc.isEarlyExit,
            status: calc.status,
            processingState: calc.processingState,
            shiftScheduleRef: calc.shiftScheduleRef,
            calculationMetadata: calc.calculationMetadata,
          },
          tx,
        );

        return {
          updated: updatedRecord,
          earlyExitAlert: calc.isEarlyExit ? { earlyMinutes: calc.earlyMinutes } : null,
        };
      });

      if (earlyExitAlert) {
        await this.alertService.notify(
          tenantId,
          companyId,
          'earlyExit',
          { employeeId },
          {
            title: 'Early exit',
            detail: `checked out at ${checkOutTime}, ${earlyExitAlert.earlyMinutes} minute(s) before the scheduled end.`,
            link: '/hrms/attendance/daily-log',
            type: 'warning',
          },
        );
      }

      return { updated, checkOutTime };
    } catch (err: unknown) {
      if (err instanceof ConflictError || err instanceof BadRequestError) {
        throw err;
      }
      const causeMsg =
        err &&
        typeof err === 'object' &&
        'cause' in err &&
        (err as { cause?: { message?: string } }).cause?.message
          ? String((err as { cause?: { message?: string } }).cause?.message)
          : '';
      const raw = `${err instanceof Error ? err.message : ''} ${causeMsg}`;
      if (
        raw.includes('already recorded') ||
        raw.includes('ER_DUP_ENTRY') ||
        raw.includes('Duplicate entry')
      ) {
        throw new ConflictError('Check out already recorded for today');
      }
      throw err;
    }
  }

  async recordBreakStart(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    breakType: 'tea' | 'lunch' | 'personal' = 'tea',
    notes?: string,
  ) {
    const isLocked = await this.repo.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new BadRequestError(
        `Cannot record break for date ${date}: Period is locked for payroll`,
      );
    }

    const now = new Date();
    const effectiveTz = await attendanceWorkdayService.resolveTimezone(
      tenantId,
      companyId,
      employeeId,
    );
    const startTime = this.getCurrentTimeString(now, effectiveTz);

    const db = getDb();
    const breakPunch = await db.transaction(async (tx) => {
      const todayAtt = await this.repo.getTodayAttendanceForUpdate(
        tenantId,
        companyId,
        employeeId,
        date,
        tx,
      );
      if (!todayAtt || !todayAtt.checkInTime) {
        throw new BadRequestError('Cannot start break before checking in today');
      }
      if (todayAtt.checkOutTime) {
        throw new BadRequestError('Cannot start break after checking out today');
      }

      const punches = await this.repo.getEmployeeDayPunches(
        tenantId,
        companyId,
        employeeId,
        date,
        tx,
      );
      const lastBreakPunch = punches
        .filter((p) => p.punchType === 'break_out' || p.punchType === 'break_in')
        .pop();
      if (lastBreakPunch && lastBreakPunch.punchType === 'break_out') {
        throw new ConflictError('Already on a break');
      }

      return await this.repo.recordPunch(
        tenantId,
        companyId,
        employeeId,
        'break_out',
        'web',
        todayAtt.workLocation,
        notes ? `${breakType}: ${notes}` : breakType,
        undefined,
        now,
        date,
        tx,
      );
    });

    return { breakPunch, breakType, startTime };
  }

  async recordBreakEnd(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    notes?: string,
  ) {
    const isLocked = await this.repo.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new BadRequestError(
        `Cannot record break for date ${date}: Period is locked for payroll`,
      );
    }

    const now = new Date();
    const effectiveTz = await attendanceWorkdayService.resolveTimezone(
      tenantId,
      companyId,
      employeeId,
    );
    const endTime = this.getCurrentTimeString(now, effectiveTz);

    const db = getDb();
    const breakPunch = await db.transaction(async (tx) => {
      const todayAtt = await this.repo.getTodayAttendanceForUpdate(
        tenantId,
        companyId,
        employeeId,
        date,
        tx,
      );
      if (!todayAtt || !todayAtt.checkInTime) {
        throw new BadRequestError('Cannot end break before checking in today');
      }
      if (todayAtt.checkOutTime) {
        throw new BadRequestError('Cannot end break after checking out today');
      }

      const punches = await this.repo.getEmployeeDayPunches(
        tenantId,
        companyId,
        employeeId,
        date,
        tx,
      );
      const lastBreakPunch = punches
        .filter((p) => p.punchType === 'break_out' || p.punchType === 'break_in')
        .pop();
      if (!lastBreakPunch || lastBreakPunch.punchType !== 'break_out') {
        throw new BadRequestError('Not currently on a break');
      }

      return await this.repo.recordPunch(
        tenantId,
        companyId,
        employeeId,
        'break_in',
        'web',
        todayAtt.workLocation,
        notes,
        undefined,
        now,
        date,
        tx,
      );
    });

    return { breakPunch, endTime };
  }

  async getEmployeeDayPunches(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ) {
    return this.repo.getEmployeeDayPunches(tenantId, companyId, employeeId, date);
  }

  async getAttendanceHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    return this.repo.getAttendanceHistory(tenantId, companyId, employeeId, limit);
  }

  async getDailyLog(
    tenantId: string,
    companyId: string,
    filter: DailyLogFilter,
  ): Promise<DailyLogResult> {
    return this.repo.getDailyAttendanceLog(tenantId, companyId, filter);
  }

  async getEmployeeDailyDetail(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<DailyLogEmployeeDetail | null> {
    return this.repo.getEmployeeDailyDetail(tenantId, companyId, employeeId, date);
  }

  async recalculateEmployeeAttendance(
    tenantId: string,
    companyId: string,
    employeeIds: string[],
    date: string,
    adminUserId: string,
  ): Promise<{
    recalculatedCount: number;
    failures: Array<{ employeeId: string; error: string }>;
  }> {
    const isLocked = await this.repo.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new BadRequestError(
        `Cannot recalculate attendance for ${date}: Period is locked for payroll`,
      );
    }

    let recalculatedCount = 0;
    const failures: Array<{ employeeId: string; error: string }> = [];

    for (const empId of employeeIds) {
      try {
        const [schedule, policy, onLeave, punches] = await Promise.all([
          this.scheduleProvider.getEmployeeSchedule(tenantId, companyId, empId, date),
          this.policyService.getEffectivePolicy(tenantId, companyId, date, empId),
          this.scheduleProvider.isEmployeeOnApprovedLeave(tenantId, companyId, empId, date),
          this.repo.getPunches(tenantId, companyId, {
            employeeId: empId,
            date,
            limit: 50,
          }),
        ]);

        // Find earliest IN punch and latest OUT punch
        const inPunches = punches.punches.filter((p) => p.punchType === 'in');
        const outPunches = punches.punches.filter((p) => p.punchType === 'out');

        const toTimeStr = (d?: string | Date | null): string | null => {
          if (!d) return null;
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          if (isNaN(dateObj.getTime())) return null;
          const h = String(dateObj.getUTCHours()).padStart(2, '0');
          const m = String(dateObj.getUTCMinutes()).padStart(2, '0');
          return `${h}:${m}`;
        };

        const firstInTime =
          inPunches.length > 0 ? toTimeStr(inPunches[inPunches.length - 1]?.punchTime) : null;
        const lastOutTime = outPunches.length > 0 ? toTimeStr(outPunches[0]?.punchTime) : null;

        const isToday = date === new Date().toISOString().slice(0, 10);

        const calc = this.calculator.calculate({
          date,
          checkInTime: firstInTime,
          checkOutTime: lastOutTime,
          schedule,
          policy,
          isOnApprovedLeave: onLeave,
          isToday,
        });

        const existing = await this.repo.getTodayAttendance(tenantId, companyId, empId, date);

        const recordData = {
          tenantId,
          companyId,
          employeeId: empId,
          date,
          checkInTime: firstInTime ?? existing?.checkInTime ?? null,
          checkOutTime: lastOutTime ?? existing?.checkOutTime ?? null,
          status: calc.status,
          processingState: calc.processingState,
          workLocation: existing?.workLocation ?? 'office',
          workedMinutes: calc.workedMinutes,
          lateMinutes: calc.lateMinutes,
          earlyMinutes: calc.earlyMinutes,
          isLate: calc.isLate,
          isEarlyExit: calc.isEarlyExit,
          isMissingPunch: calc.isMissingPunch,
          isRegularized: existing?.isRegularized ?? false,
          notes: existing?.notes ?? null,
          shiftScheduleRef: calc.shiftScheduleRef,
          calculationMetadata: {
            ...calc.calculationMetadata,
            recalculatedByUserId: adminUserId,
            recalculatedAt: new Date().toISOString(),
          },
        };

        if (existing) {
          await this.repo.updateDailyAttendance(existing.id, recordData);
        } else {
          await this.repo.upsertDailyAttendance({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...recordData,
          });
        }

        recalculatedCount++;
      } catch (err: unknown) {
        failures.push({
          employeeId: empId,
          error: err instanceof Error ? err.message : 'Calculation error',
        });
      }
    }

    return { recalculatedCount, failures };
  }

  async bulkFinalizeAttendance(
    tenantId: string,
    companyId: string,
    employeeIds: string[],
    date: string,
  ): Promise<{ finalizedCount: number }> {
    return this.repo.bulkFinalizeAttendance(tenantId, companyId, employeeIds, date);
  }

  async getOverview(
    tenantId: string,
    companyId: string,
    date: string,
  ): Promise<AttendanceOverviewKpis> {
    return this.repo.getOverviewData(tenantId, companyId, date);
  }

  async getMonthlySummary(
    tenantId: string,
    companyId: string,
    filter: MonthlySummaryFilter,
  ): Promise<MonthlySummaryEmployeeRow[]> {
    return this.repo.getMonthlyMatrix(
      tenantId,
      companyId,
      filter.year,
      filter.month,
      filter.departmentId,
      filter.search,
    );
  }

  async getPunchLogs(
    tenantId: string,
    companyId: string,
    filter: PunchLogFilter,
  ): Promise<PunchLogResult> {
    return this.repo.getPunches(tenantId, companyId, filter);
  }

  async getPunchDetails(
    tenantId: string,
    companyId: string,
    punchId: string,
  ): Promise<PunchEventDetail> {
    const detail = await this.repo.getPunchById(tenantId, companyId, punchId);
    if (!detail) {
      throw new NotFoundError(`Punch event not found: ${punchId}`);
    }
    return detail;
  }

  async updateInvestigation(
    tenantId: string,
    companyId: string,
    input: UpdatePunchInvestigationInput,
    actorUserId: string,
  ): Promise<PunchLogItem> {
    return this.repo.updatePunchInvestigation(tenantId, companyId, input, actorUserId);
  }

  async retryProcessing(
    tenantId: string,
    companyId: string,
    punchIds: string[],
    actorUserId: string,
  ): Promise<{ success: boolean; retriedCount: number; message: string }> {
    return this.repo.retryPunchProcessing(tenantId, companyId, punchIds, actorUserId);
  }

  async bulkPunchAction(
    tenantId: string,
    companyId: string,
    input: BulkPunchActionInput,
    actorUserId: string,
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    return this.repo.bulkPunchAction(tenantId, companyId, input, actorUserId);
  }

  async exportPunchLogsCsv(
    tenantId: string,
    companyId: string,
    filter: PunchLogFilter,
    selectedIds?: string[],
  ): Promise<{ filename: string; content: string }> {
    const fetchLimit = selectedIds && selectedIds.length > 0 ? selectedIds.length : 1000;
    const result = await this.repo.getPunches(tenantId, companyId, {
      ...filter,
      limit: fetchLimit,
      page: 1,
    });

    let items = result.punches;
    if (selectedIds && selectedIds.length > 0) {
      const idSet = new Set(selectedIds);
      items = items.filter((p) => idSet.has(p.id));
    }

    const headers = [
      'Event ID',
      'Employee Code',
      'Employee Name',
      'Punch Time (UTC)',
      'Punch Type',
      'Source',
      'Device/Location',
      'Workday',
      'Validation Status',
      'Processing State',
      'Linked Attendance ID',
    ];

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      // Prevent spreadsheet formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const item of items) {
      const punchTimeStr =
        typeof item.punchTime === 'string'
          ? item.punchTime
          : item.punchTime
            ? (item.punchTime as Date).toISOString()
            : '';
      const row = [
        item.id,
        item.employeeCode,
        item.employeeName,
        punchTimeStr,
        item.punchType.toUpperCase(),
        item.source,
        item.workLocation || (item.deviceMetadata as { deviceId?: string } | null)?.deviceId || '-',
        item.workday || '-',
        item.validationStatus,
        item.processingState,
        item.linkedAttendanceId || '-',
      ];
      csvRows.push(row.map(escapeCsvValue).join(','));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    return {
      filename: `punch_logs_${todayStr}.csv`,
      content: csvRows.join('\r\n'),
    };
  }

  async getExceptionsList(
    tenantId: string,
    companyId: string,
    filter: ExceptionFilter,
  ): Promise<ExceptionQueryResult> {
    return this.repo.getExceptions(tenantId, companyId, filter);
  }

  async getExceptionDetails(
    tenantId: string,
    companyId: string,
    exceptionId: string,
  ): Promise<ExceptionCaseDetail> {
    const detail = await this.repo.getExceptionById(tenantId, companyId, exceptionId);
    if (!detail) {
      throw new NotFoundError(`Exception case not found: ${exceptionId}`);
    }
    return detail;
  }

  async assignException(
    tenantId: string,
    companyId: string,
    input: AssignExceptionInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    return this.repo.assignException(tenantId, companyId, input, actorUserId);
  }

  async updateExceptionStatus(
    tenantId: string,
    companyId: string,
    input: UpdateExceptionStatusInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    return this.repo.updateExceptionStatus(tenantId, companyId, input, actorUserId);
  }

  async overrideExceptionSeverity(
    tenantId: string,
    companyId: string,
    input: OverrideExceptionSeverityInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    return this.repo.overrideExceptionSeverity(tenantId, companyId, input, actorUserId);
  }

  async verifyAndResolveException(
    tenantId: string,
    companyId: string,
    exceptionId: string,
    resolutionNotes: string,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    return this.repo.verifyAndResolveException(
      tenantId,
      companyId,
      exceptionId,
      resolutionNotes,
      actorUserId,
    );
  }

  async bulkExceptionAction(
    tenantId: string,
    companyId: string,
    input: BulkExceptionActionInput,
    actorUserId: string,
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    return this.repo.bulkExceptionAction(tenantId, companyId, input, actorUserId);
  }

  async exportExceptionsCsv(
    tenantId: string,
    companyId: string,
    filter: ExceptionFilter,
    selectedIds?: string[],
  ): Promise<{ filename: string; content: string }> {
    const data = await this.repo.getExceptions(tenantId, companyId, {
      ...filter,
      limit: 1000,
      page: 1,
    });

    let exportItems = data.items;
    if (selectedIds && selectedIds.length > 0) {
      const idSet = new Set(selectedIds);
      exportItems = exportItems.filter((i) => idSet.has(i.id));
    }

    const headers = [
      'Case ID',
      'Employee Name',
      'Employee Code',
      'Department',
      'Workday',
      'Exception Type',
      'Severity',
      'Source',
      'Status',
      'Assigned To',
      'Detected At',
      'Title',
      'Description',
    ];

    const escapeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(','),
      ...exportItems.map((item) =>
        [
          item.id,
          item.employeeName,
          item.employeeCode,
          item.departmentName || '',
          item.workday || '',
          item.exceptionType,
          item.severity,
          item.source,
          item.status,
          item.assignedTo || 'Unassigned',
          new Date(item.detectedAt).toISOString(),
          item.title,
          item.description || '',
        ]
          .map(escapeCell)
          .join(','),
      ),
    ];

    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      filename: `attendance-exceptions-${todayStr}.csv`,
      content: csvRows.join('\r\n'),
    };
  }

  async getExceptions(
    tenantId: string,
    companyId: string,
    filter: AttendanceExceptionFilter,
  ): Promise<AttendanceExceptionItem[]> {
    return this.repo.getAttendanceExceptions(tenantId, companyId, filter);
  }

  async getRegularizationRequests(
    tenantId: string,
    companyId: string,
    filter: RegularizationFilter,
  ): Promise<RegularizationItem[]> {
    return this.repo.getRegularizationRequests(tenantId, companyId, filter);
  }

  async manualCorrection(
    tenantId: string,
    companyId: string,
    input: ManualCorrectionInput,
    adminUserId: string,
    actor?: ManualEntryActor,
  ): Promise<EmployeeAttendance> {
    // Company manual-entry settings apply to interactive admin entries only.
    const { reasonRequired } = actor
      ? await this.manualEntryService.assertAllowed(tenantId, companyId, input, actor)
      : { reasonRequired: true };
    if (!input.employeeId || !input.date || (reasonRequired && !input.reason?.trim())) {
      throw new BadRequestError(
        reasonRequired
          ? 'Employee ID, date, and reason are required for correction'
          : 'Employee ID and date are required for correction',
      );
    }
    const reason = input.reason?.trim() || 'Manual correction';

    const isLocked = await this.repo.checkDateInLockedPeriod(
      tenantId,
      companyId,
      input.date,
      input.date,
    );
    if (isLocked) {
      throw new BadRequestError(
        `Cannot modify attendance for date ${input.date}: Period is locked for payroll`,
      );
    }

    // 1. Audit punch events for correction
    if (input.checkInTime) {
      await this.repo.recordPunch(
        tenantId,
        companyId,
        input.employeeId,
        'in',
        'manual',
        input.workLocation ?? 'office',
        `Admin correction by ${adminUserId}: ${reason}`,
      );
    }
    if (input.checkOutTime) {
      await this.repo.recordPunch(
        tenantId,
        companyId,
        input.employeeId,
        'out',
        'manual',
        input.workLocation ?? 'office',
        `Admin correction by ${adminUserId}: ${reason}`,
      );
    }

    // 2. Calculate new metrics
    const [schedule, policy, onLeave] = await Promise.all([
      this.scheduleProvider.getEmployeeSchedule(tenantId, companyId, input.employeeId, input.date),
      this.policyService.getEffectivePolicy(tenantId, companyId, input.date, input.employeeId),
      this.scheduleProvider.isEmployeeOnApprovedLeave(
        tenantId,
        companyId,
        input.employeeId,
        input.date,
      ),
    ]);

    const calc = this.calculator.calculate({
      date: input.date,
      checkInTime: input.checkInTime ?? null,
      checkOutTime: input.checkOutTime ?? null,
      schedule,
      policy,
      isOnApprovedLeave: onLeave,
      isToday: false,
    });

    const existing = await this.repo.getTodayAttendance(
      tenantId,
      companyId,
      input.employeeId,
      input.date,
    );

    const recordData = {
      tenantId,
      companyId,
      employeeId: input.employeeId,
      date: input.date,
      checkInTime: input.checkInTime ?? existing?.checkInTime ?? null,
      checkOutTime: input.checkOutTime ?? existing?.checkOutTime ?? null,
      status: input.status ?? (calc.status === 'incomplete' ? 'present' : calc.status),
      processingState: 'finalized' as const,
      workLocation: input.workLocation ?? existing?.workLocation ?? 'office',
      workedMinutes: calc.workedMinutes,
      lateMinutes: calc.lateMinutes,
      earlyMinutes: calc.earlyMinutes,
      isLate: calc.isLate,
      isEarlyExit: calc.isEarlyExit,
      isMissingPunch: false,
      isRegularized: true,
      notes: input.notes ?? `Corrected: ${reason}`,
      shiftScheduleRef: calc.shiftScheduleRef,
      calculationMetadata: {
        ...calc.calculationMetadata,
        correctedByUserId: adminUserId,
        correctionReason: reason,
      },
    };

    if (existing) {
      return this.repo.updateDailyAttendance(existing.id, recordData);
    }

    return this.repo.upsertDailyAttendance({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...recordData,
    });
  }

  async reviewRegularization(
    tenantId: string,
    companyId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    reviewerNotes: string,
    reviewerUserId: string,
  ) {
    const request = await this.repo.getRegularizationRequestById(tenantId, companyId, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }
    if (request.status !== 'pending') {
      throw new ConflictError('This regularization request has already been reviewed');
    }

    if (status === 'approved') {
      const details = (request.details ?? {}) as Record<string, unknown>;
      const targetDate = typeof details.date === 'string' ? details.date : '';

      const isLocked = await this.repo.checkDateInLockedPeriod(
        tenantId,
        companyId,
        targetDate,
        targetDate,
      );
      if (isLocked) {
        throw new BadRequestError(
          `Cannot approve regularization for date ${targetDate}: Period is locked for payroll`,
        );
      }

      const checkIn =
        typeof details.checkInTime === 'string'
          ? details.checkInTime
          : typeof details.requestedCheckIn === 'string'
            ? details.requestedCheckIn
            : undefined;
      const checkOut =
        typeof details.checkOutTime === 'string'
          ? details.checkOutTime
          : typeof details.requestedCheckOut === 'string'
            ? details.requestedCheckOut
            : undefined;

      // Apply correction to attendance record
      await this.manualCorrection(
        tenantId,
        companyId,
        {
          employeeId: request.employeeId,
          date: targetDate,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          reason: `Regularization approved: ${details.reason ?? ''}`,
        },
        reviewerUserId,
      );
    }

    return this.repo.reviewRegularizationRequest(
      tenantId,
      companyId,
      requestId,
      status,
      reviewerNotes,
      reviewerUserId,
    );
  }

  async exportMonthlySummaryCsv(
    tenantId: string,
    companyId: string,
    filter: MonthlySummaryFilter,
  ): Promise<string> {
    const rows = await this.getMonthlySummary(tenantId, companyId, filter);
    const lastDay = new Date(filter.year, filter.month, 0).getDate();

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      ...Array.from({ length: lastDay }, (_, i) => `Day ${i + 1}`),
      'Total Present',
      'Total Absent',
      'Total Half-Day',
      'Total Leave',
      'Total Hours Worked',
    ];

    const lines = [headers.join(',')];

    for (const r of rows) {
      const dayValues = Array.from({ length: lastDay }, (_, i) => {
        const dayStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const day = r.days[dayStr];
        return day ? day.status : '-';
      });

      const totalHours = Math.round((r.totals.totalWorkedMinutes / 60) * 10) / 10;
      const line = [
        `"${r.employeeCode}"`,
        `"${r.employeeName}"`,
        `"${r.departmentName ?? ''}"`,
        `"${r.designationName ?? ''}"`,
        ...dayValues,
        r.totals.present,
        r.totals.absent,
        r.totals.halfDay,
        r.totals.onLeave,
        totalHours,
      ];
      lines.push(line.join(','));
    }

    return lines.join('\n');
  }

  async exportDailyLogCsv(
    tenantId: string,
    companyId: string,
    filter: DailyLogFilter,
  ): Promise<string> {
    const result = await this.getDailyLog(tenantId, companyId, {
      ...filter,
      page: 1,
      limit: 5000,
    });
    const rows = result.items;

    const sanitizeCell = (val: unknown): string => {
      const s = String(val ?? '');
      if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
        return `"'${s.replace(/"/g, '""')}"`;
      }
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Date',
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Shift',
      'Status',
      'Check In',
      'Check Out',
      'Worked Hours',
      'Late (Mins)',
      'Early Exit (Mins)',
      'Review State',
      'Indicators',
      'Work Location',
      'Regularized',
    ];

    const lines = [headers.join(',')];

    for (const r of rows) {
      const workedHours =
        r.workedMinutes > 0 ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '-';
      const line = [
        sanitizeCell(r.date),
        sanitizeCell(r.employeeCode),
        sanitizeCell(`${r.firstName} ${r.lastName ?? ''}`.trim()),
        sanitizeCell(r.departmentName ?? '—'),
        sanitizeCell(r.designationName ?? '—'),
        sanitizeCell(r.shiftScheduleRef ?? 'General 09:00 - 18:00'),
        sanitizeCell(r.status),
        sanitizeCell(r.checkInTime ?? '—'),
        sanitizeCell(r.checkOutTime ?? '—'),
        sanitizeCell(workedHours),
        sanitizeCell(r.lateMinutes),
        sanitizeCell(r.earlyMinutes),
        sanitizeCell(r.processingState ?? 'finalized'),
        sanitizeCell((r.indicators ?? []).join('; ') || 'None'),
        sanitizeCell(r.workLocation),
        sanitizeCell(r.isRegularized ? 'Yes' : 'No'),
      ];
      lines.push(line.join(','));
    }

    return lines.join('\n');
  }
}

export const attendanceService = new AttendanceService();
