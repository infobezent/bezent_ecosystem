import { eq, and, lte, gte } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeWorkSchedules,
  employeeLeaveRequests,
  type EmployeeWorkSchedule,
} from '../../../../db/schema.js';
import type { ShiftSchedule } from '../types/attendance.types.js';
import { DEFAULT_WORK_SCHEDULE, timeToMinutes } from './attendanceCalculation.service.js';
import { attendanceSettingsRepository } from '../repository/attendanceSettings.repository.js';

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
    punchInTime?: string,
    enableAutoShiftAllocation?: boolean,
    shiftMatchingWindowMinutes?: number,
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

  /**
   * Automatically resolves the closest matching company shift based on check-in punch time.
   */
  async resolveAutoAllocatedShift(
    tenantId: string,
    companyId: string,
    punchInTime: string,
    matchingWindowMinutes: number = 60,
  ): Promise<ShiftSchedule | null> {
    const db = getDb();
    const schedules = await db
      .selectDistinct({
        workSchedule: employeeWorkSchedules.workSchedule,
        startTime: employeeWorkSchedules.startTime,
        endTime: employeeWorkSchedules.endTime,
        workingDays: employeeWorkSchedules.workingDays,
        breakMinutes: employeeWorkSchedules.breakMinutes,
        lunchMinutes: employeeWorkSchedules.lunchMinutes,
        timeZone: employeeWorkSchedules.timeZone,
      })
      .from(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
        ),
      );

    const roster = await attendanceSettingsRepository
      .getShiftRosterSettings(tenantId, companyId)
      .catch(() => null);

    const candidates: Array<{
      name: string;
      startTime: string;
      endTime: string;
      workingDays: (string | number)[];
      breakMinutes: number;
      lunchMinutes: number;
      timeZone: string | null;
    }> = [];

    if (roster && roster.shifts) {
      for (const s of roster.shifts) {
        if (s.isActive && s.startTime && s.endTime) {
          candidates.push({
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            workingDays: s.workingDays,
            breakMinutes: s.breakMinutes,
            lunchMinutes: s.lunchMinutes,
            timeZone: null,
          });
        }
      }
    }

    for (const sch of schedules) {
      if (
        sch.startTime &&
        sch.endTime &&
        !candidates.some((c) => c.startTime === sch.startTime && c.endTime === sch.endTime)
      ) {
        candidates.push({
          name: sch.workSchedule || 'Assigned Shift',
          startTime: sch.startTime,
          endTime: sch.endTime,
          workingDays: sch.workingDays ?? DEFAULT_WORK_SCHEDULE.workingDays,
          breakMinutes: sch.breakMinutes ?? DEFAULT_WORK_SCHEDULE.breakMinutes,
          lunchMinutes: sch.lunchMinutes ?? DEFAULT_WORK_SCHEDULE.lunchMinutes,
          timeZone: sch.timeZone ?? null,
        });
      }
    }

    if (candidates.length === 0) return null;

    const punchMinutes = timeToMinutes(punchInTime.slice(0, 5));
    let closestCandidate: (typeof candidates)[0] | null = null;
    let minDiff = Infinity;

    for (const cand of candidates) {
      const shiftStartMin = timeToMinutes(cand.startTime);
      const diff = Math.min(
        Math.abs(punchMinutes - shiftStartMin),
        1440 - Math.abs(punchMinutes - shiftStartMin),
      );
      if (diff <= matchingWindowMinutes && diff < minDiff) {
        minDiff = diff;
        closestCandidate = cand;
      }
    }

    if (!closestCandidate) return null;

    return {
      workingDays: closestCandidate.workingDays
        ? closestCandidate.workingDays.map(String)
        : DEFAULT_WORK_SCHEDULE.workingDays,
      startTime: closestCandidate.startTime,
      endTime: closestCandidate.endTime,
      breakMinutes: closestCandidate.breakMinutes ?? DEFAULT_WORK_SCHEDULE.breakMinutes,
      lunchMinutes: closestCandidate.lunchMinutes ?? DEFAULT_WORK_SCHEDULE.lunchMinutes,
      timeZone: closestCandidate.timeZone ?? DEFAULT_WORK_SCHEDULE.timeZone,
      scheduleRef: closestCandidate.name || 'auto_allocated_shift',
    };
  }

  async getEmployeeSchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
    _date?: string,
    punchInTime?: string,
    enableAutoShiftAllocation?: boolean,
    shiftMatchingWindowMinutes?: number,
  ): Promise<ShiftSchedule> {
    if (enableAutoShiftAllocation && punchInTime) {
      const autoMatched = await this.resolveAutoAllocatedShift(
        tenantId,
        companyId,
        punchInTime,
        shiftMatchingWindowMinutes || 60,
      );
      if (autoMatched) return autoMatched;
    }

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
