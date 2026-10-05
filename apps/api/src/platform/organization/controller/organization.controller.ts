import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../service/organization.service.js';
import { AppError } from '../../../app/errors/AppError.js';
import { validateUpdateOrganizationProfile } from '../validation/organizationProfile.schema.js';

export class OrganizationController {
  constructor(private readonly service = new OrganizationService()) {}

  getMasters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const masters = await this.service.getMasters(
        companyContext.tenantId,
        companyContext.companyId,
      );

      res.json({
        data: masters,
      });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const profile = await this.service.getProfile(
        companyContext.tenantId,
        companyContext.companyId,
      );

      res.json({
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const validated = validateUpdateOrganizationProfile(req.body);

      const profile = await this.service.updateProfile(
        companyContext.tenantId,
        companyContext.companyId,
        validated,
      );

      res.json({
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const summary = await this.service.getSummary(companyContext.companyId);

      res.json({
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const organizationController = new OrganizationController();
