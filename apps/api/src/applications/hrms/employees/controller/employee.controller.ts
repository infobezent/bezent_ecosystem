import type { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../service/employee.service.js';
import { EmployeeProfileService } from '../service/employeeProfile.service.js';
import type { EmployeeRecordSection } from '../types/employeeProfile.types.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class EmployeeController {
  constructor(
    private readonly service = new EmployeeService(),
    private readonly profileService = new EmployeeProfileService(),
  ) {}

  listEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const result = await this.service.listEmployees(
        devContext.tenantId,
        devContext.companyId,
        req.query as Record<string, unknown>,
      );

      res.json({
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.employeeId;
      const employeeId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!employeeId) {
        throw new AppError('Employee ID is required', 400, 'VALIDATION_ERROR');
      }

      const employee = await this.service.getEmployeeById(
        devContext.tenantId,
        devContext.companyId,
        employeeId,
      );

      res.json({
        data: employee,
      });
    } catch (err) {
      next(err);
    }
  };

  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const created = await this.service.createEmployee(
        devContext.tenantId,
        devContext.companyId,
        req.body,
      );

      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getEmployeeProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const profile = await this.profileService.getProfile(
        devContext.tenantId,
        devContext.companyId,
        requireEmployeeId(req),
      );

      res.json({
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  };

  /** Handler factory for PUT /hrms/employees/:employeeId/<section>. */
  updateRecordSection =
    (section: EmployeeRecordSection) => async (req: Request, res: Response, next: NextFunction) => {
      try {
        const devContext = req.devContext;
        if (!devContext) {
          throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
        }

        const profile = await this.profileService.updateSection(
          devContext.tenantId,
          devContext.companyId,
          requireEmployeeId(req),
          section,
          req.body,
        );

        res.json({
          data: profile,
        });
      } catch (err) {
        next(err);
      }
    };
}

function requireEmployeeId(req: Request): string {
  const rawId = req.params.employeeId;
  const employeeId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!employeeId) {
    throw new AppError('Employee ID is required', 400, 'VALIDATION_ERROR');
  }
  return employeeId;
}
