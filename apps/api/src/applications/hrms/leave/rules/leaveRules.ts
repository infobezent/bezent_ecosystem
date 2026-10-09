/**
 * HRMS Leave Domain — Business Rules
 *
 * Domain-specific rule definitions and facts for the Leave domain.
 * Evaluated by the generic Platform Rules Engine.
 * Business meaning and action remain strictly owned by LeaveService.
 */

import type { Rule } from '../../../../platform/rules/index.js';

export interface LeaveBalanceRuleFacts {
  leaveType: string;
  requiresBalanceCheck: boolean;
  availableDays: number;
  requestedDays: number;
}

export const LEAVE_BALANCE_SUFFICIENCY_RULE: Rule = {
  id: 'hrms.leave.balance_sufficiency',
  name: 'Leave Balance Sufficiency Rule',
  description: 'Verifies that an employee has sufficient available leave balance for non-unpaid leave requests',
  conditions: {
    combinator: 'ANY',
    conditions: [
      {
        fact: 'requiresBalanceCheck',
        operator: 'EQUALS',
        value: false,
        description: 'Unpaid leaves bypass balance validation',
      },
      {
        combinator: 'ALL',
        conditions: [
          {
            fact: 'availableDays',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: { fact: 'requestedDays' },
            description: 'Available balance must be greater than or equal to requested days',
          },
        ],
      },
    ],
  },
  outcome: {
    reasonCode: 'INSUFFICIENT_LEAVE_BALANCE',
    message: 'Insufficient leave balance',
  },
};
