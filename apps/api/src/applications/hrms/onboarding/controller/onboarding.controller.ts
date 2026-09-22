import type { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../service/onboarding.service.js';
import {
  validateCreateNewHire,
  validateCreateCase,
  validateUpdateDraft,
  validateSubmitCase,
} from '../validation/onboarding.schema.js';
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

  listCases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const statusQuery = typeof req.query.status === 'string' ? req.query.status : undefined;

      const items = await this.service.listCases(devContext.tenantId, devContext.companyId, {
        status: statusQuery,
      });

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

  createCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const validatedDto = validateCreateCase(req.body);

      const created = await this.service.createCase(
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

  getCaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId ?? req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const item = await this.service.getCaseById(devContext.tenantId, devContext.companyId, id);

      res.json({
        data: item,
      });
    } catch (err) {
      next(err);
    }
  };

  getNewHireById = async (req: Request, res: Response, next: NextFunction) => {
    return this.getCaseById(req, res, next);
  };

  updateDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateUpdateDraft(req.body);

      const updated = await this.service.updateDraft(
        devContext.tenantId,
        devContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  submitCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateSubmitCase(req.body);

      const submitted = await this.service.submitCase(
        devContext.tenantId,
        devContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: submitted,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devContext = req.devContext;
      if (!devContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      await this.service.deleteDraft(devContext.tenantId, devContext.companyId, caseId);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
