import { EmployeeRepository } from '../repository/employee.repository.js';
import { EmployeeProfileService } from './employeeProfile.service.js';
import { OrganizationRepository } from '../../organization/repository/organization.repository.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateListEmployeesParams,
} from '../validation/employee.schema.js';
import type { EmployeeDetails, PaginatedEmployeesResult } from '../types/employee.types.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../../app/errors/AppError.js';

export class EmployeeService {
  constructor(
    private readonly repo = new EmployeeRepository(),
    private readonly orgRepo = new OrganizationRepository(),
    private readonly profileService = new EmployeeProfileService(),
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
      const validDept = masters.departments.some((d) => d.id === dto.departmentId);
      if (!validDept) {
        throw new BadRequestError(
          `Department '${dto.departmentId}' does not exist or does not belong to this company`,
          'INVALID_DEPARTMENT',
        );
      }
    }

    if (dto.designationId) {
      const validDesig = masters.designations.some((d) => d.id === dto.designationId);
      if (!validDesig) {
        throw new BadRequestError(
          `Designation '${dto.designationId}' does not exist or does not belong to this company`,
          'INVALID_DESIGNATION',
        );
      }
    }

    if (dto.locationId) {
      const validLoc = masters.locations.some((l) => l.id === dto.locationId);
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
  ): Promise<{ employeeNumber: string }> {
    const prefix = 'EMP-';
    const existing = await this.repo.listAllNumbers(tenantId, companyId);
    let maxSeq = 0;
    for (const num of existing) {
      const m = num.match(/(\d+)$/);
      if (m && m[1]) {
        const val = parseInt(m[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const takenSet = new Set(existing);
    let offset = 0;
    while (takenSet.has(candidate)) {
      offset++;
      candidate = `${prefix}${String(nextSeq + offset).padStart(4, '0')}`;
    }
    return { employeeNumber: candidate };
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
    const employee = await this.repo.getByReferralCode(
      tenantId,
      companyId,
      referralCode.trim(),
    );
    if (!employee) {
      throw new NotFoundError(
        `No eligible employee found with referral code '${referralCode}'`,
      );
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
  ): Promise<EmployeeDetails> {
    const inputObj =
      input && typeof input === 'object'
        ? { ...(input as Record<string, unknown>) }
        : ({} as Record<string, unknown>);

    // Auto-generate employee number if not provided
    if (!inputObj.employeeNumber) {
      const generated = await this.getNextEmployeeNumber(tenantId, companyId);
      inputObj.employeeNumber = generated.employeeNumber;
    }

    const validatedDto = validateCreateEmployee(inputObj);
    const employeeNumber =
      validatedDto.employeeNumber || (await this.getNextEmployeeNumber(tenantId, companyId)).employeeNumber;
    validatedDto.employeeNumber = employeeNumber;

    // 1. Check duplicate employee number within company
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

    // 2. Check duplicate email within company
    const existingByEmail = await this.repo.getByEmail(tenantId, companyId, validatedDto.email);
    if (existingByEmail) {
      throw new ConflictError(
        `Employee with email '${validatedDto.email}' already exists`,
        'EMPLOYEE_EMAIL_EXISTS',
      );
    }

    // 3. Verify organization masters (dept, desig, loc) and reporting manager
    await this.validateOrgAssignments(tenantId, companyId, validatedDto);
    await this.validateReportingManager(tenantId, companyId, validatedDto.reportingManagerId);

    // 3b. Verify referring employee if referredByEmployeeId is passed
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
      ? await this.profileService.runInTransaction(async (tx) => {
          const employee = await this.repo.create(tenantId, companyId, validatedDto, tx);
          await this.profileService.writeDetails(
            tx,
            { tenantId, companyId, employeeId: employee.id },
            details,
          );
          return employee;
        })
      : await this.repo.create(tenantId, companyId, validatedDto);

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
  ): Promise<EmployeeDetails> {
    const existing = await this.repo.getById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    const validatedDto = validateUpdateEmployee(input);

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

    const updated = await this.repo.update(tenantId, companyId, id, validatedDto);
    if (!updated) {
      throw new NotFoundError(`Employee with ID '${id}' not found`);
    }

    return updated;
  }
}
