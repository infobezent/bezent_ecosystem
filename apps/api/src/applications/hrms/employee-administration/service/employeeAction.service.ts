import { randomUUID } from 'node:crypto';
import { EmployeeActionRepository } from '../repository/employeeAction.repository.js';
import { EmployeeRepository } from '../../employees/repository/employee.repository.js';
import { OrganizationRepository } from '../../organization/repository/organization.repository.js';
import type {
  EmployeeDetails,
  EmploymentStatus,
  EmploymentType,
} from '../../employees/types/employee.types.js';
import {
  ACTION_VALUE_RULES,
  isSeparationType,
  validateActionValues,
  validateApplyEmployeeAction,
  validateCancelEmployeeAction,
  validateCreateEmployeeAction,
  validateListEmployeeActionsQuery,
  validateUpdateEmployeeAction,
} from '../validation/employeeAction.schema.js';
import type {
  ChangeableEmployeeField,
  EmployeeActionChangeSet,
  EmployeeActionDetail,
  EmployeeActionHistoryEvent,
  EmployeeActionListItem,
  EmployeeActionStatus,
  EmployeeActionType,
  EmployeeActionValues,
  EmployeeFieldChange,
  PaginatedEmployeeActionsResult,
} from '../types/employeeAction.types.js';
import type { NewEmployeeActionHistory } from '../../../../db/schema.js';
import type { EmploymentFieldUpdate } from '../../employees/repository/employee.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  probation: 'Probation',
  notice: 'Notice Period',
  terminated: 'Terminated',
  suspended: 'Suspended',
  resigned: 'Resigned',
};

const SEPARATED_STATUSES: EmploymentStatus[] = ['resigned', 'terminated'];
const MASTER_FIELDS: ChangeableEmployeeField[] = ['departmentId', 'designationId', 'locationId'];
const MAX_REPORTING_CHAIN_DEPTH = 100;

type MasterItem = { id: string; name: string };

/** Server-local calendar date as YYYY-MM-DD. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isSeparated(employee: Pick<EmployeeDetails, 'employmentStatus'>): boolean {
  return SEPARATED_STATUSES.includes(employee.employmentStatus);
}

function change(
  field: ChangeableEmployeeField,
  from: string | null,
  fromLabel: string | null,
  to: string | null,
  toLabel: string | null,
): EmployeeFieldChange {
  return { field, from, fromLabel: from === null ? null : fromLabel, to, toLabel };
}

export class EmployeeActionService {
  constructor(
    private readonly repo = new EmployeeActionRepository(),
    private readonly employeeRepo = new EmployeeRepository(),
    private readonly orgRepo = new OrganizationRepository(),
    private readonly today: () => string = todayIsoDate,
  ) {}

  // ==========================================================================
  // Queries
  // ==========================================================================

  async listActions(
    tenantId: string,
    companyId: string,
    query: Record<string, unknown> = {},
  ): Promise<PaginatedEmployeeActionsResult> {
    return this.repo.list(tenantId, companyId, validateListEmployeeActionsQuery(query));
  }

  async getActionDetail(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<EmployeeActionDetail> {
    const action = await this.requireAction(tenantId, companyId, id);
    const [employee, history] = await Promise.all([
      this.employeeRepo.getById(tenantId, companyId, action.employeeId),
      this.repo.getHistory(tenantId, companyId, id),
    ]);

    if (!employee) {
      throw new NotFoundError(`Employee action not found for ID: ${id}`);
    }

    return { ...action, employee, history };
  }

  // ==========================================================================
  // Commands
  // ==========================================================================

  async createAction(
    tenantId: string,
    companyId: string,
    input: unknown,
    actor: string | null,
  ): Promise<EmployeeActionDetail> {
    const dto = validateCreateEmployeeAction(input);
    const employee = await this.requireEmployee(tenantId, companyId, dto.employeeId);

    // Separations default their effective date to the last working date.
    const effectiveDate = dto.effectiveDate ?? dto.values.lastWorkingDate!;

    const changeSet = await this.buildChangeSet(
      tenantId,
      companyId,
      employee,
      dto.actionType,
      dto.values,
      effectiveDate,
    );
    await this.assertNoConflictingPendingAction(tenantId, companyId, employee.id, changeSet, null);

    const id = `ea_${randomUUID()}`;
    // Timestamps come from the application clock (like appliedAt/cancelledAt and
    // history), so a request's lifecycle times never mix two clock sources.
    const now = new Date();

    await this.repo.transaction(async (tx) => {
      await this.repo.insertAction(tx, {
        id,
        tenantId,
        companyId,
        employeeId: employee.id,
        actionType: dto.actionType,
        status: 'pending',
        effectiveDate,
        reason: dto.reason,
        changeData: changeSet,
        requestedBy: actor,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      await this.repo.insertHistory(
        tx,
        this.historyRecord(tenantId, companyId, id, 'created', null, 'pending', null, actor),
      );
    });

    return this.getActionDetail(tenantId, companyId, id);
  }

  async updateAction(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor: string | null,
  ): Promise<EmployeeActionDetail> {
    const dto = validateUpdateEmployeeAction(input);
    const action = await this.requireAction(tenantId, companyId, id);
    this.assertPending(action, 'updated');
    this.assertVersion(action, dto.version);

    const employee = await this.requireEmployee(tenantId, companyId, action.employeeId);
    const previousValues = this.valuesFromAction(action);
    const values =
      dto.values !== undefined
        ? validateActionValues(action.actionType, dto.values)
        : previousValues;

    let effectiveDate = dto.effectiveDate ?? action.effectiveDate;
    if (
      dto.effectiveDate === undefined &&
      isSeparationType(action.actionType) &&
      action.effectiveDate === previousValues.lastWorkingDate
    ) {
      // Effective date was defaulted from the last working date — keep them aligned.
      effectiveDate = values.lastWorkingDate ?? effectiveDate;
    }

    const changeSet = await this.buildChangeSet(
      tenantId,
      companyId,
      employee,
      action.actionType,
      values,
      effectiveDate,
    );
    await this.assertNoConflictingPendingAction(tenantId, companyId, employee.id, changeSet, id);

    await this.repo.transaction(async (tx) => {
      const updated = await this.repo.updatePendingWithVersion(
        tx,
        tenantId,
        companyId,
        id,
        dto.version,
        {
          effectiveDate,
          reason: dto.reason ?? action.reason,
          changeData: changeSet,
        },
      );
      if (!updated) throw this.staleVersionError();

      await this.repo.insertHistory(
        tx,
        this.historyRecord(tenantId, companyId, id, 'updated', 'pending', 'pending', null, actor),
      );
    });

    return this.getActionDetail(tenantId, companyId, id);
  }

  async cancelAction(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor: string | null,
  ): Promise<EmployeeActionDetail> {
    const dto = validateCancelEmployeeAction(input);
    const action = await this.requireAction(tenantId, companyId, id);
    this.assertPending(action, 'cancelled');
    this.assertVersion(action, dto.version);

    await this.repo.transaction(async (tx) => {
      const updated = await this.repo.updatePendingWithVersion(
        tx,
        tenantId,
        companyId,
        id,
        dto.version,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      );
      if (!updated) throw this.staleVersionError();

      await this.repo.insertHistory(
        tx,
        this.historyRecord(
          tenantId,
          companyId,
          id,
          'cancelled',
          'pending',
          'cancelled',
          dto.reason,
          actor,
        ),
      );
    });

    return this.getActionDetail(tenantId, companyId, id);
  }

  /**
   * Applies a pending action to the canonical employee record. The action
   * status change, the employee update, and the history entry commit
   * together or not at all.
   */
  async applyAction(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor: string | null,
  ): Promise<EmployeeActionDetail> {
    const dto = validateApplyEmployeeAction(input);
    const action = await this.requireAction(tenantId, companyId, id);
    this.assertPending(action, 'applied');
    this.assertVersion(action, dto.version);

    if (action.effectiveDate > this.today()) {
      throw new ConflictError(
        `This action becomes effective on ${action.effectiveDate} and cannot be applied before then`,
        'NOT_YET_EFFECTIVE',
      );
    }

    const employee = await this.requireEmployee(tenantId, companyId, action.employeeId);
    if (isSeparated(employee)) {
      throw new ConflictError(
        'This employee has already been separated; the action can no longer be applied',
        'EMPLOYEE_SEPARATED',
      );
    }

    // Stale check: the employee must still hold the values captured at request time.
    for (const fieldChange of action.changes) {
      if (this.currentValue(employee, fieldChange.field) !== fieldChange.from) {
        throw new ConflictError(
          'The employee record has changed since this action was requested. Cancel it and create a new action.',
          'STALE_ACTION',
        );
      }
    }

    await this.assertReferencesStillValid(tenantId, companyId, employee, action.changes);

    const employeeUpdate = Object.fromEntries(
      action.changes.map((fieldChange) => [fieldChange.field, fieldChange.to]),
    ) as EmploymentFieldUpdate;

    await this.repo.transaction(async (tx) => {
      const marked = await this.repo.updatePendingWithVersion(
        tx,
        tenantId,
        companyId,
        id,
        dto.version,
        {
          status: 'applied',
          appliedAt: new Date(),
        },
      );
      if (!marked) throw this.staleVersionError();

      const updated = await this.employeeRepo.updateEmploymentFields(
        tx,
        tenantId,
        companyId,
        employee.id,
        employeeUpdate,
      );
      if (!updated) {
        throw new ConflictError('Employee record could not be updated', 'STALE_ACTION');
      }

      await this.repo.insertHistory(
        tx,
        this.historyRecord(tenantId, companyId, id, 'applied', 'pending', 'applied', null, actor),
      );
    });

    return this.getActionDetail(tenantId, companyId, id);
  }

  // ==========================================================================
  // Business rules
  // ==========================================================================

  /**
   * Validates an action against the employee's current state and organization
   * masters, and captures old → new values (with labels) for every field it
   * will change.
   */
  private async buildChangeSet(
    tenantId: string,
    companyId: string,
    employee: EmployeeDetails,
    actionType: EmployeeActionType,
    values: EmployeeActionValues,
    effectiveDate: string,
  ): Promise<EmployeeActionChangeSet> {
    if (isSeparated(employee)) {
      throw new ConflictError(
        'This employee has already been separated; no further employment actions are allowed',
        'EMPLOYEE_SEPARATED',
      );
    }

    if (effectiveDate < employee.joiningDate) {
      throw new BadRequestError(
        `Effective date cannot be before the employee's joining date (${employee.joiningDate})`,
        'INVALID_EFFECTIVE_DATE',
      );
    }

    const changes: EmployeeFieldChange[] = [];

    switch (actionType) {
      case 'department_change': {
        const masters = await this.orgRepo.getMasters(tenantId, companyId);
        const department = this.requireMaster(
          masters.departments,
          values.departmentId!,
          'Department',
        );
        this.assertDiffers(department.id, employee.departmentId, 'department');
        changes.push(
          change(
            'departmentId',
            employee.departmentId,
            employee.departmentName,
            department.id,
            department.name,
          ),
        );

        if (values.designationId) {
          const designation = this.requireMaster(
            masters.designations,
            values.designationId,
            'Designation',
          );
          if (designation.id !== employee.designationId) {
            changes.push(
              change(
                'designationId',
                employee.designationId,
                employee.designationName,
                designation.id,
                designation.name,
              ),
            );
          }
        }

        if (values.reportingManagerId) {
          const reportingManager = await this.requireReportingManager(
            tenantId,
            companyId,
            employee,
            values.reportingManagerId,
          );
          if (reportingManager.id !== employee.reportingManagerId) {
            changes.push(
              change(
                'reportingManagerId',
                employee.reportingManagerId,
                employee.reportingManagerName,
                reportingManager.id,
                reportingManager.fullName,
              ),
            );
          }
        }
        break;
      }

      case 'designation_change': {
        const masters = await this.orgRepo.getMasters(tenantId, companyId);
        const designation = this.requireMaster(
          masters.designations,
          values.designationId!,
          'Designation',
        );
        this.assertDiffers(designation.id, employee.designationId, 'designation');
        changes.push(
          change(
            'designationId',
            employee.designationId,
            employee.designationName,
            designation.id,
            designation.name,
          ),
        );
        break;
      }

      case 'location_transfer': {
        const masters = await this.orgRepo.getMasters(tenantId, companyId);
        const location = this.requireMaster(masters.locations, values.locationId!, 'Location');
        this.assertDiffers(location.id, employee.locationId, 'location');
        changes.push(
          change(
            'locationId',
            employee.locationId,
            employee.locationName,
            location.id,
            location.name,
          ),
        );
        break;
      }

      case 'reporting_manager_change': {
        const reportingManager = await this.requireReportingManager(
          tenantId,
          companyId,
          employee,
          values.reportingManagerId!,
        );
        this.assertDiffers(reportingManager.id, employee.reportingManagerId, 'reporting manager');
        changes.push(
          change(
            'reportingManagerId',
            employee.reportingManagerId,
            employee.reportingManagerName,
            reportingManager.id,
            reportingManager.fullName,
          ),
        );
        break;
      }

      case 'employment_type_change': {
        const employmentType = values.employmentType!;
        this.assertDiffers(employmentType, employee.employmentType, 'employment type');
        changes.push(
          change(
            'employmentType',
            employee.employmentType,
            EMPLOYMENT_TYPE_LABELS[employee.employmentType],
            employmentType,
            EMPLOYMENT_TYPE_LABELS[employmentType],
          ),
        );
        break;
      }

      case 'confirm_employee': {
        this.assertOnProbation(employee);
        changes.push(
          change(
            'employmentStatus',
            'probation',
            EMPLOYMENT_STATUS_LABELS.probation,
            'active',
            EMPLOYMENT_STATUS_LABELS.active,
          ),
          change(
            'confirmationDate',
            employee.confirmationDate,
            employee.confirmationDate,
            effectiveDate,
            effectiveDate,
          ),
        );
        break;
      }

      case 'extend_probation': {
        this.assertOnProbation(employee);
        const newEnd = values.probationEndDate!;
        const currentEnd = employee.probationEndDate ?? employee.joiningDate;
        if (newEnd <= currentEnd) {
          throw new BadRequestError(
            `New probation end date must be after ${currentEnd}`,
            'INVALID_PROBATION_DATE',
          );
        }
        changes.push(
          change(
            'probationEndDate',
            employee.probationEndDate,
            employee.probationEndDate,
            newEnd,
            newEnd,
          ),
        );
        break;
      }

      case 'employment_status_change': {
        const status = values.employmentStatus!;
        this.assertDiffers(status, employee.employmentStatus, 'employment status');
        if (employee.employmentStatus === 'probation' && status === 'active') {
          throw new BadRequestError(
            'Use the Confirm Employee action to end probation',
            'USE_CONFIRMATION',
          );
        }
        changes.push(
          change(
            'employmentStatus',
            employee.employmentStatus,
            EMPLOYMENT_STATUS_LABELS[employee.employmentStatus],
            status,
            EMPLOYMENT_STATUS_LABELS[status],
          ),
        );
        break;
      }

      case 'resignation':
      case 'termination': {
        const lastWorkingDate = values.lastWorkingDate!;
        if (lastWorkingDate < employee.joiningDate) {
          throw new BadRequestError(
            `Last working date cannot be before the employee's joining date (${employee.joiningDate})`,
            'INVALID_LAST_WORKING_DATE',
          );
        }
        if (effectiveDate < lastWorkingDate) {
          throw new BadRequestError(
            'Effective date cannot be before the last working date',
            'INVALID_EFFECTIVE_DATE',
          );
        }
        const separatedStatus: EmploymentStatus =
          actionType === 'resignation' ? 'resigned' : 'terminated';
        changes.push(
          change(
            'employmentStatus',
            employee.employmentStatus,
            EMPLOYMENT_STATUS_LABELS[employee.employmentStatus],
            separatedStatus,
            EMPLOYMENT_STATUS_LABELS[separatedStatus],
          ),
          change(
            'lastWorkingDate',
            employee.lastWorkingDate,
            employee.lastWorkingDate,
            lastWorkingDate,
            lastWorkingDate,
          ),
        );
        return { changes, requestDate: values.requestDate ?? null };
      }
    }

    return { changes };
  }

  /** At apply time, referenced masters and managers must still be valid for the company. */
  private async assertReferencesStillValid(
    tenantId: string,
    companyId: string,
    employee: EmployeeDetails,
    changes: EmployeeFieldChange[],
  ): Promise<void> {
    const masterChanges = changes.filter((c) => MASTER_FIELDS.includes(c.field) && c.to);
    if (masterChanges.length > 0) {
      const masters = await this.orgRepo.getMasters(tenantId, companyId);
      const lists: Record<string, { items: MasterItem[]; label: string }> = {
        departmentId: { items: masters.departments, label: 'Department' },
        designationId: { items: masters.designations, label: 'Designation' },
        locationId: { items: masters.locations, label: 'Location' },
      };
      for (const masterChange of masterChanges) {
        const list = lists[masterChange.field]!;
        this.requireMaster(list.items, masterChange.to!, list.label);
      }
    }

    const managerChange = changes.find((c) => c.field === 'reportingManagerId' && c.to);
    if (managerChange) {
      await this.requireReportingManager(tenantId, companyId, employee, managerChange.to!);
    }
  }

  private async assertNoConflictingPendingAction(
    tenantId: string,
    companyId: string,
    employeeId: string,
    changeSet: EmployeeActionChangeSet,
    excludeActionId: string | null,
  ): Promise<void> {
    const fields = new Set(changeSet.changes.map((c) => c.field));
    const pending = await this.repo.listPendingForEmployee(tenantId, companyId, employeeId);
    const conflicting = pending.find(
      (action) => action.id !== excludeActionId && action.changes.some((c) => fields.has(c.field)),
    );

    if (conflicting) {
      throw new ConflictError(
        'A pending action already changes the same employee details. Apply or cancel it first.',
        'PENDING_ACTION_EXISTS',
      );
    }
  }

  private requireMaster(items: MasterItem[], id: string, label: string): MasterItem {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) {
      throw new BadRequestError(
        `${label} '${id}' does not exist or does not belong to this company`,
        `INVALID_${label.toUpperCase()}`,
      );
    }
    return item;
  }

  private async requireReportingManager(
    tenantId: string,
    companyId: string,
    employee: EmployeeDetails,
    managerId: string,
  ): Promise<EmployeeDetails> {
    if (managerId === employee.id) {
      throw new BadRequestError(
        'An employee cannot report to themselves',
        'INVALID_REPORTING_MANAGER',
      );
    }

    const reportingManager = await this.employeeRepo.getById(tenantId, companyId, managerId);
    if (!reportingManager) {
      throw new BadRequestError(
        `Reporting manager '${managerId}' does not exist or does not belong to this company`,
        'INVALID_REPORTING_MANAGER',
      );
    }
    if (isSeparated(reportingManager)) {
      throw new BadRequestError(
        'A separated employee cannot be assigned as reporting manager',
        'INVALID_REPORTING_MANAGER',
      );
    }

    // Reject reporting cycles: walk up from the proposed manager.
    let cursor = reportingManager.reportingManagerId;
    for (let depth = 0; cursor && depth < MAX_REPORTING_CHAIN_DEPTH; depth += 1) {
      if (cursor === employee.id) {
        throw new BadRequestError(
          'This reporting manager would create a reporting cycle',
          'INVALID_REPORTING_MANAGER',
        );
      }
      const next = await this.employeeRepo.getById(tenantId, companyId, cursor);
      cursor = next?.reportingManagerId ?? null;
    }

    return reportingManager;
  }

  private assertDiffers(next: string, current: string | null, label: string): void {
    if (next === current) {
      throw new BadRequestError(
        `The new ${label} is the same as the current ${label}`,
        'NO_CHANGE',
      );
    }
  }

  private assertOnProbation(employee: EmployeeDetails): void {
    if (employee.employmentStatus !== 'probation') {
      throw new ConflictError('This employee is not on probation', 'EMPLOYEE_NOT_ON_PROBATION');
    }
  }

  private assertPending(action: EmployeeActionListItem, verb: string): void {
    if (action.status !== 'pending') {
      throw new ConflictError(
        `A ${action.status} action cannot be ${verb}`,
        'INVALID_ACTION_TRANSITION',
      );
    }
  }

  private assertVersion(action: EmployeeActionListItem, version: number): void {
    if (action.version !== version) {
      throw this.staleVersionError();
    }
  }

  private staleVersionError(): ConflictError {
    return new ConflictError(
      'This action was modified by another request. Reload and try again.',
      'STALE_VERSION',
    );
  }

  private currentValue(employee: EmployeeDetails, field: ChangeableEmployeeField): string | null {
    return employee[field] ?? null;
  }

  /** Reconstructs the requested values of a stored action (for partial updates). */
  private valuesFromAction(action: EmployeeActionListItem): EmployeeActionValues {
    const rule = ACTION_VALUE_RULES[action.actionType];
    const allowed = new Set<string>([...rule.required, ...rule.optional]);
    const values: Record<string, string> = {};
    for (const fieldChange of action.changes) {
      if (allowed.has(fieldChange.field) && fieldChange.to) {
        values[fieldChange.field] = fieldChange.to;
      }
    }
    if (allowed.has('requestDate') && action.requestDate) {
      values.requestDate = action.requestDate;
    }
    return values as EmployeeActionValues;
  }

  private async requireAction(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<EmployeeActionListItem> {
    const action = await this.repo.getById(tenantId, companyId, id);
    if (!action) {
      throw new NotFoundError(`Employee action not found for ID: ${id}`);
    }
    return action;
  }

  private async requireEmployee(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeDetails> {
    const employee = await this.employeeRepo.getById(tenantId, companyId, employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee not found for ID: ${employeeId}`);
    }
    return employee;
  }

  private historyRecord(
    tenantId: string,
    companyId: string,
    actionId: string,
    event: EmployeeActionHistoryEvent,
    fromStatus: EmployeeActionStatus | null,
    toStatus: EmployeeActionStatus,
    notes: string | null,
    actor: string | null,
  ): NewEmployeeActionHistory {
    return {
      id: `eah_${Date.now()}_${randomUUID().slice(0, 8)}`,
      tenantId,
      companyId,
      actionId,
      event,
      fromStatus,
      toStatus,
      notes,
      actor,
      createdAt: new Date(),
    };
  }
}
