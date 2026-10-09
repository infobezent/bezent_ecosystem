import { LeaveRepository, leaveRepository } from '../repository/leave.repository.js';
import { BadRequestError, ConflictError } from '../../../../app/errors/AppError.js';
import type { ApplyLeaveInput, LeaveBalanceSummary, EmployeeLeaveRequest } from '../types/leave.types.js';
import { ruleEngine } from '../../../../platform/rules/index.js';
import {
  LEAVE_BALANCE_SUFFICIENCY_RULE,
  type LeaveBalanceRuleFacts,
} from '../rules/leaveRules.js';

export class LeaveService {
  constructor(private readonly repo: LeaveRepository = leaveRepository) {}

  async getFormattedBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<LeaveBalanceSummary[]> {
    const balances = await this.repo.ensureDefaultLeaveBalances(
      tenantId,
      companyId,
      employeeId,
      year,
    );
    return balances.map((b) => ({
      leaveType: b.leaveType,
      totalDays: b.totalDays,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
      availableDays: Math.max(0, b.totalDays - b.usedDays - b.pendingDays),
    }));
  }

  async getLeaveRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeLeaveRequest[]> {
    return this.repo.getLeaveRequests(tenantId, companyId, employeeId);
  }

  async applyLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    input: ApplyLeaveInput,
  ): Promise<EmployeeLeaveRequest> {
    if (!input.startDate || !input.endDate || !input.leaveType || !input.reason) {
      throw new BadRequestError('Start date, end date, leave type, and reason are required');
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date format provided');
    }
    if (end < start) {
      throw new BadRequestError('End date cannot precede start date');
    }

    // Inclusive days count
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check overlapping leave
    const overlap = await this.repo.findOverlappingLeave(
      tenantId,
      companyId,
      employeeId,
      input.startDate,
      input.endDate,
    );
    if (overlap) {
      throw new ConflictError(
        `Leave request overlaps with an existing ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`,
      );
    }

    // Check balance for non-unpaid leaves
    if (input.leaveType !== 'unpaid') {
      const year = start.getFullYear();
      const balances = await this.repo.ensureDefaultLeaveBalances(
        tenantId,
        companyId,
        employeeId,
        year,
      );
      const balance = balances.find((b) => b.leaveType === input.leaveType);
      const available = balance ? balance.totalDays - balance.usedDays - balance.pendingDays : 0;

      const facts: LeaveBalanceRuleFacts = {
        leaveType: input.leaveType,
        requiresBalanceCheck: true,
        availableDays: available,
        requestedDays: totalDays,
      };

      const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
      if (!result.matched) {
        throw new BadRequestError(
          `Insufficient ${input.leaveType} leave balance. Available: ${available} day(s), Requested: ${totalDays} day(s)`,
        );
      }
    }

    return this.repo.createLeaveRequest({
      tenantId,
      companyId,
      employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason,
    });
  }

  async cancelLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    requestId: string,
  ): Promise<EmployeeLeaveRequest> {
    return this.repo.cancelLeaveRequest(requestId, employeeId);
  }
}

export const leaveService = new LeaveService();
