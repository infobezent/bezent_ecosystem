import { describe, it, expect } from 'vitest';
import { ruleEngine } from '../../../../platform/rules/index.js';
import {
  LEAVE_BALANCE_SUFFICIENCY_RULE,
  type LeaveBalanceRuleFacts,
} from '../rules/leaveRules.js';

describe('HRMS Leave Domain — Business Rules Evaluation', () => {
  it('allows unpaid leave even when available balance is zero', () => {
    const facts: LeaveBalanceRuleFacts = {
      leaveType: 'unpaid',
      requiresBalanceCheck: false,
      availableDays: 0,
      requestedDays: 5,
    };

    const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
    expect(result.matched).toBe(true);
    expect(result.failedConditions).toHaveLength(0);
  });

  it('allows paid leave when available balance is greater than requested days', () => {
    const facts: LeaveBalanceRuleFacts = {
      leaveType: 'annual',
      requiresBalanceCheck: true,
      availableDays: 10,
      requestedDays: 3,
    };

    const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
    expect(result.matched).toBe(true);
  });

  it('allows paid leave when available balance equals requested days', () => {
    const facts: LeaveBalanceRuleFacts = {
      leaveType: 'casual',
      requiresBalanceCheck: true,
      availableDays: 2,
      requestedDays: 2,
    };

    const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
    expect(result.matched).toBe(true);
  });

  it('rejects paid leave when available balance is less than requested days', () => {
    const facts: LeaveBalanceRuleFacts = {
      leaveType: 'sick',
      requiresBalanceCheck: true,
      availableDays: 1,
      requestedDays: 3,
    };

    const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
    expect(result.matched).toBe(false);
    expect(result.outcome?.reasonCode).toBe('INSUFFICIENT_LEAVE_BALANCE');
    expect(result.failedConditions.length).toBeGreaterThan(0);
  });
});
