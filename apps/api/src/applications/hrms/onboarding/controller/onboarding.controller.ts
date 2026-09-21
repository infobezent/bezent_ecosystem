import type { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../service/onboarding.service.js';
import { validateCreateNewHire } from '../validation/onboarding.schema.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class OnboardingController {
  constructor(private readonly service = new OnboardingService()) {}

  listNewHires = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const items = await this.service.listNewHires(devContext.tenantId, devContext.companyId);

      res.json({
        data: items,
      });
    } catch (err) {
      next(err);
    }
  };

  createNewHire = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const validatedDto = validateCreateNewHire(req.body);

      const created = await this.service.createNewHire(
        devContext.tenantId,
        devContext.companyId,
        validatedDto,
      );

      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getNewHireById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const item = await this.service.getNewHireById(devContext.tenantId, devContext.companyId, id);

      res.json({
        data: item,
      });
    } catch (err) {
      next(err);
    }
  };
}
