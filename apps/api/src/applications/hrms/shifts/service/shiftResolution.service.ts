import type { EmployeeWorkSchedule } from '../../../../db/schema.js';
import { ShiftRepository, shiftRepository } from '../repository/shift.repository.js';
import type { ResolvedShiftDetail, ShiftResolutionSource } from '../types/shift.types.js';
import type { ShiftSchedule } from '../../attendance/types/attendance.types.js';
import {
  DEFAULT_WORK_SCHEDULE,
  timeToMinutes,
} from '../../attendance/service/attendanceCalculation.service.js';

export class ShiftResolutionService {
  constructor(private readonly repo: ShiftRepository = shiftRepository) {}

  /**
   * Resolves the effective shift and schedule for an employee on a given attendance date.
   * Deterministic precedence:
   * 1. Auto-allocation (if punchInTime provided & enabled)
   * 2. Employee-level persistent assignment
   * 3. Department-level persistent assignment
   * 4. Work location-level persistent assignment
   * 5. Legacy employeeWorkSchedules registration record
   * 6. Default/fallback company shift
   */
  async resolveEmployeeShift(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    punchInTime?: string,
    enableAutoShiftAllocation?: boolean,
    shiftMatchingWindowMinutes: number = 60,
  ): Promise<ResolvedShiftDetail> {
    // 1. Check auto-allocation first if enabled and check-in punch is provided
    if (enableAutoShiftAllocation && punchInTime) {
      const autoMatched = await this.resolveAutoAllocatedShift(
        tenantId,
        companyId,
        punchInTime,
        shiftMatchingWindowMinutes,
        date,
      );
      if (autoMatched) {
        return autoMatched;
      }
    }

    // 2. Fetch employee organization details (department, location)
    const org = await this.repo.getEmployeeWithOrg(tenantId, companyId, employeeId);
    const departmentId = org?.employee?.departmentId ?? null;
    const locationId = org?.employee?.locationId ?? null;

    // 3. Query active assignments covering the target attendance date
    const activeAssignments = await this.repo.getActiveAssignmentsForDate(
      tenantId,
      companyId,
      date,
      employeeId,
      departmentId,
      locationId,
    );

    // 3a. Precedence 1: Employee-specific assignment
    const empAsgn = activeAssignments.find((a) => a.assignmentScope === 'employee');
    if (empAsgn && empAsgn.shift.isActive) {
      return {
        shift: empAsgn.shift,
        resolutionSource: 'employee',
        assignment: empAsgn,
        date,
        schedule: this.buildShiftSchedule(empAsgn.shift),
      };
    }

    // 3b. Precedence 2: Department-specific assignment
    if (departmentId) {
      const deptAsgn = activeAssignments.find(
        (a) => a.assignmentScope === 'department' && a.departmentId === departmentId,
      );
      if (deptAsgn && deptAsgn.shift.isActive) {
        return {
          shift: deptAsgn.shift,
          resolutionSource: 'department',
          assignment: deptAsgn,
          date,
          schedule: this.buildShiftSchedule(deptAsgn.shift),
        };
      }
    }

    // 3c. Precedence 3: Location-specific assignment
    if (locationId) {
      const locAsgn = activeAssignments.find(
        (a) => a.assignmentScope === 'location' && a.locationId === locationId,
      );
      if (locAsgn && locAsgn.shift.isActive) {
        return {
          shift: locAsgn.shift,
          resolutionSource: 'location',
          assignment: locAsgn,
          date,
          schedule: this.buildShiftSchedule(locAsgn.shift),
        };
      }
    }

    // 4. Precedence 4: Legacy employeeWorkSchedules registration record (for backward compatibility)
    const legacySchedule = await this.getLegacySchedule(tenantId, companyId, employeeId);
    if (legacySchedule) {
      const schedule: ShiftSchedule = {
        workingDays: legacySchedule.workingDays ?? DEFAULT_WORK_SCHEDULE.workingDays,
        startTime: legacySchedule.startTime || DEFAULT_WORK_SCHEDULE.startTime,
        endTime: legacySchedule.endTime || DEFAULT_WORK_SCHEDULE.endTime,
        breakMinutes: legacySchedule.breakMinutes ?? DEFAULT_WORK_SCHEDULE.breakMinutes,
        lunchMinutes: legacySchedule.lunchMinutes ?? DEFAULT_WORK_SCHEDULE.lunchMinutes,
        timeZone: legacySchedule.timeZone ?? DEFAULT_WORK_SCHEDULE.timeZone,
        scheduleRef:
          legacySchedule.workSchedule || legacySchedule.workingCalendar || 'work_schedule',
        graceMinutes: 15,
        isOvernight:
          timeToMinutes(legacySchedule.endTime) < timeToMinutes(legacySchedule.startTime),
      };

      return {
        shift: null,
        resolutionSource: 'legacy_schedule',
        assignment: null,
        date,
        schedule,
      };
    }

    // 5. Precedence 5: Fallback default company shift in hrms_shifts
    const { items: shifts } = await this.repo.listShifts(tenantId, companyId, { status: 'active' });
    const fallbackShift =
      shifts.find((s) => s.code.startsWith('GEN') || s.code === 'shift_gen_std') ?? shifts[0];

    if (fallbackShift) {
      return {
        shift: fallbackShift,
        resolutionSource: 'default_shift',
        assignment: null,
        date,
        schedule: this.buildShiftSchedule(fallbackShift),
      };
    }

    // 6. Absolute system fallback
    return {
      shift: null,
      resolutionSource: 'default_shift',
      assignment: null,
      date,
      schedule: {
        ...DEFAULT_WORK_SCHEDULE,
        graceMinutes: 15,
        isOvernight: false,
      },
    };
  }

  /**
   * Matches closest active company shift within the tolerance window.
   */
  async resolveAutoAllocatedShift(
    tenantId: string,
    companyId: string,
    punchInTime: string,
    matchingWindowMinutes: number = 60,
    date: string,
  ): Promise<ResolvedShiftDetail | null> {
    const { items: shifts } = await this.repo.listShifts(tenantId, companyId, { status: 'active' });
    if (shifts.length === 0) return null;

    const punchMinutes = timeToMinutes(punchInTime.slice(0, 5));
    let closestShift: (typeof shifts)[0] | null = null;
    let minDiff = Infinity;

    for (const shift of shifts) {
      const shiftStartMin = timeToMinutes(shift.startTime);
      const diff = Math.min(
        Math.abs(punchMinutes - shiftStartMin),
        1440 - Math.abs(punchMinutes - shiftStartMin),
      );
      if (diff <= matchingWindowMinutes && diff < minDiff) {
        minDiff = diff;
        closestShift = shift;
      }
    }

    if (!closestShift) return null;

    return {
      shift: closestShift,
      resolutionSource: 'auto_allocated',
      assignment: null,
      date,
      schedule: this.buildShiftSchedule(closestShift, `${closestShift.name} (Auto-allocated)`),
    };
  }

  private buildShiftSchedule(
    shift: NonNullable<ResolvedShiftDetail['shift']>,
    scheduleRef?: string,
  ): ShiftSchedule {
    return {
      workingDays: shift.workingDays ?? DEFAULT_WORK_SCHEDULE.workingDays,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes ?? DEFAULT_WORK_SCHEDULE.breakMinutes,
      lunchMinutes: shift.lunchMinutes ?? DEFAULT_WORK_SCHEDULE.lunchMinutes,
      timeZone: DEFAULT_WORK_SCHEDULE.timeZone,
      scheduleRef: scheduleRef || shift.name || shift.code,
      shiftId: shift.id,
      shiftCode: shift.code,
      graceMinutes: shift.graceMinutes ?? 15,
      isOvernight: shift.isOvernight,
    };
  }

  private async getLegacySchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeWorkSchedule | null> {
    if (typeof this.repo.getLegacySchedule === 'function') {
      try {
        return await this.repo.getLegacySchedule(tenantId, companyId, employeeId);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const shiftResolutionService = new ShiftResolutionService();
