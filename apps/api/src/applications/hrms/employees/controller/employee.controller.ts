import type { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../service/employee.service.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class EmployeeController {
  constructor(private readonly service = new EmployeeService()) {}

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
}
