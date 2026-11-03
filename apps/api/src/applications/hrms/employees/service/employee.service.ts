import { EmployeeRepository } from '../repository/employee.repository.js';
import { EmployeeProfileService } from './employeeProfile.service.js';
import { OrganizationRepository } from '../../../../platform/organization/repository/organization.repository.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateListEmployeesParams,
} from '../validation/employee.schema.js';
import type {
  EmployeeDetails,
  PaginatedEmployeesResult,
  EmploymentStatus,
} from '../types/employee.types.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../../app/errors/AppError.js';
import { provisionUserForEmployee } from './employeeUserBridge.service.js';
import { workforceSettingsService } from '../../workforce/service/workforceSettings.service.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';

export interface EmployeeUpdateActor {
  userId?: string | null;
  email?: string | null;
}

function addDays(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export class EmployeeService {
  constructor(
    private readonly repo = new EmployeeRepository(),
    private readonly orgRepo = new OrganizationRepository(),
    private readonly profileService = new EmployeeProfileService(),
    private readonly audit: AuditService = auditService,
  ) {}

  private async validateOrgAssignments(
    tenantId: string,
    companyId: string,
    dto: {
      departmentId?: string | null;
      designationId?: string | null;
      locationId?: string | null;
    },
  ): Promise<void> {
    if (!dto.departmentId && !dto.designationId && !dto.locationId) {
      return;
    }

    const masters = await this.orgRepo.getMasters(tenantId, companyId);

    if (dto.departmentId) {
      const validDept = masters.departments.some((d: { id: string }) => d.id === dto.departmentId);
      if (!validDept) {
        throw new BadRequestError(
          `Department '${dto.departmentId}' does not exist or does not belong to this company`,
          'INVALID_DEPARTMENT',
        );
      }
    }

    if (dto.designationId) {
      const validDesig = masters.designations.some(
        (d: { id: string }) => d.id === dto.designationId,
      );
      if (!validDesig) {
        throw new BadRequestError(
          `Designation '${dto.designationId}' does not exist or does not belong to this company`,
          'INVALID_DESIGNATION',
        );
      }
    }

    if (dto.locationId) {
      const validLoc = masters.locations.some((l: { id: string }) => l.id === dto.locationId);
      if (!validLoc) {
        throw new BadRequestError(
          `Location '${dto.locationId}' does not exist or does not belong to this company`,
          'INVALID_LOCATION',
        );
      }
    }
  }

  private async validateReportingManager(
    tenantId: string,
    companyId: string,
    reportingManagerId: string | null | undefined,
  ): Promise<void> {
    if (!reportingManagerId) {
      return;
    }
    const managerRecord = await this.repo.getById(tenantId, companyId, reportingManagerId);
    if (!managerRecord) {
      throw new BadRequestError(
        `Reporting manager '${reportingManagerId}' does not exist or does not belong to this company`,
        'INVALID_REPORTING_MANAGER',
      );
    }
  }

  async getNextEmployeeNumber(
    tenantId: string,
    companyId: string,
    tx?: unknown,
  ): Promise<{ employeeNumber: string }> {
    const reserved = await workforceSettingsService.reserveNextEmployeeId(tenantId, companyId, tx);
    return { employeeNumber: reserved.nextId };
  }

  async resolveReferral(
    tenantId: string,
    companyId: string,
    referralCode: string,
  ): Promise<{
    id: string;
    employeeNumber: string;
    name: string;
    designationName: string | null;
    departmentName: string | null;
  }> {
    if (!referralCode || !referralCode.trim()) {
      throw new BadRequestError('Referral code is required', 'MISSING_REFERRAL_CODE');
    }
    const employee = await this.repo.getByReferralCode(tenantId, companyId, referralCode.trim());
    if (!employee) {
      throw new NotFoundError(`No eligible employee found with referral code '${referralCode}'`);
    }
    const name = employee.lastName
      ? `${employee.firstName} ${employee.lastName}`
      : employee.firstName;
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name,
      designationName: employee.designationName,
      departmentName: employee.departmentName,
    };
  }

  async createEmployee(
    tenantId: string,
    companyId: string,
    input: unknown,
    tx?: unknown,
    actor?: EmployeeUpdateActor | string,
  ): Promise<EmployeeDetails> {
    const inputObj =
      input && typeof input === 'object'
        ? { ...(input as Record<string, unknown>) }
        : ({} as Record<string, unknown>);

    const hasManualNumber =
      typeof inputObj.employeeNumber === 'string' && inputObj.employeeNumber.trim().length > 0;
    const isAutoNumber = !hasManualNumber;

    // Validate payload first using a temporary placeholder so that validation
    // failures do NOT consume an employee sequence number.
    const validatedDto = validateCreateEmployee(
      isAutoNumber ? { ...inputObj, employeeNumber: '__TEMP_RESERVED_PLACEHOLDER__' } : inputObj,
    );

    // 1. Check duplicate email within company early
    const existingByEmail = await this.repo.getByEmail(tenantId, companyId, validatedDto.email);
    if (existingByEmail) {
      throw new ConflictError(
        `Employee with email '${validatedDto.email}' already exists`,
        'EMPLOYEE_EMAIL_EXISTS',
      );
    }

    // 2. Verify organization masters (dept, desig, loc) and reporting manager early
    await this.validateOrgAssignments(tenantId, companyId, validatedDto);
    await this.validateReportingManager(tenantId, companyId, validatedDto.reportingManagerId);

    // 2b. Verify referring employee early if referredByEmployeeId is passed
    if (validatedDto.referredByEmployeeId) {
      const referring = await this.repo.getById(
        tenantId,
        companyId,
        validatedDto.referredByEmployeeId,
      );
      if (!referring) {
        throw new BadRequestError(
          `Referring employee '${validatedDto.referredByEmployeeId}' does not exist or does not belong to this company`,
          'INVALID_REFERRING_EMPLOYEE',
        );
      }
    }

    // Fetch workforce general numbering settings for this company
    const wfGeneralSettings = await workforceSettingsService.getGeneralSettings(
      tenantId,
      companyId,
    );

    // 1. Enforce generationMode: 'manual' (P0)
    if (wfGeneralSettings.generationMode === 'manual' && !hasManualNumber) {
      throw new BadRequestError(
        'Employee number is required when workforce numbering mode is set to manual',
        'EMPLOYEE_NUMBER_REQUIRED',
      );
    }

    // 2. Enforce allowManualOverride: false (P0)
    if (
      wfGeneralSettings.generationMode === 'automatic' &&
      hasManualNumber &&
      !wfGeneralSettings.allowManualOverride
    ) {
      throw new BadRequestError(
        'Manual employee number override is not permitted by company workforce settings',
        'MANUAL_NUMBER_OVERRIDE_PROHIBITED',
      );
    }

    // 3. Atomically reserve sequence or validate provided manual number
    let employeeNumber: string;
    if (isAutoNumber) {
      const generated = await this.getNextEmployeeNumber(tenantId, companyId, tx);
      employeeNumber = generated.employeeNumber;
    } else {
      employeeNumber = validatedDto.employeeNumber!;
      const existingByNumber = await this.repo.getByEmployeeNumber(
        tenantId,
        companyId,
        employeeNumber,
      );
      if (existingByNumber) {
        throw new ConflictError(
          `Employee number '${employeeNumber}' is already in use`,
          'EMPLOYEE_NUMBER_EXISTS',
        );
      }
    }
    validatedDto.employeeNumber = employeeNumber;

    // 3b. Probation defaulting (P1): Calculate probationEndDate from joiningDate + defaultProbationDays
    if (validatedDto.employmentStatus === 'probation' && !validatedDto.probationEndDate) {
      const probationPolicy = await workforceSettingsService.getProbationPolicy(
        tenantId,
        companyId,
      );
      const days =
        typeof probationPolicy?.defaultProbationDays === 'number' &&
        !isNaN(probationPolicy.defaultProbationDays) &&
        probationPolicy.defaultProbationDays >= 0
          ? probationPolicy.defaultProbationDays
          : 90;

      if (days > 0 && validatedDto.joiningDate) {
        validatedDto.probationEndDate = addDays(validatedDto.joiningDate, days);
      }
    }

    // 3c. Auto-assign referral code for this new employee if none provided
    if (!validatedDto.referralCode) {
      const cleanNum = employeeNumber.replace(/[^A-Za-z0-9]/g, '');
      validatedDto.referralCode = `REF-${cleanNum}`;
    }

    // 4. Validate optional employee record details (conversion-ready payload)
    const details = await this.profileService.prepareDetails(
      tenantId,
      companyId,
      (input as { details?: unknown }).details,
    );
    const hasDetails = Object.keys(details).length > 0;

    // 5. Create the employee and its detail records in one transaction
    const created = hasDetails
      ? await this.profileService.runInTransaction(async (innerTx) => {
          const employee = await this.repo.create(tenantId, companyId, validatedDto, innerTx);
          await this.profileService.writeDetails(
            innerTx,
            { tenantId, companyId, employeeId: employee.id },
            details,
          );
          return employee;
        })
      : tx
        ? await this.repo.create(tenantId, companyId, validatedDto, tx as any)
        : await this.repo.create(tenantId, companyId, validatedDto);

    // Auto-provision User login and company membership if requested or configured by workforce settings
    let shouldAutoProvision = Boolean(inputObj.autoProvisionUser || inputObj.enablePortalAccess);
    if (!shouldAutoProvision && inputObj.autoProvisionUser === undefined) {
      try {
        if (wfGeneralSettings.autoProvisionUser) {
          shouldAutoProvision = true;
        }
      } catch {
        // workforce settings optional fallback
      }
    }
    if (shouldAutoProvision) {
      try {
        await provisionUserForEmployee(tenantId, companyId, {
          id: created.id,
          email: validatedDto.email,
          firstName: validatedDto.firstName,
          lastName: validatedDto.lastName ?? null,
          userId: created.userId,
        });
      } catch (err) {
        console.warn(
          `[auth:bridge] Failed to auto-provision user for employee ${validatedDto.email}:`,
          err,
        );
      }
    }

    // 5b. Record employee_created in platform audit logs
    const actorUserId = typeof actor === 'string' ? actor : (actor?.userId ?? null);
    const actorEmail = typeof actor === 'object' && actor !== null ? (actor.email ?? null) : null;

    await this.audit.logEvent(
      {
        actorUserId,
        actorEmail,
        action: 'employee_created',
        targetType: 'employee',
        targetId: created.id,
        tenantId,
        companyId,
        metadata: {
          employeeNumber: created.employeeNumber,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
          employmentStatus: created.employmentStatus,
          joiningDate: created.joiningDate,
        },
      },
      tx,
    );

    // 6. Return full detailed representation
    const fullDetails = await this.repo.getById(tenantId, companyId, created.id);
    if (!fullDetails) {
      throw new Error('Failed to load created employee details');
    }

    return fullDetails;
  }

  async getEmployeeById(tenantId: string, companyId: string, id: string): Promise<EmployeeDetails> {
    const employee = await this.repo.getById(tenantId, companyId, id);
    if (!employee) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }
    return employee;
  }

  async getEmployeeByNumber(
    tenantId: string,
    companyId: string,
    employeeNumber: string,
  ): Promise<EmployeeDetails> {
    const employee = await this.repo.getByEmployeeNumber(tenantId, companyId, employeeNumber);
    if (!employee) {
      throw new NotFoundError(`Employee with number '${employeeNumber}' not found`);
    }
    const details = await this.repo.getById(tenantId, companyId, employee.id);
    if (!details) {
      throw new NotFoundError(`Employee with number '${employeeNumber}' not found`);
    }
    return details;
  }

  async listEmployees(
    tenantId: string,
    companyId: string,
    params: Record<string, unknown> = {},
  ): Promise<PaginatedEmployeesResult> {
    const validatedParams = validateListEmployeesParams(params);
    return this.repo.listPaginated(tenantId, companyId, validatedParams);
  }

  async updateEmployee(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: EmployeeUpdateActor | string,
  ): Promise<EmployeeDetails> {
    const existing = await this.repo.getById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    const validatedDto = validateUpdateEmployee(input);

    // Validate employment status transition if status is being updated (P0)
    if (
      validatedDto.employmentStatus &&
      validatedDto.employmentStatus !== existing.employmentStatus
    ) {
      this.validateStatusTransition(existing.employmentStatus, validatedDto.employmentStatus);
    }

    // Check email uniqueness if email is changed
    if (validatedDto.email && validatedDto.email !== existing.email) {
      const emailTaken = await this.repo.getByEmail(tenantId, companyId, validatedDto.email);
      if (emailTaken && emailTaken.id !== id) {
        throw new ConflictError(
          `Employee with email '${validatedDto.email}' already exists`,
          'EMPLOYEE_EMAIL_EXISTS',
        );
      }
    }

    // Verify organization assignments and reporting manager if provided
    await this.validateOrgAssignments(tenantId, companyId, validatedDto);
    if (validatedDto.reportingManagerId === id) {
      throw new BadRequestError(
        'An employee cannot report to themselves',
        'INVALID_REPORTING_MANAGER',
      );
    }
    await this.validateReportingManager(tenantId, companyId, validatedDto.reportingManagerId);

    // Compute changed fields diff (capture previous and new values, exclude unchanged)
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    const changedFields: string[] = [];

    for (const [key, val] of Object.entries(validatedDto)) {
      if (val !== undefined) {
        const existingVal = (existing as unknown as Record<string, unknown>)[key] ?? null;
        const normalizedVal = val ?? null;

        if (existingVal !== normalizedVal) {
          previousValues[key] = existingVal;
          newValues[key] = normalizedVal;
          changedFields.push(key);
        }
      }
    }

    const actorUserId = typeof actor === 'string' ? actor : (actor?.userId ?? null);
    const actorEmail = typeof actor === 'object' && actor !== null ? (actor.email ?? null) : null;

    const performUpdate = async (tx?: unknown) => {
      const updated = await this.repo.update(tenantId, companyId, id, validatedDto, tx as any);
      if (!updated) {
        throw new NotFoundError(`Employee with ID '${id}' not found`);
      }

      if (changedFields.length > 0) {
        await this.audit.logEvent(
          {
            actorUserId,
            actorEmail,
            action: 'employee_updated',
            targetType: 'employee',
            targetId: id,
            tenantId,
            companyId,
            metadata: {
              employeeNumber: existing.employeeNumber,
              changedFields,
              previousValues,
              newValues,
            },
          },
          tx,
        );
      }

      return updated;
    };

    if (typeof (this.repo as any).transaction === 'function') {
      return (this.repo as any).transaction(performUpdate);
    }

    return performUpdate();
  }

  /**
   * Validates employee lifecycle state transitions grounded in enterprise HR workflows (P0).
   * Rejects invalid transitions such as terminated -> active or active -> probation.
   */
  private validateStatusTransition(
    currentStatus: EmploymentStatus,
    targetStatus: EmploymentStatus,
  ): void {
    if (currentStatus === targetStatus) return;

    const allowedTransitions: Record<EmploymentStatus, EmploymentStatus[]> = {
      pending_activation: ['probation', 'active', 'terminated'],
      probation: ['active', 'notice', 'terminated', 'suspended', 'resigned'],
      active: ['notice', 'suspended', 'terminated', 'resigned'],
      notice: ['active', 'probation', 'resigned', 'terminated'],
      suspended: ['active', 'probation', 'notice', 'terminated', 'resigned'],
      resigned: [],
      terminated: [],
    };

    const allowed = allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid employment status transition from '${currentStatus}' to '${targetStatus}'. Direct transition is not permitted by workforce lifecycle rules.`,
        'INVALID_STATUS_TRANSITION',
      );
    }
  }
}
