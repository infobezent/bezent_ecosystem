import { MilestoneRepository } from '../repository/milestone.repository.js';
import type { WorkingHoursSummary } from '../types/milestone.types.js';

export class WorkingHoursService {
  constructor(private readonly repo = new MilestoneRepository()) {}

  /**
   * Calculates deterministic, auditable lifetime working hours for an employee
   * combining verified attendance punch records and approved timesheets,
   * with strict deduplication to prevent double-counting overlapping work periods.
   */
  async calculateWorkingHours(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<WorkingHoursSummary> {
    const [attendanceRecords, approvedTimesheets] = await Promise.all([
      this.repo.getEmployeeAttendanceRecords(tenantId, companyId, employeeId),
      this.repo.getEmployeeApprovedTimesheets(tenantId, companyId, employeeId),
    ]);

    // 1. Process Attendance records
    // Map date -> { attendanceMinutes, isVerified, status, processingState, isRegularized }
    const attendanceByDate = new Map<
      string,
      {
        workedMinutes: number;
        isVerified: boolean;
        status: string;
        processingState: string;
        isRegularized: boolean;
        checkInTime: string | null;
        checkOutTime: string | null;
      }
    >();

    let totalAttendanceMinutes = 0;
    const verifiedAttendanceDates = new Set<string>();

    for (const rec of attendanceRecords) {
      const recDate = rec.date || new Date().toISOString().slice(0, 10);
      // Incomplete records or missing punches without approved regularization must not invent hours
      const isMissingPunch = Boolean(rec.isMissingPunch && !rec.isRegularized);
      const isAbsentOrLeaveWithoutHours =
        ['absent', 'on_leave', 'holiday', 'incomplete'].includes(rec.status) &&
        (rec.workedMinutes ?? 0) <= 0;

      const state = rec.processingState || 'finalized';
      const isVerified =
        !isMissingPunch &&
        !isAbsentOrLeaveWithoutHours &&
        (rec.workedMinutes ?? 0) > 0 &&
        ['provisional', 'finalized', 'locked'].includes(state);

      const minutes = isVerified ? Math.max(0, rec.workedMinutes ?? 0) : 0;

      attendanceByDate.set(recDate, {
        workedMinutes: minutes,
        isVerified,
        status: rec.status,
        processingState: rec.processingState,
        isRegularized: Boolean(rec.isRegularized),
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
      });

      if (isVerified && minutes > 0) {
        totalAttendanceMinutes += minutes;
        verifiedAttendanceDates.add(recDate);
      }
    }

    // 2. Process Approved Timesheets
    // Map date -> total approved hours on that date
    const timesheetsByDate = new Map<string, number>();
    let totalTimesheetApprovedHours = 0;

    for (const ts of approvedTimesheets) {
      const tsDate = ts.date || new Date().toISOString().slice(0, 10);
      const h = Number(ts.hours) || 0;
      if (h > 0) {
        totalTimesheetApprovedHours += h;
        timesheetsByDate.set(tsDate, (timesheetsByDate.get(tsDate) ?? 0) + h);
      }
    }

    // 3. De-duplication: attendance is the authoritative record of daily working hours.
    // When both attendance and timesheets exist on the same date, timesheets are considered
    // a project task breakdown of the same workday and are NOT double-counted.
    let timesheetDedupedHours = 0;
    let preventedDuplicateHours = 0;

    const allDatesSet = new Set<string>([...attendanceByDate.keys(), ...timesheetsByDate.keys()]);
    const sortedDates = Array.from(allDatesSet).sort().reverse();

    // Yearly & monthly aggregations
    const yearlyMap = new Map<
      string,
      { attendanceHours: number; timesheetHours: number; totalHours: number; workdays: Set<string> }
    >();
    const monthlyMap = new Map<
      string,
      { attendanceHours: number; timesheetHours: number; totalHours: number; workdays: Set<string> }
    >();

    const dailyBreakdown: WorkingHoursSummary['recentDailyBreakdown'] = [];

    for (const date of sortedDates) {
      const att = attendanceByDate.get(date);
      const tsHours = timesheetsByDate.get(date) ?? 0;

      const attMinutes = att?.isVerified ? att.workedMinutes : 0;
      const attHours = Number((attMinutes / 60).toFixed(2));

      let effectiveDailyHours = 0;
      let isDuplicatePrevented = false;
      let source: 'attendance' | 'timesheet' | 'both' = 'attendance';

      if (att?.isVerified && attMinutes > 0 && tsHours > 0) {
        // Both exist: attendance is primary, timesheet is duplicate
        source = 'both';
        effectiveDailyHours = attHours;
        isDuplicatePrevented = true;
        preventedDuplicateHours += tsHours;
      } else if (att?.isVerified && attMinutes > 0) {
        // Attendance only
        source = 'attendance';
        effectiveDailyHours = attHours;
      } else if (tsHours > 0) {
        // Timesheet only (e.g. remote work or field task without punch)
        source = 'timesheet';
        effectiveDailyHours = tsHours;
        timesheetDedupedHours += tsHours;
      }

      if (effectiveDailyHours > 0) {
        const year = date.slice(0, 4);
        const month = date.slice(0, 7);

        // Update yearly
        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, {
            attendanceHours: 0,
            timesheetHours: 0,
            totalHours: 0,
            workdays: new Set(),
          });
        }
        const yEntry = yearlyMap.get(year)!;
        yEntry.attendanceHours += attHours;
        yEntry.timesheetHours += !isDuplicatePrevented ? tsHours : 0;
        yEntry.totalHours += effectiveDailyHours;
        yEntry.workdays.add(date);

        // Update monthly
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            attendanceHours: 0,
            timesheetHours: 0,
            totalHours: 0,
            workdays: new Set(),
          });
        }
        const mEntry = monthlyMap.get(month)!;
        mEntry.attendanceHours += attHours;
        mEntry.timesheetHours += !isDuplicatePrevented ? tsHours : 0;
        mEntry.totalHours += effectiveDailyHours;
        mEntry.workdays.add(date);
      }

      // Add to recent daily breakdown (keep last 30 entries)
      if (dailyBreakdown.length < 30 && (attMinutes > 0 || tsHours > 0)) {
        dailyBreakdown.push({
          date,
          source,
          attendanceMinutes: attMinutes,
          timesheetHours: tsHours,
          verifiedHours: Number(effectiveDailyHours.toFixed(2)),
          isDuplicatePrevented,
          status: att?.status ?? 'timesheet_approved',
          notes: isDuplicatePrevented
            ? `Attendance verified (${attHours}h). Timesheet (${tsHours}h) suppressed to prevent duplicate counting.`
            : att?.isRegularized
              ? 'Attendance regularized via approved adjustment.'
              : undefined,
        });
      }
    }

    const attendanceTotalHours = Number((totalAttendanceMinutes / 60).toFixed(2));
    const finalDedupedTimesheetHours = Number(timesheetDedupedHours.toFixed(2));
    const finalPreventedDuplicateHours = Number(preventedDuplicateHours.toFixed(2));
    const lifetimeHours = Number((attendanceTotalHours + finalDedupedTimesheetHours).toFixed(2));
    const lifetimeMinutes = Math.round(lifetimeHours * 60);

    const yearlySummaries = Array.from(yearlyMap.entries())
      .map(([year, val]) => ({
        year,
        attendanceHours: Number(val.attendanceHours.toFixed(2)),
        timesheetHours: Number(val.timesheetHours.toFixed(2)),
        totalHours: Number(val.totalHours.toFixed(2)),
        workdaysCount: val.workdays.size,
      }))
      .sort((a, b) => b.year.localeCompare(a.year));

    const monthlySummaries = Array.from(monthlyMap.entries())
      .map(([month, val]) => ({
        month,
        attendanceHours: Number(val.attendanceHours.toFixed(2)),
        timesheetHours: Number(val.timesheetHours.toFixed(2)),
        totalHours: Number(val.totalHours.toFixed(2)),
        workdaysCount: val.workdays.size,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const totalVerifiedWorkdays = Array.from(allDatesSet).filter((date) => {
      const att = attendanceByDate.get(date);
      const ts = timesheetsByDate.get(date) ?? 0;
      return (att?.isVerified && att.workedMinutes > 0) || ts > 0;
    }).length;

    return {
      lifetimeHours,
      lifetimeMinutes,
      attendanceHours: attendanceTotalHours,
      timesheetApprovedHours: Number(totalTimesheetApprovedHours.toFixed(2)),
      timesheetDedupedHours: finalDedupedTimesheetHours,
      preventedDuplicateHours: finalPreventedDuplicateHours,
      totalVerifiedWorkdays,
      calculationExplanation:
        'Lifetime working hours are deterministically calculated using verified attendance punch records and non-overlapping approved timesheets. On days where both attendance and timesheets exist, attendance is treated as the authoritative record of daily working hours to prevent double-counting. Timesheets are credited for approved work on dates without attendance punch records.',
      yearlySummaries,
      monthlySummaries,
      recentDailyBreakdown: dailyBreakdown,
    };
  }
}
