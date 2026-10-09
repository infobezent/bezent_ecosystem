/**
 * BEZENT Platform Rules Engine — Error Hierarchy
 *
 * Typed errors for deterministic, safe handling of malformed rules,
 * unknown operators, missing facts, and type mismatches.
 */

export class RuleError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidRuleError extends RuleError {
  constructor(message: string) {
    super(message, 'INVALID_RULE');
  }
}

export class UnknownOperatorError extends RuleError {
  constructor(operator: string) {
    super(`Unknown operator: '${operator}'`, 'UNKNOWN_OPERATOR');
  }
}

export class MissingFactError extends RuleError {
  constructor(factName: string) {
    super(`Missing required fact: '${factName}'`, 'MISSING_FACT');
  }
}

export class TypeMismatchError extends RuleError {
  constructor(message: string) {
    super(message, 'TYPE_MISMATCH');
  }
}

export class InvalidConditionError extends RuleError {
  constructor(message: string) {
    super(message, 'INVALID_CONDITION');
  }
}
