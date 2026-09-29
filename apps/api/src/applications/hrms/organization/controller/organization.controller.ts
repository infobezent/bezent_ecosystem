import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../service/organization.service.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class OrganizationController {
  constructor(private readonly service = new OrganizationService()) {}

  getMasters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const masters = await this.service.getMasters(companyContext.tenantId, companyContext.companyId);

      res.json({
        data: masters,
      });
    } catch (err) {
      next(err);
    }
  };
}
