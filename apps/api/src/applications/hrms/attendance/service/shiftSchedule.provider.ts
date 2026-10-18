import { eq, and, lte, gte } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeWorkSchedules,
  employeeLeaveRequests,
  type EmployeeWorkSchedule,
} from '../../../../db/schema.js';
import type { ShiftSchedule } from '../types/attendance.types.js';
import { DEFAULT_WORK_SCHEDULE, timeToMinutes } from './attendanceCalculation.service.js';

export interface AssignedShiftDetails {
  isAssigned: boolean;
  name: string | null;
  startTime: string | null;
  endTime: string | null;
  requiredHours: number;
  graceMinutes: number;
  breakAllowanceMinutes: number;
  timeZone: string | null;
  effectiveTimezone: string | null;
  workingDays: (string | number)[];
}

export interface ShiftScheduleProvider {
  getEmployeeSchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date?: string,
  ): Promise<ShiftSchedule>;
}

export class DefaultShiftScheduleProvider implements ShiftScheduleProvider {
  async getRawSchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeWorkSchedule | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
          eq(employeeWorkSchedules.employeeId, employeeId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async getAssignedShiftDetails(
    tenantId: string,
    companyId: string,
    employeeId: string,
    effectiveCompanyTimezone: string = 'UTC',
    graceMinutes: number = 15,
  ): Promise<AssignedShiftDetails> {
    const raw = await this.getRawSchedule(tenantId, companyId, employeeId);
    if (!raw) {
      return {
        isAssigned: false,
        name: null,
        startTime: null,
        endTime: null,
        requiredHours: 0,
        graceMinutes: 0,
        breakAllowanceMinutes: 0,
        timeZone: effectiveCompanyTimezone,
        effectiveTimezone: effectiveCompanyTimezone,
        workingDays: [],
      };
    }

    const startMinutes = timeToMinutes(raw.startTime);
    const endMinutes = timeToMinutes(raw.endTime);
    const grossMinutes =
      endMinutes >= startMinutes ? endMinutes - startMinutes : 1440 - startMinutes + endMinutes;
    const breakMinutes = (raw.breakMinutes ?? 0) + (raw.lunchMinutes ?? 0);
    const netMinutes = Math.max(0, grossMinutes - breakMinutes);
    const requiredHours = Number((netMinutes / 60).toFixed(2));

    const effectiveTz = raw.timeZone || effectiveCompanyTimezone;

    return {
      isAssigned: true,
      name: raw.workSchedule || raw.workingCalendar || 'Assigned Shift',
      startTime: raw.startTime,
      endTime: raw.endTime,
      requiredHours,
      graceMinutes,
      breakAllowanceMinutes: raw.breakMinutes ?? 60,
      timeZone: effectiveTz,
      effectiveTimezone: effectiveTz,
      workingDays: raw.workingDays ?? [],
    };
  }

  async getEmployeeSchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
    _date?: string,
  ): Promise<ShiftSchedule> {
    const schedule = await this.getRawSchedule(tenantId, companyId, employeeId);
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
