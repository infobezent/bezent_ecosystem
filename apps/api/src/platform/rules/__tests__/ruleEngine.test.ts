import { describe, it, expect } from 'vitest';
import {
  ruleEngine,
  type Rule,
  type RuleOperator,
  UnknownOperatorError,
  TypeMismatchError,
  InvalidRuleError,
  MissingFactError,
} from '../index.js';

describe('BEZENT Platform Rules Engine', () => {
  describe('Operator Registry', () => {
    it('evaluates EQUALS and NOT_EQUALS correctly across primitives', () => {
      const ruleEquals: Rule = {
        id: 'test.equals',
        name: 'Equals Test',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'strVal', operator: 'EQUALS', value: 'active' },
            { fact: 'numVal', operator: 'EQUALS', value: 42 },
            { fact: 'boolVal', operator: 'EQUALS', value: false },
            { fact: 'nullVal', operator: 'EQUALS', value: null },
            { fact: 'strVal', operator: 'NOT_EQUALS', value: 'inactive' },
          ],
        },
      };

      const facts = {
        strVal: 'active',
        numVal: 42,
        boolVal: false,
        nullVal: null,
      };

      const res = ruleEngine.evaluate(ruleEquals, facts);
      expect(res.matched).toBe(true);
      expect(res.failedConditions).toHaveLength(0);
    });

    it('evaluates GREATER_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL for numbers', () => {
      const rule: Rule = {
        id: 'test.relational',
        name: 'Relational Numbers',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'score', operator: 'GREATER_THAN', value: 80 },
            { fact: 'score', operator: 'GREATER_THAN_OR_EQUAL', value: 85 },
            { fact: 'score', operator: 'LESS_THAN', value: 90 },
            { fact: 'score', operator: 'LESS_THAN_OR_EQUAL', value: 85 },
          ],
        },
      };

      const facts = { score: 85 };
      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });

    it('evaluates relational operators for dates without coercion pitfalls', () => {
      const rule: Rule = {
        id: 'test.dates',
        name: 'Date Comparisons',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'startDate', operator: 'GREATER_THAN_OR_EQUAL', value: '2026-01-01' },
            { fact: 'startDate', operator: 'LESS_THAN', value: new Date('2026-12-31') },
          ],
        },
      };

      const facts = { startDate: '2026-06-15' };
      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });

    it('evaluates IN and NOT_IN with arrays', () => {
      const rule: Rule = {
        id: 'test.in',
        name: 'In Operator',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'role', operator: 'IN', value: ['admin', 'manager', 'lead'] },
            { fact: 'role', operator: 'NOT_IN', value: ['guest', 'external'] },
          ],
        },
      };

      const facts = { role: 'manager' };
      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });

    it('evaluates CONTAINS and NOT_CONTAINS for arrays and strings', () => {
      const rule: Rule = {
        id: 'test.contains',
        name: 'Contains Operator',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'tags', operator: 'CONTAINS', value: 'priority' },
            { fact: 'tags', operator: 'NOT_CONTAINS', value: 'archived' },
            { fact: 'email', operator: 'CONTAINS', value: '@bezent.com' },
            { fact: 'email', operator: 'NOT_CONTAINS', value: 'spam' },
          ],
        },
      };

      const facts = {
        tags: ['billing', 'priority', 'client'],
        email: 'alex@bezent.com',
      };

      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });

    it('evaluates EXISTS and NOT_EXISTS correctly', () => {
      const rule: Rule = {
        id: 'test.exists',
        name: 'Exists Operator',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'profile.phone', operator: 'EXISTS' },
            { fact: 'profile.middleName', operator: 'NOT_EXISTS' },
            { fact: 'missingKey', operator: 'NOT_EXISTS' },
          ],
        },
      };

      const facts = {
        profile: {
          phone: '+1-555-0100',
          middleName: null,
        },
      };

      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });
  });

  describe('Condition Groups and Logical Combinators', () => {
    it('evaluates ALL combinator (conjunction)', () => {
      const rule: Rule = {
        id: 'test.all',
        name: 'Conjunction',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'a', operator: 'EQUALS', value: 1 },
            { fact: 'b', operator: 'EQUALS', value: 2 },
          ],
        },
      };

      expect(ruleEngine.evaluate(rule, { a: 1, b: 2 }).matched).toBe(true);
      expect(ruleEngine.evaluate(rule, { a: 1, b: 3 }).matched).toBe(false);
    });

    it('evaluates ANY combinator (disjunction)', () => {
      const rule: Rule = {
        id: 'test.any',
        name: 'Disjunction',
        conditions: {
          combinator: 'ANY',
          conditions: [
            { fact: 'role', operator: 'EQUALS', value: 'super_admin' },
            { fact: 'tier', operator: 'EQUALS', value: 'enterprise' },
          ],
        },
      };

      expect(ruleEngine.evaluate(rule, { role: 'user', tier: 'enterprise' }).matched).toBe(true);
      expect(ruleEngine.evaluate(rule, { role: 'guest', tier: 'free' }).matched).toBe(false);
    });

    it('evaluates nested condition groups cleanly and predictably', () => {
      const rule: Rule = {
        id: 'test.nested',
        name: 'Nested Groups',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'status', operator: 'EQUALS', value: 'active' },
            {
              combinator: 'ANY',
              conditions: [
                { fact: 'department', operator: 'EQUALS', value: 'Engineering' },
                {
                  combinator: 'ALL',
                  conditions: [
                    { fact: 'department', operator: 'EQUALS', value: 'Sales' },
                    { fact: 'quotaMet', operator: 'EQUALS', value: true },
                  ],
                },
              ],
            },
          ],
        },
      };

      expect(
        ruleEngine.evaluate(rule, { status: 'active', department: 'Engineering' }).matched,
      ).toBe(true);
      expect(
        ruleEngine.evaluate(rule, { status: 'active', department: 'Sales', quotaMet: true }).matched,
      ).toBe(true);
      expect(
        ruleEngine.evaluate(rule, { status: 'active', department: 'Sales', quotaMet: false }).matched,
      ).toBe(false);
    });
  });

  describe('Fact References and Dynamic Fact Comparisons', () => {
    it('evaluates fact references comparing two dynamic facts', () => {
      const rule: Rule = {
        id: 'test.fact_ref',
        name: 'Fact Reference Test',
        conditions: {
          fact: 'availableDays',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: { fact: 'requestedDays' },
        },
      };

      expect(ruleEngine.evaluate(rule, { availableDays: 10, requestedDays: 5 }).matched).toBe(true);
      expect(ruleEngine.evaluate(rule, { availableDays: 5, requestedDays: 5 }).matched).toBe(true);
      expect(ruleEngine.evaluate(rule, { availableDays: 3, requestedDays: 5 }).matched).toBe(false);
    });

    it('throws MissingFactError when referenced expected fact does not exist', () => {
      const rule: Rule = {
        id: 'test.missing_ref',
        name: 'Missing Fact Ref',
        conditions: {
          fact: 'availableDays',
          operator: 'GREATER_THAN',
          value: { fact: 'nonExistentFact' },
        },
      };

      expect(() => ruleEngine.evaluate(rule, { availableDays: 10 })).toThrow(MissingFactError);
    });
  });

  describe('Edge Cases and Type Safety', () => {
    it('handles false boolean, zero number, empty string, and empty array correctly', () => {
      const rule: Rule = {
        id: 'test.falsy',
        name: 'Falsy Primitives',
        conditions: {
          combinator: 'ALL',
          conditions: [
            { fact: 'zeroNum', operator: 'EQUALS', value: 0 },
            { fact: 'falseBool', operator: 'EQUALS', value: false },
            { fact: 'emptyStr', operator: 'EQUALS', value: '' },
            { fact: 'emptyArr', operator: 'EQUALS', value: [] },
          ],
        },
      };

      const facts = {
        zeroNum: 0,
        falseBool: false,
        emptyStr: '',
        emptyArr: [],
      };

      const res = ruleEngine.evaluate(rule, facts);
      expect(res.matched).toBe(true);
    });

    it('throws TypeMismatchError when string is compared numerically with number', () => {
      const rule: Rule = {
        id: 'test.coercion',
        name: 'No String Coercion',
        conditions: {
          fact: 'strNum',
          operator: 'GREATER_THAN',
          value: 2,
        },
      };

      expect(() => ruleEngine.evaluate(rule, { strNum: '10' })).toThrow(TypeMismatchError);
    });

    it('throws UnknownOperatorError when an unknown operator is supplied', () => {
      const rule: Rule = {
        id: 'test.unknown_op',
        name: 'Unknown Operator',
        conditions: {
          fact: 'val',
          operator: 'MATCHES_REGEX' as unknown as RuleOperator,
          value: '.*',
        },
      };

      expect(() => ruleEngine.evaluate(rule, { val: 'test' })).toThrow(UnknownOperatorError);
    });

    it('throws InvalidRuleError when rule is malformed', () => {
      expect(() => ruleEngine.evaluate(null as unknown as Rule, {})).toThrow(InvalidRuleError);
      expect(() => ruleEngine.evaluate({ id: '' } as unknown as Rule, {})).toThrow(InvalidRuleError);
      expect(() => ruleEngine.evaluate({ id: '1', name: '' } as unknown as Rule, {})).toThrow(InvalidRuleError);
    });

    it('guarantees deterministic evaluation when called repeatedly', () => {
      const rule: Rule = {
        id: 'test.deterministic',
        name: 'Deterministic',
        conditions: {
          fact: 'score',
          operator: 'GREATER_THAN',
          value: 50,
        },
      };

      const facts = { score: 75 };
      const run1 = ruleEngine.evaluate(rule, facts);
      const run2 = ruleEngine.evaluate(rule, facts);
      const run3 = ruleEngine.evaluate(rule, facts);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });
  });
});
