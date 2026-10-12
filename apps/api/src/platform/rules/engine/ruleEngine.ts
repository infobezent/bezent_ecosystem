/**
 * BEZENT Platform Rules Engine — Rule Engine
 *
 * Synchronous, pure, deterministic, side-effect free rule evaluator.
 * Independent of Express, HTTP, Drizzle, and React.
 */

import type { Rule, RuleFacts } from '../model/rule.types.js';
import type { RuleEvaluationResult, ConditionEvaluationResult } from '../model/evaluation.types.js';
import { evaluateConditionNode } from './conditionEvaluator.js';
import { InvalidRuleError } from '../errors/rule.errors.js';

export class RuleEngine {
  /**
   * Evaluates a single rule against a fact dictionary.
   */
  evaluate<TMetadata = Record<string, unknown>>(
    rule: Rule<TMetadata>,
    facts: RuleFacts,
  ): RuleEvaluationResult<TMetadata> {
    if (!rule || typeof rule !== 'object') {
      throw new InvalidRuleError('Rule definition must be a valid object');
    }
    if (!rule.id || typeof rule.id !== 'string') {
      throw new InvalidRuleError("Rule must have a valid string 'id'");
    }
    if (!rule.name || typeof rule.name !== 'string') {
      throw new InvalidRuleError("Rule must have a valid string 'name'");
    }
    if (!rule.conditions) {
      throw new InvalidRuleError(`Rule '${rule.id}' is missing conditions`);
    }

    const { matched, results } = evaluateConditionNode(rule.conditions, facts);

    const evaluatedConditions: ConditionEvaluationResult[] = results;
    const failedConditions: ConditionEvaluationResult[] = matched
      ? []
      : results.filter((c) => !c.passed);

    const reasonCodes: string[] = [];
    if (!matched) {
      if (rule.outcome?.reasonCode) {
        reasonCodes.push(rule.outcome.reasonCode);
      }
      for (const failed of failedConditions) {
        if (failed.reason) {
          reasonCodes.push(failed.reason);
        }
      }
    } else if (rule.outcome?.reasonCode) {
      reasonCodes.push(rule.outcome.reasonCode);
    }

    return {
      matched,
      ruleId: rule.id,
      ruleName: rule.name,
      evaluatedConditions,
      failedConditions,
      reasonCodes,
      outcome: rule.outcome,
      metadata: rule.metadata,
    };
  }

  /**
   * Evaluates an array of rules against the same fact dictionary.
   */
  evaluateRules<TMetadata = Record<string, unknown>>(
    rules: Rule<TMetadata>[],
    facts: RuleFacts,
  ): RuleEvaluationResult<TMetadata>[] {
    if (!Array.isArray(rules)) {
      throw new InvalidRuleError('Rules must be an array');
    }
    return rules.map((r) => this.evaluate(r, facts));
  }
}

export const ruleEngine = new RuleEngine();

export function evaluateRule<TMetadata = Record<string, unknown>>(
  rule: Rule<TMetadata>,
  facts: RuleFacts,
): RuleEvaluationResult<TMetadata> {
  return ruleEngine.evaluate(rule, facts);
}

export function evaluateRules<TMetadata = Record<string, unknown>>(
  rules: Rule<TMetadata>[],
  facts: RuleFacts,
): RuleEvaluationResult<TMetadata>[] {
  return ruleEngine.evaluateRules(rules, facts);
}
