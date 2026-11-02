import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  CreateShiftDto,
  UpdateShiftDto,
  CreateShiftAssignmentDto,
  UpdateShiftAssignmentDto,
  EndShiftAssignmentDto,
  ShiftAssignmentScope,
} from '../types/shift.types.js';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function validateCreateShift(input: unknown): CreateShiftDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Shift payload must be an object');
  }

  const raw = input as Record<string, unknown>;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length < 2 || name.length > 100) {
    throw new ValidationError('Shift name is required and must be between 2 and 100 characters');
  }

  const code = typeof raw.code === 'string' ? raw.code.trim().toUpperCase() : '';
  if (!code || code.length < 2 || code.length > 50) {
    throw new ValidationError('Shift code is required and must be between 2 and 50 characters');
  }

  const startTime = typeof raw.startTime === 'string' ? raw.startTime.trim() : '';
  if (!TIME_REGEX.test(startTime)) {
    throw new ValidationError('Start time must be in HH:mm 24-hour format (e.g. 09:00)');
  }

  const endTime = typeof raw.endTime === 'string' ? raw.endTime.trim() : '';
  if (!TIME_REGEX.test(endTime)) {
    throw new ValidationError('End time must be in HH:mm 24-hour format (e.g. 18:00)');
  }

  if (startTime === endTime) {
    throw new ValidationError('Shift start time and end time cannot be identical');
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const grossMinutes = endMin > startMin ? endMin - startMin : 1440 - startMin + endMin;

  const breakMinutes = typeof raw.breakMinutes === 'number' ? Math.max(0, raw.breakMinutes) : 60;
  const lunchMinutes = typeof raw.lunchMinutes === 'number' ? Math.max(0, raw.lunchMinutes) : 30;
  const totalBreakMinutes = breakMinutes + lunchMinutes;

  if (totalBreakMinutes >= grossMinutes) {
    throw new ValidationError(
      `Total break time (${totalBreakMinutes}m) cannot meet or exceed shift duration (${grossMinutes}m)`,
    );
  }

  const graceMinutes = typeof raw.graceMinutes === 'number' ? Math.max(0, raw.graceMinutes) : 15;

  let workingDays: string[] = [];
  if (Array.isArray(raw.workingDays) && raw.workingDays.length > 0) {
    workingDays = raw.workingDays
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .filter((d) => VALID_DAYS.some((vd) => vd.toLowerCase() === d.toLowerCase()));
  }
  if (workingDays.length === 0) {
    workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined,
    name,
    code,
    description: typeof raw.description === 'string' ? raw.description.trim() : null,
    startTime,
    endTime,
    workingDays,
    breakMinutes,
    lunchMinutes,
    graceMinutes,
    color: typeof raw.color === 'string' && raw.color.trim() ? raw.color.trim() : '#2563EB',
    isActive: raw.isActive !== false,
  };
}

export function validateUpdateShift(input: unknown): UpdateShiftDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Shift update payload must be an object');
  }

  const raw = input as Record<string, unknown>;
  const dto: UpdateShiftDto = {};

  if (raw.name !== undefined) {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name || name.length < 2 || name.length > 100) {
      throw new ValidationError('Shift name must be between 2 and 100 characters');
    }
    dto.name = name;
  }

  if (raw.code !== undefined) {
    const code = typeof raw.code === 'string' ? raw.code.trim().toUpperCase() : '';
    if (!code || code.length < 2 || code.length > 50) {
      throw new ValidationError('Shift code must be between 2 and 50 characters');
    }
    dto.code = code;
  }

  if (raw.startTime !== undefined) {
    const startTime = typeof raw.startTime === 'string' ? raw.startTime.trim() : '';
    if (!TIME_REGEX.test(startTime)) {
      throw new ValidationError('Start time must be in HH:mm format');
    }
    dto.startTime = startTime;
  }

  if (raw.endTime !== undefined) {
    const endTime = typeof raw.endTime === 'string' ? raw.endTime.trim() : '';
    if (!TIME_REGEX.test(endTime)) {
      throw new ValidationError('End time must be in HH:mm format');
    }
    dto.endTime = endTime;
  }

  if (raw.description !== undefined) {
    dto.description = typeof raw.description === 'string' ? raw.description.trim() : null;
  }

  if (raw.breakMinutes !== undefined) {
    dto.breakMinutes = typeof raw.breakMinutes === 'number' ? Math.max(0, raw.breakMinutes) : 0;
  }

  if (raw.lunchMinutes !== undefined) {
    dto.lunchMinutes = typeof raw.lunchMinutes === 'number' ? Math.max(0, raw.lunchMinutes) : 0;
  }

  if (raw.graceMinutes !== undefined) {
    dto.graceMinutes = typeof raw.graceMinutes === 'number' ? Math.max(0, raw.graceMinutes) : 0;
  }

  if (raw.workingDays !== undefined && Array.isArray(raw.workingDays)) {
    const days = raw.workingDays
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .filter((d) => VALID_DAYS.some((vd) => vd.toLowerCase() === d.toLowerCase()));
    if (days.length === 0) {
      throw new ValidationError('Shift must have at least one valid working day');
    }
    dto.workingDays = days;
  }

  if (raw.color !== undefined) {
    dto.color = typeof raw.color === 'string' ? raw.color.trim() : '#2563EB';
  }

  if (raw.isActive !== undefined) {
    dto.isActive = Boolean(raw.isActive);
  }

  return dto;
}

export function validateCreateAssignment(input: unknown): CreateShiftAssignmentDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Shift assignment payload must be an object');
  }

  const raw = input as Record<string, unknown>;

  const shiftId = typeof raw.shiftId === 'string' ? raw.shiftId.trim() : '';
  if (!shiftId) {
    throw new ValidationError('Shift ID is required');
  }

  const scope = raw.assignmentScope as ShiftAssignmentScope;
  if (!scope || !['employee', 'department', 'location'].includes(scope)) {
    throw new ValidationError("Assignment scope must be 'employee', 'department', or 'location'");
  }

  const targetId =
    (typeof raw.targetId === 'string' ? raw.targetId.trim() : '') ||
    (scope === 'employee' && typeof raw.employeeId === 'string' ? raw.employeeId.trim() : '') ||
    (scope === 'department' && typeof raw.departmentId === 'string' ? raw.departmentId.trim() : '') ||
    (scope === 'location' && typeof raw.locationId === 'string' ? raw.locationId.trim() : '');

  if (!targetId) {
    throw new ValidationError(`Target ID is required for scope '${scope}'`);
  }

  const effectiveStartDate =
    typeof raw.effectiveStartDate === 'string' ? raw.effectiveStartDate.trim() : '';
  if (!DATE_REGEX.test(effectiveStartDate)) {
    throw new ValidationError('Effective start date must be in YYYY-MM-DD format');
  }

  let effectiveEndDate: string | null = null;
  if (raw.effectiveEndDate) {
    const end = typeof raw.effectiveEndDate === 'string' ? raw.effectiveEndDate.trim() : '';
    if (!DATE_REGEX.test(end)) {
      throw new ValidationError('Effective end date must be in YYYY-MM-DD format');
    }
    if (end < effectiveStartDate) {
      throw new ValidationError('Effective end date cannot precede effective start date');
    }
    effectiveEndDate = end;
  }

  return {
    shiftId,
    assignmentScope: scope,
    employeeId: scope === 'employee' ? targetId : null,
    departmentId: scope === 'department' ? targetId : null,
    locationId: scope === 'location' ? targetId : null,
    targetId,
    effectiveStartDate,
    effectiveEndDate,
    isActive: raw.isActive !== false,
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : null,
  };
}

export function validateUpdateAssignment(input: unknown): UpdateShiftAssignmentDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Shift assignment update payload must be an object');
  }

  const raw = input as Record<string, unknown>;
  const dto: UpdateShiftAssignmentDto = {};

  if (raw.shiftId !== undefined) {
    const shiftId = typeof raw.shiftId === 'string' ? raw.shiftId.trim() : '';
    if (!shiftId) throw new ValidationError('Shift ID cannot be empty');
    dto.shiftId = shiftId;
  }

  if (raw.effectiveStartDate !== undefined) {
    const start = typeof raw.effectiveStartDate === 'string' ? raw.effectiveStartDate.trim() : '';
    if (!DATE_REGEX.test(start)) {
      throw new ValidationError('Effective start date must be in YYYY-MM-DD format');
    }
    dto.effectiveStartDate = start;
  }

  if (raw.effectiveEndDate !== undefined) {
    if (raw.effectiveEndDate === null || raw.effectiveEndDate === '') {
      dto.effectiveEndDate = null;
    } else {
      const end = typeof raw.effectiveEndDate === 'string' ? raw.effectiveEndDate.trim() : '';
      if (!DATE_REGEX.test(end)) {
        throw new ValidationError('Effective end date must be in YYYY-MM-DD format');
      }
      dto.effectiveEndDate = end;
    }
  }

  if (raw.isActive !== undefined) {
    dto.isActive = Boolean(raw.isActive);
  }

  if (raw.notes !== undefined) {
    dto.notes = typeof raw.notes === 'string' ? raw.notes.trim() : null;
  }

  return dto;
}

export function validateEndAssignment(input: unknown): EndShiftAssignmentDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('End assignment payload must be an object');
  }

  const raw = input as Record<string, unknown>;
  const effectiveEndDate =
    typeof raw.effectiveEndDate === 'string' ? raw.effectiveEndDate.trim() : '';
  if (!DATE_REGEX.test(effectiveEndDate)) {
    throw new ValidationError('Effective end date must be in YYYY-MM-DD format');
  }

  return {
    effectiveEndDate,
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : null,
  };
}
