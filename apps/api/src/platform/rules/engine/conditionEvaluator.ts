/**
 * BEZENT Platform Rules Engine — Condition Evaluator
 *
 * Recursively evaluates atomic conditions and condition groups against facts.
 * Provides safe path resolution and diagnostics without arbitrary code execution.
 */

import type {
  RuleCondition,
  RuleConditionNode,
  RuleFacts,
  RuleConditionValue,
  RuleConditionGroup,
} from '../model/rule.types.js';
import { isConditionGroup, isFactReference } from '../model/rule.types.js';
import type { ConditionEvaluationResult } from '../model/evaluation.types.js';
import { getOperator } from '../operators/operatorRegistry.js';
import {
  InvalidConditionError,
  InvalidRuleError,
  MissingFactError,
} from '../errors/rule.errors.js';

const DISALLOWED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Safely resolves a fact value by key or dot-delimited path (e.g. "employee.status").
 */
export function resolveFactValue(facts: RuleFacts, path: string): unknown {
  if (!path || typeof path !== 'string') {
    throw new InvalidConditionError('Condition fact path must be a non-empty string');
  }

  const parts = path.split('.');
  let current: unknown = facts;

  for (const part of parts) {
    if (DISALLOWED_KEYS.has(part)) {
      throw new InvalidConditionError(`Access to restricted property '${part}' is forbidden`);
    }
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolves the expected condition value, looking up FactReference if specified.
 */
export function resolveExpectedValue(
  value: RuleConditionValue | undefined,
  facts: RuleFacts,
): unknown {
  if (isFactReference(value)) {
    const resolved = resolveFactValue(facts, value.fact);
    if (resolved === undefined) {
      throw new MissingFactError(value.fact);
    }
    return resolved;
  }
  return value;
}

export interface NodeEvaluationOutcome {
  matched: boolean;
  results: ConditionEvaluationResult[];
}

/**
 * Evaluates an individual atomic condition against facts.
 */
export function evaluateAtomicCondition(
  condition: RuleCondition,
  facts: RuleFacts,
): ConditionEvaluationResult {
  if (!condition.fact || typeof condition.fact !== 'string') {
    throw new InvalidConditionError('Rule condition must specify a valid fact string');
  }
  if (!condition.operator) {
    throw new InvalidConditionError('Rule condition must specify a valid operator');
  }

  const opFn = getOperator(condition.operator);
  const actualValue = resolveFactValue(facts, condition.fact);
  const expectedValue = resolveExpectedValue(condition.value, facts);

  const passed = opFn(actualValue, expectedValue);
  const reason = passed
    ? undefined
    : condition.description ?? `Condition failed: fact '${condition.fact}' ${condition.operator} expected value`;

  return {
    fact: condition.fact,
    operator: condition.operator,
    expectedValue,
    actualValue,
    passed,
    reason,
  };
}

/**
 * Recursively evaluates a condition node (atomic or group).
 */
export function evaluateConditionNode(
  node: RuleConditionNode,
  facts: RuleFacts,
): NodeEvaluationOutcome {
  if (!node) {
    throw new InvalidRuleError('Condition node is required');
  }

  if (isConditionGroup(node)) {
    if (!Array.isArray(node.conditions)) {
      throw new InvalidRuleError("Condition group 'conditions' must be an array");
    }

    if (node.conditions.length === 0) {
      return { matched: true, results: [] };
    }

    const allResults: ConditionEvaluationResult[] = [];
    const childMatchOutcomes: boolean[] = [];

    for (const child of node.conditions) {
      const childOutcome = evaluateConditionNode(child, facts);
      childMatchOutcomes.push(childOutcome.matched);
      allResults.push(...childOutcome.results);
    }

    let matched = false;
    if (node.combinator === 'ALL') {
      matched = childMatchOutcomes.every((m) => m === true);
    } else if (node.combinator === 'ANY') {
      matched = childMatchOutcomes.some((m) => m === true);
    } else {
      throw new InvalidRuleError(`Unsupported condition combinator: '${String((node as RuleConditionGroup).combinator)}'`);
    }

    return { matched, results: allResults };
  }

  // Atomic condition
  const result = evaluateAtomicCondition(node, facts);
  return {
    matched: result.passed,
    results: [result],
  };
}
