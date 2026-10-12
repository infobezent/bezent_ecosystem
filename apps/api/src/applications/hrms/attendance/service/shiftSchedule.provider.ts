import { eq, and, lte, gte } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { employeeWorkSchedules, employeeLeaveRequests } from '../../../../db/schema.js';
import type { ShiftSchedule } from '../types/attendance.types.js';
import { DEFAULT_WORK_SCHEDULE } from './attendanceCalculation.service.js';

export interface ShiftScheduleProvider {
  getEmployeeSchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date?: string,
  ): Promise<ShiftSchedule>;
}

export class DefaultShiftScheduleProvider implements ShiftScheduleProvider {
  async getEmployeeSchedule(
    _tenantId: string,
    _companyId: string,
    employeeId: string,
    _date?: string,
  ): Promise<ShiftSchedule> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeWorkSchedules)
      .where(eq(employeeWorkSchedules.employeeId, employeeId))
      .limit(1);

    const schedule = rows[0];
    if (!schedule) {
      return DEFAULT_WORK_SCHEDULE;
    }

    return {
      workingDays: schedule.workingDays ?? DEFAULT_WORK_SCHEDULE.workingDays,
      startTime: schedule.startTime || DEFAULT_WORK_SCHEDULE.startTime,
      endTime: schedule.endTime || DEFAULT_WORK_SCHEDULE.endTime,
      breakMinutes: schedule.breakMinutes ?? DEFAULT_WORK_SCHEDULE.breakMinutes,
      lunchMinutes: schedule.lunchMinutes ?? DEFAULT_WORK_SCHEDULE.lunchMinutes,
      timeZone: schedule.timeZone ?? DEFAULT_WORK_SCHEDULE.timeZone,
      scheduleRef: schedule.workSchedule || schedule.workingCalendar || 'work_schedule',
    };
  }

  async isEmployeeOnApprovedLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .select({ id: employeeLeaveRequests.id })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
          eq(employeeLeaveRequests.status, 'approved'),
          lte(employeeLeaveRequests.startDate, date),
          gte(employeeLeaveRequests.endDate, date),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }
}

export const defaultShiftScheduleProvider = new DefaultShiftScheduleProvider();
