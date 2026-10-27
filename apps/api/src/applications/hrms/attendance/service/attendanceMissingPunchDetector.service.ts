import { and, eq, lte, isNotNull, isNull } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendanceExceptions,
  attendanceExceptionAudits,
  companies,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import {
  attendancePolicyService,
  type AttendancePolicyService,
} from './attendancePolicy.service.js';
import {
  attendanceCalculationService,
  type AttendanceCalculationService,
} from './attendanceCalculation.service.js';
import {
  defaultShiftScheduleProvider,
  type DefaultShiftScheduleProvider,
} from './shiftSchedule.provider.js';
import { attendanceAlertService, type AttendanceAlertService } from './attendanceAlert.service.js';

export const MISSING_PUNCH_INTERVAL_MS = 30 * 60 * 1000; // Sweep every 30 minutes

export interface MissingPunchSweepResult {
  detectedCount: number;
  updatedAttendanceCount: number;
  alertCount: number;
  companiesEvaluated: number;
}

export class AttendanceMissingPunchDetectorService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly policyService: AttendancePolicyService = attendancePolicyService,
    private readonly calculator: AttendanceCalculationService = attendanceCalculationService,
    private readonly scheduleProvider: DefaultShiftScheduleProvider = defaultShiftScheduleProvider,
    private readonly alertService: AttendanceAlertService = attendanceAlertService,
  ) {}

  /**
   * Sweeps across tenants and companies to detect and reconcile missing punches.
   * Identifies attendance records where check-in occurred but check-out is missing
   * on closed/past workdays. Applies company missingPunchPolicy, creates exception
   * audit records, and emits in-app notifications.
   */
  async runSweep(
    options: {
      tenantId?: string;
      companyId?: string;
      targetDate?: string;
      now?: Date;
    } = {},
  ): Promise<MissingPunchSweepResult> {
    const db = getDb();
    const now = options.now ?? new Date();

    // 1. Identify target companies
    let targetCompanies: Array<{ id: string; tenantId: string; timeZone?: string | null }> = [];
    if (options.companyId) {
      const rows = await db
        .select({ id: companies.id, tenantId: companies.tenantId, timeZone: companies.timeZone })
        .from(companies)
        .where(eq(companies.id, options.companyId));
      targetCompanies = rows;
    } else {
      targetCompanies = await db
        .select({ id: companies.id, tenantId: companies.tenantId, timeZone: companies.timeZone })
        .from(companies);
    }

    let detectedCount = 0;
    let updatedAttendanceCount = 0;
    let alertCount = 0;
    let companiesEvaluated = 0;

    for (const comp of targetCompanies) {
      if (options.tenantId && comp.tenantId !== options.tenantId) continue;
      companiesEvaluated++;

      const tenantId = comp.tenantId;
      const companyId = comp.id;

      // Determine today's workday in company's local timezone
      const timeZone = comp.timeZone || 'Asia/Kolkata';
      let localDateStr: string;
      try {
        localDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);
      } catch {
        localDateStr = now.toISOString().slice(0, 10);
      }

      // Max evaluation date: defaults to yesterday so active today's punches aren't flagged prematurely
      const cutoffDate = options.targetDate ?? localDateStr;

      // Find open daily attendance records where check-in exists, check-out is null, and not yet flagged
      const recordsToEvaluate = await db
        .select({
          id: employeeAttendance.id,
          employeeId: employeeAttendance.employeeId,
          date: employeeAttendance.date,
          checkInTime: employeeAttendance.checkInTime,
          checkOutTime: employeeAttendance.checkOutTime,
          status: employeeAttendance.status,
          isMissingPunch: employeeAttendance.isMissingPunch,
          isRegularized: employeeAttendance.isRegularized,
        })
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            isNotNull(employeeAttendance.checkInTime),
            isNull(employeeAttendance.checkOutTime),
            eq(employeeAttendance.isRegularized, false),
            options.targetDate
              ? eq(employeeAttendance.date, options.targetDate)
              : lte(employeeAttendance.date, cutoffDate),
          ),
        )
        .limit(200);

      for (const rec of recordsToEvaluate) {
        // Skip records for today unless targetDate was explicitly specified
        if (!options.targetDate && rec.date >= localDateStr) {
          continue;
        }

        const [schedule, policy, onLeave] = await Promise.all([
          this.scheduleProvider.getEmployeeSchedule(tenantId, companyId, rec.employeeId, rec.date),
          this.policyService.getEffectivePolicy(tenantId, companyId, rec.date, rec.employeeId),
          this.scheduleProvider.isEmployeeOnApprovedLeave(
            tenantId,
            companyId,
            rec.employeeId,
            rec.date,
          ),
        ]);

        const calc = this.calculator.calculate({
          date: rec.date,
          checkInTime: rec.checkInTime,
          checkOutTime: null,
          schedule,
          policy,
          isOnApprovedLeave: onLeave,
          isToday: false, // Evaluation after workday has concluded
        });

        // 1. Update daily attendance record with calculated missing punch status
        await db
          .update(employeeAttendance)
          .set({
            isMissingPunch: true,
            status: calc.status,
            processingState: calc.processingState,
            workedMinutes: calc.workedMinutes,
            updatedAt: new Date(),
          })
          .where(eq(employeeAttendance.id, rec.id));
        updatedAttendanceCount++;

        // 2. Deduplicated exception recording
        const existingExc = await db
          .select({ id: attendanceExceptions.id })
          .from(attendanceExceptions)
          .where(
            and(
              eq(attendanceExceptions.tenantId, tenantId),
              eq(attendanceExceptions.companyId, companyId),
              eq(attendanceExceptions.sourceRecordType, 'daily_attendance'),
              eq(attendanceExceptions.sourceRecordId, rec.id),
              eq(attendanceExceptions.exceptionType, 'missing_out'),
            ),
          )
          .limit(1);

        if (existingExc.length === 0) {
          const excId = generateSurrogateId('aexc');
          await db.insert(attendanceExceptions).values({
            id: excId,
            tenantId,
            companyId,
            employeeId: rec.employeeId,
            workday: rec.date,
            exceptionType: 'missing_out',
            severity: 'high',
            source: 'engine',
            sourceRecordType: 'daily_attendance',
            sourceRecordId: rec.id,
            title: 'Missing Check-Out Punch',
            description: `No check-out punch recorded for workday ${rec.date} (Policy: ${policy.missingPunchPolicy || 'flag_exception'})`,
            status: 'open',
            detectedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(attendanceExceptionAudits).values({
            id: generateSurrogateId('aexca'),
            tenantId,
            companyId,
            exceptionId: excId,
            action: 'detected',
            actorUserId: 'system:missing-punch-detector',
            oldState: null,
            newState: { status: 'open', severity: 'high', exceptionType: 'missing_out' },
            notes: 'Missing punch detected by automated end-of-day attendance sweeper',
            createdAt: new Date(),
          });
          detectedCount++;
        }

        // 3. Emit notification alert via attendanceAlertService
        const notified = await this.alertService.notify(
          tenantId,
          companyId,
          'missingPunch',
          { employeeId: rec.employeeId },
          {
            title: 'Missing Check-Out Punch',
            detail: `did not record a check-out punch on ${rec.date}. Please submit a regularization request.`,
            link: '/ess/attendance',
            type: 'warning',
          },
        );
        if (notified > 0) alertCount += notified;
      }
    }

    return {
      detectedCount,
      updatedAttendanceCount,
      alertCount,
      companiesEvaluated,
    };
  }

  start(intervalMs: number = MISSING_PUNCH_INTERVAL_MS): void {
    if (this.timer) return;
    const tick = () =>
      void this.runSweep().catch((err: unknown) => {
        console.error('[attendance] missing punch sweep failed:', err);
      });
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref();
    tick(); // Execute initial sweep on startup
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const attendanceMissingPunchDetectorService = new AttendanceMissingPunchDetectorService();
