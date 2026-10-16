import type { EmployeeAttendance } from '../../../../db/schema.js';
import {
  attendanceRepository,
  type AttendanceRepository,
} from '../repository/attendance.repository.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';

/**
 * What an employee sees of their own attendance history, driven by the
 * company's "Employee visibility" and "Default history view" settings.
 *
 * Visibility values that describe other people's data (`department`,
 * `company`) are not applicable to an employee's own self-service view and are
 * treated like `daily_and_monthly`.
 */

/** Window used before a company has saved any attendance general settings. */
const LEGACY_HISTORY_DAYS = 60;

export interface EmployeeMonthlySummary {
  month: string;
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  holiday: number;
  lateDays: number;
  workedMinutes: number;
}

export interface EmployeeAttendanceView {
  history: EmployeeAttendance[];
  monthlySummary: EmployeeMonthlySummary[];
  view: { visibility: string; historyDays: number };
}

export function subtractDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function summarizeByMonth(rows: EmployeeAttendance[]): EmployeeMonthlySummary[] {
  const byMonth = new Map<string, EmployeeMonthlySummary>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const entry = byMonth.get(month) ?? {
      month,
      present: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      holiday: 0,
      lateDays: 0,
      workedMinutes: 0,
    };
    if (row.status === 'present') entry.present += 1;
    else if (row.status === 'half_day') entry.halfDay += 1;
    else if (row.status === 'absent') entry.absent += 1;
    else if (row.status === 'on_leave') entry.onLeave += 1;
    else if (row.status === 'holiday') entry.holiday += 1;
    if (row.isLate) entry.lateDays += 1;
    entry.workedMinutes += row.workedMinutes ?? 0;
    byMonth.set(month, entry);
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export class AttendanceEmployeeViewService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly attendanceRepo: AttendanceRepository = attendanceRepository,
  ) {}

  async getView(
    tenantId: string,
    companyId: string,
    employeeId: string,
    today: string,
  ): Promise<EmployeeAttendanceView> {
    const settings = await this.settingsRepo.getGeneralSettings(tenantId, companyId);
    const historyDays = settings?.defaultHistoryViewDays ?? LEGACY_HISTORY_DAYS;
    // The stored value can be finer-grained than the DB enum the settings type is derived from.
    const visibility: string = settings?.employeeVisibility ?? 'daily_and_monthly';

    const rows = await this.attendanceRepo.getAttendanceHistorySince(
      tenantId,
      companyId,
      employeeId,
      subtractDays(today, historyDays - 1),
    );

    if (visibility === 'monthly_summary_only') {
      return {
        history: [],
        monthlySummary: summarizeByMonth(rows),
        view: { visibility, historyDays },
      };
    }
    return {
      history: rows,
      monthlySummary: visibility === 'daily_only' ? [] : summarizeByMonth(rows),
      view: { visibility, historyDays },
    };
  }
}

export const attendanceEmployeeViewService = new AttendanceEmployeeViewService();
