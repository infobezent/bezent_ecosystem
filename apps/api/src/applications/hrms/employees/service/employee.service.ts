import { EmployeeRepository } from '../repository/employee.repository.js';
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

  async createEmployee(
    tenantId: string,
    companyId: string,
    input: unknown,
  ): Promise<EmployeeDetails> {
    const validatedDto = validateCreateEmployee(input);

    // 1. Check duplicate employee number within company
    const existingByNumber = await this.repo.getByEmployeeNumber(
      tenantId,
      companyId,
      validatedDto.employeeNumber,
    );
    if (existingByNumber) {
      throw new ConflictError(
        `Employee number '${validatedDto.employeeNumber}' is already in use`,
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

    // 4. Create record
    const created = await this.repo.create(tenantId, companyId, validatedDto);

    // 5. Return full detailed representation
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
