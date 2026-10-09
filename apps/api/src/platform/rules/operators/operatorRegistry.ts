/**
 * BEZENT Platform Rules Engine — Controlled Operator Registry
 *
 * Implements pure, side-effect-free, deterministic operators.
 * Strict type safety: no JavaScript coercion, no dynamic eval(),
 * and unknown operators immediately fail closed with typed errors.
 */

import type { RuleOperator } from '../model/rule.types.js';
import { TypeMismatchError, UnknownOperatorError } from '../errors/rule.errors.js';

export type OperatorFn = (actual: unknown, expected: unknown) => boolean;

function isDateLike(val: unknown): val is Date | string {
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'string') {
    // ISO-8601 or YYYY-MM-DD pattern validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
    if (dateRegex.test(val)) {
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    }
  }
  return false;
}

function toTimestamp(val: unknown): number {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') return Date.parse(val);
  throw new TypeMismatchError(`Expected Date or ISO date string, received: ${typeof val}`);
}

export const OPERATOR_REGISTRY: Record<RuleOperator, OperatorFn> = {
  EQUALS: (actual: unknown, expected: unknown): boolean => {
    if (isDateLike(actual) && isDateLike(expected)) {
      return toTimestamp(actual) === toTimestamp(expected);
    }
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      return actual.every((item, i) => OPERATOR_REGISTRY.EQUALS(item, expected[i]));
    }
    return actual === expected;
  },

  NOT_EQUALS: (actual: unknown, expected: unknown): boolean => {
    return !OPERATOR_REGISTRY.EQUALS(actual, expected);
  },

  GREATER_THAN: (actual: unknown, expected: unknown): boolean => {
    if (isDateLike(actual) && isDateLike(expected)) {
      return toTimestamp(actual) > toTimestamp(expected);
    }
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (isNaN(actual) || isNaN(expected)) {
        throw new TypeMismatchError('Cannot compare NaN in numeric condition');
      }
      return actual > expected;
    }
    throw new TypeMismatchError(
      `Operator GREATER_THAN requires both values to be numbers or dates. Actual: ${typeof actual}, Expected: ${typeof expected}`,
    );
  },

  GREATER_THAN_OR_EQUAL: (actual: unknown, expected: unknown): boolean => {
    if (isDateLike(actual) && isDateLike(expected)) {
      return toTimestamp(actual) >= toTimestamp(expected);
    }
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (isNaN(actual) || isNaN(expected)) {
        throw new TypeMismatchError('Cannot compare NaN in numeric condition');
      }
      return actual >= expected;
    }
    throw new TypeMismatchError(
      `Operator GREATER_THAN_OR_EQUAL requires both values to be numbers or dates. Actual: ${typeof actual}, Expected: ${typeof expected}`,
    );
  },

  LESS_THAN: (actual: unknown, expected: unknown): boolean => {
    if (isDateLike(actual) && isDateLike(expected)) {
      return toTimestamp(actual) < toTimestamp(expected);
    }
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (isNaN(actual) || isNaN(expected)) {
        throw new TypeMismatchError('Cannot compare NaN in numeric condition');
      }
      return actual < expected;
    }
    throw new TypeMismatchError(
      `Operator LESS_THAN requires both values to be numbers or dates. Actual: ${typeof actual}, Expected: ${typeof expected}`,
    );
  },

  LESS_THAN_OR_EQUAL: (actual: unknown, expected: unknown): boolean => {
    if (isDateLike(actual) && isDateLike(expected)) {
      return toTimestamp(actual) <= toTimestamp(expected);
    }
    if (typeof actual === 'number' && typeof expected === 'number') {
      if (isNaN(actual) || isNaN(expected)) {
        throw new TypeMismatchError('Cannot compare NaN in numeric condition');
      }
      return actual <= expected;
    }
    throw new TypeMismatchError(
      `Operator LESS_THAN_OR_EQUAL requires both values to be numbers or dates. Actual: ${typeof actual}, Expected: ${typeof expected}`,
    );
  },

  IN: (actual: unknown, expected: unknown): boolean => {
    if (!Array.isArray(expected)) {
      throw new TypeMismatchError(`Operator IN requires expected value to be an Array, received: ${typeof expected}`);
    }
    if (isDateLike(actual)) {
      const actualTs = toTimestamp(actual);
      return expected.some((item) => isDateLike(item) && toTimestamp(item) === actualTs);
    }
    return expected.includes(actual);
  },

  NOT_IN: (actual: unknown, expected: unknown): boolean => {
    return !OPERATOR_REGISTRY.IN(actual, expected);
  },

  CONTAINS: (actual: unknown, expected: unknown): boolean => {
    if (Array.isArray(actual)) {
      if (isDateLike(expected)) {
        const expectedTs = toTimestamp(expected);
        return actual.some((item) => isDateLike(item) && toTimestamp(item) === expectedTs);
      }
      return actual.includes(expected);
    }
    if (typeof actual === 'string') {
      if (typeof expected !== 'string') {
        throw new TypeMismatchError(`String CONTAINS requires expected value to be string, received: ${typeof expected}`);
      }
      return actual.includes(expected);
    }
    throw new TypeMismatchError(
      `Operator CONTAINS requires actual value to be an Array or string, received: ${typeof actual}`,
    );
  },

  NOT_CONTAINS: (actual: unknown, expected: unknown): boolean => {
    return !OPERATOR_REGISTRY.CONTAINS(actual, expected);
  },

  EXISTS: (actual: unknown): boolean => {
    return actual !== undefined && actual !== null;
  },

  NOT_EXISTS: (actual: unknown): boolean => {
    return actual === undefined || actual === null;
  },
};

export function getOperator(operator: string): OperatorFn {
  const fn = OPERATOR_REGISTRY[operator as RuleOperator];
  if (!fn) {
    throw new UnknownOperatorError(operator);
  }
  return fn;
}
