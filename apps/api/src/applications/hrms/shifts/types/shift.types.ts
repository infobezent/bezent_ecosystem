import type { HrmsShift, HrmsShiftAssignment } from '../../../../db/schema.js';
import type { ShiftSchedule } from '../../attendance/types/attendance.types.js';

export type ShiftAssignmentScope = 'employee' | 'department' | 'location';

export interface CreateShiftDto {
  id?: string;
  name: string;
  code: string;
  description?: string | null;
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  workingDays: string[]; // ['Monday', 'Tuesday', ...]
  breakMinutes?: number;
  lunchMinutes?: number;
  graceMinutes?: number;
  color?: string;
  isActive?: boolean;
}

export interface UpdateShiftDto {
  name?: string;
  code?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  workingDays?: string[];
  breakMinutes?: number;
  lunchMinutes?: number;
  graceMinutes?: number;
  color?: string;
  isActive?: boolean;
}

export interface ShiftFilterQuery {
  status?: 'all' | 'active' | 'inactive';
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CreateShiftAssignmentDto {
  shiftId: string;
  assignmentScope: ShiftAssignmentScope;
  employeeId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  targetId?: string; // Generic alias for employeeId / departmentId / locationId
  effectiveStartDate: string; // 'YYYY-MM-DD'
  effectiveEndDate?: string | null; // 'YYYY-MM-DD'
  isActive?: boolean;
  notes?: string | null;
}

export interface UpdateShiftAssignmentDto {
  shiftId?: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface EndShiftAssignmentDto {
  effectiveEndDate: string; // 'YYYY-MM-DD'
  notes?: string | null;
}

export interface AssignmentFilterQuery {
  scope?: ShiftAssignmentScope | 'all';
  shiftId?: string;
  targetId?: string;
  employeeId?: string;
  departmentId?: string;
  locationId?: string;
  status?: 'all' | 'active' | 'inactive';
  effectiveDate?: string; // Filter assignments active on this date
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export type ShiftResolutionSource =
  | 'employee'
  | 'department'
  | 'location'
  | 'auto_allocated'
  | 'legacy_schedule'
  | 'default_shift';

export interface ResolvedShiftDetail {
  shift: HrmsShift | null;
  resolutionSource: ShiftResolutionSource;
  assignment: HrmsShiftAssignment | null;
  date: string;
  schedule: ShiftSchedule;
}

export interface EnrichedShiftAssignment extends HrmsShiftAssignment {
  shiftName: string;
  shiftCode: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftIsOvernight: boolean;
  targetName: string;
  targetCode?: string;
}
