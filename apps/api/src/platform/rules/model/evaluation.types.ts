/**
 * BEZENT Platform Rules Engine — Evaluation Result Types
 *
 * Structured evaluation diagnostics designed for testing, debugging,
 * and future audit events without exposing sensitive domain facts.
 */

import type { RuleOperator, RuleOutcome } from './rule.types.js';

export interface ConditionEvaluationResult {
  fact: string;
  operator: RuleOperator;
  expectedValue: unknown;
  actualValue: unknown;
  passed: boolean;
  reason?: string;
}

export interface RuleEvaluationResult<TMetadata = Record<string, unknown>> {
  matched: boolean;
  ruleId: string;
  ruleName: string;
  evaluatedConditions: ConditionEvaluationResult[];
  failedConditions: ConditionEvaluationResult[];
  reasonCodes: string[];
  outcome?: RuleOutcome;
  metadata?: TMetadata;
}
