/**
 * BEZENT Platform Rules Engine — Rule & Condition Type Contracts
 * 
 * Domain-neutral types defining rules, conditions, and condition groups.
 * The engine does NOT know what facts mean; it only knows how to evaluate
 * structured conditions against runtime fact dictionaries.
 */

export type RuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'EXISTS'
  | 'NOT_EXISTS';

export type ConditionCombinator = 'ALL' | 'ANY';

export interface FactReference {
  fact: string;
}

export function isFactReference(val: unknown): val is FactReference {
  return typeof val === 'object' && val !== null && 'fact' in val && typeof (val as FactReference).fact === 'string';
}

export type RulePrimitiveValue = string | number | boolean | null | Date;

export type RuleConditionValue =
  | RulePrimitiveValue
  | RulePrimitiveValue[]
  | FactReference;

export type RuleFacts = Record<string, unknown> | object;

export interface RuleCondition {
  fact: string;
  operator: RuleOperator;
  value?: RuleConditionValue;
  description?: string;
}

export interface RuleConditionGroup {
  combinator: ConditionCombinator;
  conditions: Array<RuleCondition | RuleConditionGroup>;
  description?: string;
}

export type RuleConditionNode = RuleCondition | RuleConditionGroup;

export function isConditionGroup(node: RuleConditionNode): node is RuleConditionGroup {
  return 'combinator' in node && Array.isArray((node as RuleConditionGroup).conditions);
}

export interface RuleOutcome {
  action?: string;
  reasonCode?: string;
  message?: string;
  params?: Record<string, unknown>;
}

export interface Rule<TMetadata = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  conditions: RuleConditionNode;
  outcome?: RuleOutcome;
  metadata?: TMetadata;
}
