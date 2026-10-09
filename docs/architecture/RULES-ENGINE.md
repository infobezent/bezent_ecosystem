# BEZENT Platform Rules Engine

The **BEZENT Rules Engine** (`apps/api/src/platform/rules`) is a generic, in-memory, deterministic business-rule evaluation capability.

---

## Architectural Principle

- **RULES ENGINE = HOW a rule is evaluated**
  Generic conditions, pure operator logic, fact-based comparisons, structured outcome metadata.
- **APPLICATION DOMAIN = WHAT a rule means and when it is used**
  Domain context, fact gathering, deciding which rule to evaluate, and executing business actions or throwing domain errors based on the evaluation result.

```
Application Domain (e.g., HRMS Leave)
         ↓
Constructs domain facts / selects rule
         ↓
Platform Rules Engine (platform/rules)
         ↓
Evaluates generic conditions deterministically (in-memory)
         ↓
Returns structured RuleEvaluationResult
         ↓
Application Domain Service
         ↓
Decides and executes business action
```

`platform/rules` **must remain strictly domain-agnostic**. It never contains domain-specific files such as `leavePolicy.ts`, `attendancePolicy.ts`, `payrollRule.ts`, or `employeeRule.ts`. Those live inside their owning domains.

---

## What the Rules Engine IS vs. What It IS NOT

### The Rules Engine IS:
- **A generic evaluator:** Pure, synchronous, side-effect free in-memory condition evaluator.
- **A condition / operator model:** Atomic conditions and composable groups (`ALL`, `ANY`).
- **Fact-based:** Evaluates runtime facts passed as explicit data dictionaries without arbitrary access to `req`, `db`, or full entities.
- **Domain-neutral:** Knows only fact keys, operators, expected values, and actual values.
- **Deterministic:** Repeated evaluation with identical facts always yields identical outcomes.

### The Rules Engine IS NOT:
- **NOT RBAC / Authorization:** Permission checks, company access, and role assignments remain in `platform/access`. Never replace `requirePermission()` with rule evaluation.
- **NOT DTO / Schema Validation:** Request body parsing and structural types remain in Zod schemas under `validation/`.
- **NOT Common Data Validation:** Syntax, format, postal code, phone, and address rules remain in `platform/data/`.
- **NOT Technical Media Policies:** MIME type, max file size, and image dimension validation remain in `platform/media/` and file policies.
- **NOT a Workflow / State Machine Engine:** Multi-step case transitions, lifecycle statuses (e.g., `draft` -> `active`, `ACTIVE` -> `TERMINATED`), and approvals remain in their owning services.
- **NOT an Arithmetic Calculator:** Raw payroll formulas or attendance hour subtractions (`workedMinutes = clockOut - clockIn`) remain in domain services.
- **NOT a Database Query Engine:** No database queries or external I/O are performed inside condition evaluators.
- **NOT an Arbitrary JavaScript Execution Engine:** No `eval()`, `new Function()`, or dynamic scripting. Rule definitions are pure data.

---

## Controlled Operator Registry

The engine exposes 12 strictly typed, deterministic operators:

| Operator | Purpose | Type Enforcement |
| :--- | :--- | :--- |
| `EQUALS` | Strict equality | Strict primitives, arrays (element-wise), dates |
| `NOT_EQUALS` | Negation of `EQUALS` | Same as `EQUALS` |
| `GREATER_THAN` | Relational strictly greater | Numbers or Dates (no string-number coercion) |
| `GREATER_THAN_OR_EQUAL` | Relational greater than or equal | Numbers or Dates |
| `LESS_THAN` | Relational strictly less | Numbers or Dates |
| `LESS_THAN_OR_EQUAL` | Relational less than or equal | Numbers or Dates |
| `IN` | Inclusion in array | Expected value must be an Array |
| `NOT_IN` | Exclusion from array | Expected value must be an Array |
| `CONTAINS` | Substring or array element match | Actual must be string or Array |
| `NOT_CONTAINS` | Negation of `CONTAINS` | Actual must be string or Array |
| `EXISTS` | Fact presence check | Value is neither `undefined` nor `null` |
| `NOT_EXISTS` | Fact absence check | Value is `undefined` or `null` |

---

## Domain Ownership Example

### HRMS Leave Domain (`applications/hrms/leave/`)

1. **Rule Definition (`rules/leaveRules.ts`):**
```typescript
export const LEAVE_BALANCE_SUFFICIENCY_RULE: Rule = {
  id: 'hrms.leave.balance_sufficiency',
  name: 'Leave Balance Sufficiency Rule',
  conditions: {
    combinator: 'ANY',
    conditions: [
      {
        fact: 'requiresBalanceCheck',
        operator: 'EQUALS',
        value: false,
      },
      {
        combinator: 'ALL',
        conditions: [
          {
            fact: 'availableDays',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: { fact: 'requestedDays' },
          },
        ],
      },
    ],
  },
  outcome: {
    reasonCode: 'INSUFFICIENT_LEAVE_BALANCE',
  },
};
```

2. **Domain Service Evaluation (`service/leave.service.ts`):**
```typescript
const facts: LeaveBalanceRuleFacts = {
  leaveType: input.leaveType,
  requiresBalanceCheck: input.leaveType !== 'unpaid',
  availableDays: available,
  requestedDays: totalDays,
};

const result = ruleEngine.evaluate(LEAVE_BALANCE_SUFFICIENCY_RULE, facts);
if (!result.matched) {
  throw new BadRequestError(`Insufficient ${input.leaveType} leave balance...`);
}
```
