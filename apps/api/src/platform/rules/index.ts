/**
 * BEZENT Platform Rules Engine — Public API
 *
 * Domain-agnostic, deterministic, in-memory business rule evaluation.
 * Rules Engine defines HOW rules are evaluated.
 * Business domains define WHAT rules mean and WHEN they are used.
 */

export type {
  RuleOperator,
  ConditionCombinator,
  FactReference,
  RulePrimitiveValue,
  RuleConditionValue,
  RuleFacts,
  RuleCondition,
  RuleConditionGroup,
  RuleConditionNode,
  RuleOutcome,
  Rule,
} from './model/rule.types.js';

export {
  isFactReference,
  isConditionGroup,
} from './model/rule.types.js';

export type {
  ConditionEvaluationResult,
  RuleEvaluationResult,
} from './model/evaluation.types.js';

export {
  RuleError,
  InvalidRuleError,
  UnknownOperatorError,
  MissingFactError,
  TypeMismatchError,
  InvalidConditionError,
} from './errors/rule.errors.js';

export {
  OPERATOR_REGISTRY,
  getOperator,
} from './operators/operatorRegistry.js';

export {
  resolveFactValue,
  resolveExpectedValue,
  evaluateAtomicCondition,
  evaluateConditionNode,
} from './engine/conditionEvaluator.js';

export {
  RuleEngine,
  ruleEngine,
  evaluateRule,
  evaluateRules,
} from './engine/ruleEngine.js';
