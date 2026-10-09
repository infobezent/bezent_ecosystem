import type { EmployeeAttendance } from '../../../../db/schema.js';

export interface CheckInInput {
  workLocation: 'office' | 'remote' | 'field';
  notes?: string;
}

export interface RegularizeAttendanceInput {
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workLocation: string;
  status: string;
  notes: string | null;
  totalHours?: number | null;
}

export type { EmployeeAttendance };
