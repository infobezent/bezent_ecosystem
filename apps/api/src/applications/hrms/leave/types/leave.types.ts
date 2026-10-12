import type { EmployeeLeaveBalance, EmployeeLeaveRequest } from '../../../../db/schema.js';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';

export interface ApplyLeaveInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveBalanceSummary {
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export type { EmployeeLeaveBalance, EmployeeLeaveRequest };
