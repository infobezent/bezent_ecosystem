import { createHash } from 'node:crypto';
import {
  attendanceMonthlySummaryRepository,
  type AttendanceMonthlySummaryRepository,
} from '../repository/attendanceMonthlySummary.repository.js';
import type {
  MonthlySummaryDailyRecord,
  AttendanceCalculationState,
  AttendanceReviewState,
} from '../types/attendanceMonthlySummary.types.js';
import type { NewAttendanceMonthlySummary } from '../../../../db/schema.js';

export interface CalculatedEmployeeMonth {
  summaryData: NewAttendanceMonthlySummary;
  dailyRecords: MonthlySummaryDailyRecord[];
  isStaleReview: boolean;
}

export class AttendanceMonthlySummaryEngineService {
  constructor(
    private readonly repo: AttendanceMonthlySummaryRepository = attendanceMonthlySummaryRepository,
  ) {}

  /**
   * Deterministically calculates monthly attendance summary for an employee-month
   */
  async calculateEmployeeMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    month: string, // 'YYYY-MM'
    options?: {
      timezone?: string;
      actorUserId?: string;
    },
  ): Promise<CalculatedEmployeeMonth> {
    const tz = options?.timezone ?? 'UTC';
    const parts = month.split('-');
    const year = Number.parseInt(parts[0] || '2026', 10);
    const monthNum = Number.parseInt(parts[1] || '1', 10);

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Fetch raw domain sources
    const sources = await this.repo.getDailySourcesForEmployeeMonth(
      tenantId,
      companyId,
      employeeId,
      startDate,
      endDate,
    );

    // Get employee details to check joining/exit date
    const employeesList = await this.repo.getActiveEmployeesForMonth(tenantId, companyId, month);
    const employee = employeesList.find((e) => e.id === employeeId);
    const joiningDate = employee?.joiningDate ?? '1970-01-01';

    // Current date in ISO YYYY-MM-DD
    const todayStr = new Date().toISOString().slice(0, 10);

    // Working days configured in schedule (default Mon-Fri)
    const workingDaysConfig: string[] = Array.isArray(sources.schedule?.workingDays)
      ? (sources.schedule?.workingDays as string[])
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Schedule shift times
    const shiftStartTime = sources.schedule?.startTime ?? '09:00';
    const shiftEndTime = sources.schedule?.endTime ?? '18:00';
    const standardDailyScheduledMinutes = 480; // 8 hours

    // 2. Iterate each day of the month
    const dailyRecords: MonthlySummaryDailyRecord[] = [];

    let scheduledDays = 0;
    let scheduledMinutes = 0;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let onDutyDays = 0;
    let weeklyOffDays = 0;
    const holidayDays = 0;
    let actualWorkedMinutes = 0;
    let policyCreditedMinutes = 0;
    let lateOccurrences = 0;
    let totalLateMinutes = 0;
    let earlyExitOccurrences = 0;
    let totalEarlyExitMinutes = 0;
    let unresolvedExceptions = 0;
    let pendingCorrections = 0;
    let processingIssues = 0;

    // Map daily records by date for fast lookup
    const dailyByDate = new Map(sources.dailyRecords.map((r) => [r.date, r]));
    const odByDate = new Map(sources.odWorkdays.map((r) => [r.workday, r]));
    const exceptionsByDate = new Map<string, typeof sources.exceptions>();
    for (const ex of sources.exceptions) {
      if (!ex.workday) continue;
      const arr = exceptionsByDate.get(ex.workday) ?? [];
      arr.push(ex);
      exceptionsByDate.set(ex.workday, arr);
    }
    const regularizationsByDate = new Map<string, typeof sources.regularizations>();
    for (const reg of sources.regularizations) {
      const arr = regularizationsByDate.get(reg.workday) ?? [];
      arr.push(reg);
      regularizationsByDate.set(reg.workday, arr);
    }

    // Check period lock
    const isPeriodLocked = sources.periods.some((p) => p.status === 'locked');
    const periodLockId = sources.periods.find((p) => p.status === 'locked')?.id ?? null;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, monthNum - 1, day);
      const dayOfWeekName = dayDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      // Check joining date boundary
      if (dateStr < joiningDate) {
        // Not employed yet, do not schedule
        continue;
      }

      const isFuture = dateStr > todayStr;
      const isWeeklyOff = !workingDaysConfig.includes(dayOfWeekName);

      // Sources for this day
      const dailyAtt = dailyByDate.get(dateStr);
      const odWorkday = odByDate.get(dateStr);
      const dayExceptions = exceptionsByDate.get(dateStr) ?? [];
      const dayRegularizations = regularizationsByDate.get(dateStr) ?? [];

      // Check leave coverage
      const leaveRequest = sources.leaveRequests.find(
        (l) => l.startDate <= dateStr && l.endDate >= dateStr,
      );

      // Count open exceptions
      const openExceptions = dayExceptions.filter(
        (e) => e.status !== 'resolved' && e.status !== 'closed',
      );
      unresolvedExceptions += openExceptions.length;

      // Count pending regularizations
      const pendingRegs = dayRegularizations.filter(
        (r) => r.approvalStatus === 'submitted' || r.approvalStatus === 'under_review',
      );
      pendingCorrections += pendingRegs.length;

      // Check OD processing issue
      if (odWorkday && (odWorkday.processingStatus === 'failed' || odWorkday.processingStatus === 'blocked')) {
        processingIssues++;
      }

      if (isWeeklyOff) {
        weeklyOffDays++;
        dailyRecords.push({
          date: dateStr,
          dayOfWeek: dayOfWeekName,
          shiftId: sources.schedule?.workSchedule ?? undefined,
          shiftName: sources.schedule?.workSchedule ?? 'Standard',
          scheduleStartTime: shiftStartTime,
          scheduleEndTime: shiftEndTime,
          scheduledMinutes: 0,
          classification: 'weekly_off',
          actualWorkedMinutes: dailyAtt?.workedMinutes ?? 0,
          policyCreditedMinutes: 0,
          onDutyMinutes: 0,
          isLate: false,
          lateMinutes: 0,
          isEarlyExit: false,
          earlyExitMinutes: 0,
          hasException: openExceptions.length > 0,
          exceptionTypes: openExceptions.map((e) => e.exceptionType),
          hasPendingRegularization: pendingRegs.length > 0,
          isLocked: isPeriodLocked,
          isFuture,
          rawAttendanceId: dailyAtt?.id,
        });
        continue;
      }

      // Scheduled workday
      scheduledDays++;
      scheduledMinutes += standardDailyScheduledMinutes;

      if (isFuture) {
        // Upcoming day - must NOT be marked absent
        dailyRecords.push({
          date: dateStr,
          dayOfWeek: dayOfWeekName,
          shiftId: sources.schedule?.workSchedule ?? undefined,
          shiftName: sources.schedule?.workSchedule ?? 'Standard',
          scheduleStartTime: shiftStartTime,
          scheduleEndTime: shiftEndTime,
          scheduledMinutes: standardDailyScheduledMinutes,
          classification: 'pending',
          actualWorkedMinutes: 0,
          policyCreditedMinutes: 0,
          onDutyMinutes: 0,
          isLate: false,
          lateMinutes: 0,
          isEarlyExit: false,
          earlyExitMinutes: 0,
          hasException: false,
          hasPendingRegularization: false,
          isLocked: isPeriodLocked,
          isFuture: true,
        });
        continue;
      }

      // Past or current workday
      const rawWorkedMins = dailyAtt?.workedMinutes ?? 0;
      actualWorkedMinutes += rawWorkedMins;

      // On-duty coverage
      let dayOdMins = 0;
      let dayOdPortion = 0;
      if (odWorkday && odWorkday.processingStatus === 'applied') {
        if (odWorkday.durationType === 'half_day') {
          dayOdPortion = 0.5;
          dayOdMins = odWorkday.creditedWorkedMinutes || 240;
        } else {
          dayOdPortion = 1.0;
          dayOdMins = odWorkday.creditedWorkedMinutes || 480;
        }
      }

      // Leave coverage
      let dayLeavePortion = 0;
      let dayLeaveMins = 0;
      if (leaveRequest) {
        // Check if half day leave or full day
        // Default to full day (1.0) unless specified
        dayLeavePortion = 1.0;
        dayLeaveMins = standardDailyScheduledMinutes;
      }

      // Attendance classification & non-overlapping day equivalents
      let dayClassification: 'present' | 'absent' | 'half_day' | 'on_leave' | 'on_duty' = 'absent';

      if (dayOdPortion >= 1.0) {
        // Full day on-duty
        dayClassification = 'on_duty';
        onDutyDays += 1.0;
        presentDays += 1.0; // credited as present equivalent
      } else if (rawWorkedMins >= 480 || dailyAtt?.status === 'present') {
        // Full day present
        dayClassification = 'present';
        presentDays += 1.0;
      } else if (rawWorkedMins >= 240 || dailyAtt?.status === 'half_day') {
        // Half day present
        if (dayOdPortion > 0) {
          // Half day OD + half day present = 1.0 day equivalent
          dayClassification = 'present';
          presentDays += 1.0;
          onDutyDays += 0.5;
        } else if (dayLeavePortion > 0) {
          // Half day leave + half day present = 1.0 day equivalent
          dayClassification = 'half_day';
          presentDays += 0.5;
          leaveDays += 0.5;
        } else {
          // Half day present, half day absent
          dayClassification = 'half_day';
          presentDays += 0.5;
          absentDays += 0.5;
        }
      } else if (dayLeavePortion >= 1.0) {
        // Full day leave
        dayClassification = 'on_leave';
        leaveDays += 1.0;
      } else {
        // Zero or insufficient hours without full OD or full leave
        if (dayOdPortion > 0) {
          dayClassification = 'on_duty';
          onDutyDays += dayOdPortion;
          presentDays += dayOdPortion;
          absentDays += 1.0 - dayOdPortion;
        } else if (dayLeavePortion > 0) {
          dayClassification = 'on_leave';
          leaveDays += dayLeavePortion;
          absentDays += 1.0 - dayLeavePortion;
        } else {
          dayClassification = 'absent';
          absentDays += 1.0;
        }
      }

      // Policy credited minutes = raw worked + credited OD minutes
      const dayCreditedMins = Math.min(
        standardDailyScheduledMinutes,
        rawWorkedMins + dayOdMins,
      );
      policyCreditedMinutes += dayCreditedMins;

      // Late & Early exit counts
      const isLate = (dailyAtt?.lateMinutes ?? 0) > 0;
      if (isLate) {
        lateOccurrences++;
        totalLateMinutes += dailyAtt!.lateMinutes;
      }
      const isEarlyExit = (dailyAtt?.earlyMinutes ?? 0) > 0;
      if (isEarlyExit) {
        earlyExitOccurrences++;
        totalEarlyExitMinutes += dailyAtt!.earlyMinutes;
      }

      dailyRecords.push({
        date: dateStr,
        dayOfWeek: dayOfWeekName,
        shiftId: sources.schedule?.workSchedule ?? undefined,
        shiftName: sources.schedule?.workSchedule ?? 'Standard',
        scheduleStartTime: shiftStartTime,
        scheduleEndTime: shiftEndTime,
        scheduledMinutes: standardDailyScheduledMinutes,
        classification: dayClassification,
        actualWorkedMinutes: rawWorkedMins,
        policyCreditedMinutes: dayCreditedMins,
        onDutyMinutes: dayOdMins,
        onDutyStatus: odWorkday?.processingStatus,
        leaveType: leaveRequest?.leaveType ?? undefined,
        leaveMinutes: dayLeaveMins,
        isLate,
        lateMinutes: dailyAtt?.lateMinutes ?? 0,
        isEarlyExit,
        earlyExitMinutes: dailyAtt?.earlyMinutes ?? 0,
        hasException: openExceptions.length > 0,
        exceptionTypes: openExceptions.map((e) => e.exceptionType),
        hasPendingRegularization: pendingRegs.length > 0,
        isLocked: isPeriodLocked,
        isFuture: false,
        rawAttendanceId: dailyAtt?.id,
      });
    }

    // 3. Generate deterministic fingerprint
    const fingerprintPayload = JSON.stringify({
      employeeId,
      month,
      scheduledDays,
      scheduledMinutes,
      presentDays: presentDays.toFixed(2),
      absentDays: absentDays.toFixed(2),
      leaveDays: leaveDays.toFixed(2),
      onDutyDays: onDutyDays.toFixed(2),
      weeklyOffDays,
      holidayDays,
      actualWorkedMinutes,
      policyCreditedMinutes,
      unresolvedExceptions,
      pendingCorrections,
      processingIssues,
      dailyHashes: dailyRecords.map((d) => `${d.date}:${d.classification}:${d.actualWorkedMinutes}:${d.onDutyMinutes}`),
    });

    const sourceFingerprint = createHash('sha256').update(fingerprintPayload).digest('hex');

    // 4. Retrieve existing summary if present to manage version and staleness
    const existing = await this.repo.getSummaryByEmployeeMonth(
      tenantId,
      companyId,
      employeeId,
      month,
    );

    let version = existing?.version ?? 1;
    let reviewState: AttendanceReviewState = existing?.reviewState ?? 'not_reviewed';
    let isStaleReview = false;

    if (existing) {
      if (existing.sourceFingerprint !== sourceFingerprint) {
        // Source data has changed since last calculation!
        if (existing.reviewState === 'reviewed') {
          // Stale sign-off detected!
          version = existing.version + 1;
          reviewState = 'reopened';
          isStaleReview = true;
        } else {
          version = existing.version + 1;
        }
      }
    }

    const summaryId = existing?.id ?? `att_ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const summaryData: NewAttendanceMonthlySummary = {
      id: summaryId,
      tenantId,
      companyId,
      employeeId,
      month,
      timezone: tz,
      scheduledDays,
      scheduledMinutes,
      presentDays: presentDays.toFixed(2),
      absentDays: absentDays.toFixed(2),
      leaveDays: leaveDays.toFixed(2),
      onDutyDays: onDutyDays.toFixed(2),
      weeklyOffDays,
      holidayDays,
      actualWorkedMinutes,
      policyCreditedMinutes,
      lateOccurrences,
      lateMinutes: totalLateMinutes,
      earlyExitOccurrences,
      earlyExitMinutes: totalEarlyExitMinutes,
      unresolvedExceptions,
      pendingCorrections,
      processingIssues,
      calculationState: 'calculated' as AttendanceCalculationState,
      reviewState,
      payrollReadiness: 'needs_review', // Evaluated by PayrollReadinessService
      isLocked: isPeriodLocked,
      periodLockId,
      version,
      sourceFingerprint,
      assignedReviewerId: existing?.assignedReviewerId ?? null,
      assignedAt: existing?.assignedAt ?? null,
      reviewedByUserId: existing?.reviewedByUserId ?? null,
      reviewedAt: existing?.reviewedAt ?? null,
      reviewedVersion: existing?.reviewedVersion ?? null,
      reviewNotes: existing?.reviewNotes ?? null,
      correctionRequestNotes: existing?.correctionRequestNotes ?? null,
      reopenReason: isStaleReview ? 'Summary invalidated due to daily attendance source updates' : existing?.reopenReason ?? null,
      lastCalculatedAt: new Date(),
    };

    return {
      summaryData,
      dailyRecords,
      isStaleReview,
    };
  }
}

export const attendanceMonthlySummaryEngineService =
  new AttendanceMonthlySummaryEngineService();
